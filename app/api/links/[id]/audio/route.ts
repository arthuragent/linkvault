import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { links } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type Ctx = { params: Promise<{ id: string }> };

function megaScribeToken() {
  return process.env.MEGASCRIBE_API_TOKEN?.trim() || null;
}

function contentDispositionFilename(title: string | null, fallback: string) {
  const base = (title || fallback || "linkvault-audio")
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .slice(0, 160) || "linkvault-audio";
  const quoted = base.replace(/["\\]/g, "_");
  return quoted.includes(".") ? quoted : `${quoted}.mp3`;
}

function copyResponseHeaders(source: Headers, download: boolean, filename: string) {
  const headers = new Headers();
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (lower === "content-disposition") continue;
    headers.set(key, value);
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${filename}"`,
  );
  if (!headers.has("Accept-Ranges")) headers.set("Accept-Ranges", "bytes");
  return headers;
}

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!link?.audioUrl) {
    return NextResponse.json(
      { error: "No audio file is saved for this transcript." },
      { status: 404 },
    );
  }

  const token = megaScribeToken();
  if (!token) {
    return NextResponse.json(
      { error: "MegaScribe API token is not configured." },
      { status: 503 },
    );
  }

  const upstream = await fetch(link.audioUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(request.headers.get("range")
        ? { Range: request.headers.get("range") as string }
        : {}),
    },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Could not load the audio file." },
      { status: upstream.status || 502 },
    );
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const filename = contentDispositionFilename(link.title, link.id);
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers, download, filename),
  });
}
