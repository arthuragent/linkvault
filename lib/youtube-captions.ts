import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

type Track = { ext?: string; url?: string };
type Metadata = {
  language?: string;
  subtitles?: Record<string, Track[]>;
  automatic_captions?: Record<string, Track[]>;
};

const execute = promisify(execFile);
const MAX_BYTES = 4 * 1024 * 1024;

export function canonicalVideoUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") :
        /^\/(shorts|embed|live)\//.test(url.pathname) ? url.pathname.split("/")[2] : null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch { return null; }
}

export function captionTrack(metadata: Metadata): string | null {
  // Prefer human captions in the original language, then original auto-captions.
  // Never silently choose one of YouTube's auto-translated tracks.
  const original = metadata.language;
  const manual = metadata.subtitles ?? {};
  const automatic = metadata.automatic_captions ?? {};
  const groups = [
    ...(original ? [manual[original], automatic[`${original}-orig`], automatic[original]] : []),
    ...Object.entries(automatic).filter(([key]) => key.endsWith("-orig")).map(([, tracks]) => tracks),
    ...Object.entries(manual).filter(([key]) => key !== "live_chat").map(([, tracks]) => tracks),
  ];
  for (const tracks of groups) {
    for (const track of tracks ?? []) {
      if (track.ext !== "json3" || !track.url) continue;
      try {
        const url = new URL(track.url);
        if (url.protocol === "https:" && !url.username && !url.password &&
            (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) &&
            url.pathname === "/api/timedtext") return url.toString();
      } catch { /* Invalid track: try another. */ }
    }
  }
  return null;
}

export function captionsToText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("events" in payload) || !Array.isArray(payload.events)) return null;
  const lines: string[] = [];
  for (const event of payload.events) {
    if (!event || !Array.isArray(event.segs)) continue;
    const line = event.segs.map((seg: { utf8?: unknown } | null) =>
      typeof seg?.utf8 === "string" ? seg.utf8 : "").join("").replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
  }
  return lines.join("\n") || null;
}

async function readMetadata(url: string): Promise<Metadata> {
  const { stdout } = await execute(process.env.YT_DLP_PATH || join(process.cwd(), "vendor", "yt-dlp"), [
    "--ignore-config", "--no-playlist", "--skip-download", "--dump-single-json",
    "--no-warnings", "--socket-timeout", "5", "--retries", "0",
    "--extractor-retries", "0", "--js-runtimes", `node:${process.execPath}`, "--", url,
  ], { timeout: 18_000, maxBuffer: MAX_BYTES, encoding: "utf8" });
  return JSON.parse(stdout);
}

export async function fetchYouTubeCaptions(input: string, dependencies = {
  metadata: readMetadata,
  fetch: globalThis.fetch,
}): Promise<string | null> {
  const url = canonicalVideoUrl(input);
  if (!url) return null;
  try {
    const track = captionTrack(await dependencies.metadata(url));
    if (!track) return null;
    const response = await dependencies.fetch(track, {
      signal: AbortSignal.timeout(5_000), cache: "no-store", redirect: "error",
    });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) return null;
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return captionsToText(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    // Missing binary, provider blocking, timeout, or malformed captions must not
    // prevent the existing MegaScribe transcription flow from running.
    console.info("YouTube captions unavailable; using MegaScribe fallback.");
    return null;
  }
}
