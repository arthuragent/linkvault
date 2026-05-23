import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Social-crawler UAs unlock OG tags on Facebook, Instagram, X/Twitter, LinkedIn,
// and most sites that strip metadata when they think a real user is visiting.
// Order matters: try Facebook's first (most permissive on FB), then Twitterbot
// (good fallback), then a real browser UA as a last resort.
const CRAWLER_UAS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Twitterbot/1.0)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function extractYtVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function getYtThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeHtmlEntities(input: string | undefined | null): string | null {
  if (!input) return null;
  return input
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g, (m) => HTML_ENTITIES[m] ?? m)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    );
}

function extractMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const metaRe = /<meta\s+([^>]+?)\s*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html))) {
    const attrs = m[1];
    const key =
      attrs.match(/(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1] ??
      null;
    const value = attrs.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? null;
    if (key && value !== null) {
      // First occurrence wins — og:image and twitter:image often appear
      // multiple times for variants we don't want.
      const lower = key.toLowerCase();
      if (!tags.has(lower)) tags.set(lower, value);
    }
  }
  return tags;
}

function pick(tags: Map<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = tags.get(k.toLowerCase());
    if (v && v.trim()) return decodeHtmlEntities(v.trim());
  }
  return null;
}

function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  for (const ua of CRAWLER_UAS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      // Heuristic: skip obvious "Error" / login-wall stubs and try the next UA.
      if (
        html.length < 4000 &&
        /<title>\s*(Error|Log\s*in|Sign\s*in|Forbidden)\s*<\/title>/i.test(html)
      ) {
        continue;
      }
      return html;
    } catch {
      // try next UA
    }
  }
  return null;
}

async function fetchOgData(url: string) {
  const ytId = extractYtVideoId(url);

  const html = await fetchHtml(url);
  if (!html) {
    if (ytId) {
      return {
        title: "YouTube Video",
        description: null,
        image: getYtThumbnail(ytId),
        siteName: "YouTube",
        summary: "YouTube Video",
      };
    }
    return null;
  }

  const tags = extractMetaTags(html);

  let title = pick(
    tags,
    "og:title",
    "twitter:title",
    "title",
  );
  if (!title) {
    const docTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    title = decodeHtmlEntities(docTitle ?? null);
  }

  const description = pick(
    tags,
    "og:description",
    "twitter:description",
    "description",
  );

  const rawImage = pick(
    tags,
    "og:image",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
  );
  const image = rawImage ? resolveUrl(rawImage, url) : null;

  const siteName = pick(tags, "og:site_name", "application-name");

  // YouTube special-case: thumbnail fallback when og:image is missing.
  let finalImage = image;
  if (!finalImage && ytId) finalImage = getYtThumbnail(ytId);

  // FB share/reel pages often expose og:title that's just a generic
  // language-encoded fallback. Keep what we have either way — better than
  // nothing.

  let summary: string | null = null;
  if (title || description) {
    const parts: string[] = [];
    if (siteName) parts.push(siteName);
    if (title) parts.push(`"${title}"`);
    if (description) {
      parts.push(
        description.length > 200 ? description.slice(0, 200) + "…" : description,
      );
    }
    summary = parts.join(" — ");
  }

  return {
    title: title || (ytId ? "YouTube Video" : null),
    description: description || null,
    image: finalImage || null,
    siteName: siteName || (ytId ? "YouTube" : null),
    summary: summary || null,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const data = await fetchOgData(body.url);

  if (!data) {
    return NextResponse.json({
      title: null,
      description: null,
      image: null,
      siteName: null,
      summary: null,
    });
  }

  return NextResponse.json(data);
}
