import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type MegaScribeJobResponse = {
  job_id?: string;
  status?: string;
  error?: string | null;
  transcript_id?: string | null;
  transcript_url?: string | null;
  transcript_api_url?: string | null;
  supported_formats?: string[];
  transcript_download_urls?: Record<string, string | null>;
  audio_download_url?: string | null;
  transcript?: {
    text?: string | null;
    segments?: unknown;
  } | null;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "error", "cancelled"]);

function megaScribeConfig() {
  const token = process.env.MEGASCRIBE_API_TOKEN?.trim();
  const baseUrl = (process.env.MEGASCRIBE_API_BASE_URL?.trim() || "https://megascribe.ai")
    .replace(/\/+$/, "");
  return { token, baseUrl };
}

function isYouTubeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

function normalizeStatus(status: unknown) {
  return typeof status === "string" && status.trim() ? status.trim().toLowerCase() : "pending";
}

function transcriptText(payload: MegaScribeJobResponse) {
  if (typeof payload.transcript?.text === "string" && payload.transcript.text.trim()) {
    return payload.transcript.text.trim();
  }
  const segments = payload.transcript?.segments;
  if (Array.isArray(segments)) {
    return segments
      .map((segment) => {
        if (segment && typeof segment === "object" && "text" in segment) {
          const value = (segment as { text?: unknown }).text;
          return typeof value === "string" ? value.trim() : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return null;
}

function linkVaultTranscriptUrl(request: Request, id: string) {
  return new URL(`/api/links/${encodeURIComponent(id)}/transcript.txt`, request.url).toString();
}

async function fetchMegaScribeText(url: string) {
  const { token } = megaScribeConfig();
  if (!token) return null;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const text = await response.text();
  return text.trim() ? text.trim() : null;
}

async function savedTranscriptText(payload: MegaScribeJobResponse) {
  const embedded = transcriptText(payload);
  if (embedded) return embedded;

  const txtUrl = payload.transcript_download_urls?.txt;
  if (typeof txtUrl === "string" && txtUrl.trim()) {
    const text = await fetchMegaScribeText(txtUrl.trim());
    if (text) return text;
  }

  const apiUrl = payload.transcript_api_url;
  if (typeof apiUrl === "string" && apiUrl.trim()) {
    const url = new URL(apiUrl.trim());
    url.searchParams.set("format", "txt");
    const text = await fetchMegaScribeText(url.toString());
    if (text) return text;
  }

  return null;
}

async function callMegaScribe(path: string, init: RequestInit = {}) {
  const { token, baseUrl } = megaScribeConfig();
  if (!token) {
    return {
      response: null,
      data: null,
      error: NextResponse.json(
        { error: "MegaScribe API token is not configured." },
        { status: 503 },
      ),
    };
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as MegaScribeJobResponse | null;
  return { response, data, error: null };
}

async function getLink(id: string) {
  const rows = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const link = await getLink(id);
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (!isYouTubeUrl(link.url)) {
    return NextResponse.json(
      { error: "Transcription is currently available for YouTube video links only." },
      { status: 400 },
    );
  }

  const { response, data, error } = await callMegaScribe("/api/v1/transcriptions", {
    method: "POST",
    body: JSON.stringify({ youtube_url: link.url }),
  });
  if (error) return error;
  if (!response?.ok || !data?.job_id) {
    const message = data?.error || "MegaScribe could not start the transcription.";
    const updated = await db
      .update(links)
      .set({
        transcriptionStatus: "failed",
        transcriptionError: message,
        transcriptionRequestedAt: new Date(),
      })
      .where(eq(links.id, id))
      .returning();
    return NextResponse.json(
      { error: message, link: updated[0] ?? link },
      { status: response?.status || 502 },
    );
  }

  const updated = await db
    .update(links)
    .set({
      transcriptionStatus: normalizeStatus(data.status),
      transcriptionJobId: data.job_id,
      transcriptText: null,
      transcriptUrl: null,
      audioUrl: null,
      transcriptionError: null,
      transcriptionRequestedAt: new Date(),
      transcriptionCompletedAt: null,
    })
    .where(eq(links.id, id))
    .returning();

  return NextResponse.json({ link: updated[0], job: data }, { status: 202 });
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const link = await getLink(id);
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (!link.transcriptionJobId) {
    return NextResponse.json({ link });
  }
  if (
    TERMINAL_STATUSES.has(link.transcriptionStatus) &&
    (link.transcriptionStatus !== "completed" || link.transcriptText)
  ) {
    return NextResponse.json({ link });
  }

  const { response, data, error } = await callMegaScribe(
    `/api/v1/transcriptions/${encodeURIComponent(link.transcriptionJobId)}`,
  );
  if (error) return error;
  if (!response?.ok || !data) {
    return NextResponse.json(
      { error: data?.error || "MegaScribe status check failed.", link },
      { status: response?.status || 502 },
    );
  }

  const status = normalizeStatus(data.status);
  const text = status === "completed" ? await savedTranscriptText(data) : null;
  const updated = await db
    .update(links)
    .set({
      transcriptionStatus: status,
      transcriptionError:
        status === "completed" && !text
          ? "MegaScribe completed, but LinkVault could not fetch and save the .txt transcript."
          : data.error ?? null,
      transcriptText: text,
      transcriptUrl: status === "completed" && text ? linkVaultTranscriptUrl(req, id) : null,
      audioUrl: data.audio_download_url ?? null,
      transcriptionCompletedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(links.id, id))
    .returning();

  return NextResponse.json({ link: updated[0], job: data });
}
