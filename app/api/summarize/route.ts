import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractYtVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getYtThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

function getYtTitle(html: string, videoId: string): string | null {
  // Try JSON-LD schema first
  const jsonLd = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLd) {
    try {
      const parsed = JSON.parse(jsonLd[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "VideoObject" && item.name) return item.name;
      }
    } catch {}
  }

  // Try og:title
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+property="og:title"/i);
  if (ogTitle) return (ogTitle[1] || ogTitle[2])?.trim() || null;

  // Try document title
  const docTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  return docTitle || null;
}

async function fetchOgData(url: string) {
  // Special handling: YouTube short URLs need video ID extraction
  const ytId = extractYtVideoId(url);
  const isYtShort = url.includes("youtu.be/");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // ── YouTube: og:image may not be in static HTML ──────────────
    if (ytId) {
      const ogImage =
        html.match(
          /<meta[^>]+property="og:image"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+property="og:image"/i,
        )?.[1] ||
        html.match(
          /<meta[^>]+name="twitter:image"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+name="twitter:image"/i,
        )?.[1];

      const image =
        ogImage
          ? ogImage.startsWith("//")
            ? "https:" + ogImage
            : ogImage.startsWith("/")
            ? new URL(url).origin + ogImage
            : ogImage
          : getYtThumbnail(ytId);

      const title =
        getYtTitle(html, ytId) ||
        html.match(/<meta[^>]+name="title"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+name="title"/i)?.[1]?.trim() ||
        null;

      const description =
        html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+property="og:description"/i)?.[1]?.trim() ||
        html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+name="description"/i)?.[1]?.trim() ||
        null;

      const summary = title || description
        ? ["YouTube", title && `"${title}"`, description?.slice(0, 200)].filter(Boolean).join(" — ")
        : null;

      return {
        title: title || "YouTube Video",
        description,
        image,
        siteName: "YouTube",
        summary,
      };
    }

    // ── Generic site ────────────────────────────────────────────────
    const getMeta = (prop: string, attr = "property") =>
      html.match(
        new RegExp(
          `<meta[^>]+(?:${attr}="${prop}"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+${attr}="${prop}")`,
          "i",
        ),
      );

    const getNameMeta = (name: string) =>
      html.match(
        new RegExp(
          `<meta[^>]+name="${name}"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+name="${name}"`,
          "i",
        ),
      );

    const getTitle = () => {
      const ogTitle =
        getMeta("og:title", "property")?.[1] || getMeta("og:title", "property")?.[2];
      if (ogTitle) return ogTitle.trim();
      const twitterTitle = getMeta("twitter:title")?.[1] || getMeta("twitter:title")?.[2];
      if (twitterTitle) return twitterTitle.trim();
      return (
        getNameMeta("title")?.[1] ||
        getNameMeta("title")?.[2] ||
        null
      )?.trim();
    };

    const getDescription = () => {
      const ogDesc =
        getMeta("og:description", "property")?.[1] ||
        getMeta("og:description", "property")?.[2];
      if (ogDesc) return ogDesc.trim();
      return (
        getNameMeta("description")?.[1] ||
        getNameMeta("description")?.[2] ||
        null
      )?.trim();
    };

    const getImage = () => {
      const ogImage =
        getMeta("og:image", "property")?.[1] || getMeta("og:image", "property")?.[2];
      if (ogImage) {
        if (ogImage.startsWith("//")) return "https:" + ogImage;
        if (ogImage.startsWith("/")) {
          try { return new URL(url).origin + ogImage; } catch { return ogImage; }
        }
        return ogImage;
      }
      const twitterImage = getMeta("twitter:image")?.[1] || getMeta("twitter:image")?.[2];
      if (twitterImage) {
        if (twitterImage.startsWith("//")) return "https:" + twitterImage;
        if (twitterImage.startsWith("/")) {
          try { return new URL(url).origin + twitterImage; } catch { return twitterImage; }
        }
        return twitterImage;
      }
      return null;
    };

    const getSiteName = () => {
      const ogSite = getMeta("og:site_name", "property")?.[1] || getMeta("og:site_name", "property")?.[2];
      return ogSite?.trim() || null;
    };

    const title = getTitle();
    const description = getDescription();
    const image = getImage();
    const siteName = getSiteName();

    let summary: string | null = null;
    if (title || description) {
      const parts: string[] = [];
      if (siteName) parts.push(`${siteName}`);
      if (title) parts.push(`"${title}"`);
      if (description) {
        parts.push(description.length > 200 ? description.slice(0, 200) + "…" : description);
      }
      summary = parts.join(" — ");
    }

    return {
      title: title || null,
      description: description || null,
      image: image || null,
      siteName: siteName || null,
      summary: summary || null,
    };
  } catch {
    // Last resort for YouTube
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
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const data = await fetchOgData(body.url);

  if (!data) {
    return NextResponse.json({
      title: null, description: null, image: null, siteName: null, summary: null,
    });
  }

  return NextResponse.json(data);
}