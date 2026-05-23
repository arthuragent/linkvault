import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchOgData(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LinkVault/1.0; +https://linkvault-opal.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    const getMeta = (prop: string, attr = "property") =>
      html.match(
        new RegExp(
          `<meta[^>]+(?:${attr}="${prop}"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+${attr}="${prop}")`,
          "i",
        ),
      );

    const getNameMeta = (name: string) =>
      html.match(
        new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"|content="([^"]*)"[^>]+name="${name}"`, "i"),
      );

    const getTitle = () => {
      const ogTitle =
        getMeta("og:title", "property")?.[1] ||
        getMeta("og:title", "property")?.[2];
      if (ogTitle) return ogTitle.trim();
      const twitterTitle =
        getMeta("twitter:title")?.[1] || getMeta("twitter:title")?.[2];
      if (twitterTitle) return twitterTitle.trim();
      const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
      if (h1) return h1;
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
      const twitterDesc =
        getMeta("twitter:description")?.[1] ||
        getMeta("twitter:description")?.[2];
      if (twitterDesc) return twitterDesc.trim();
      return (
        getNameMeta("description")?.[1] ||
        getNameMeta("description")?.[2] ||
        null
      )?.trim();
    };

    const getImage = () => {
      const ogImage =
        getMeta("og:image", "property")?.[1] ||
        getMeta("og:image", "property")?.[2];
      if (ogImage) {
        // Make relative URLs absolute
        if (ogImage.startsWith("//")) return "https:" + ogImage;
        if (ogImage.startsWith("/")) {
          try {
            const u = new URL(url);
            return u.origin + ogImage;
          } catch {
            return ogImage;
          }
        }
        return ogImage;
      }
      const twitterImage =
        getMeta("twitter:image")?.[1] || getMeta("twitter:image")?.[2];
      if (twitterImage) {
        if (twitterImage.startsWith("//")) return "https:" + twitterImage;
        if (twitterImage.startsWith("/")) {
          try {
            const u = new URL(url);
            return u.origin + twitterImage;
          } catch {
            return twitterImage;
          }
        }
        return twitterImage;
      }
      return null;
    };

    const getSiteName = () => {
      const ogSite =
        getMeta("og:site_name", "property")?.[1] ||
        getMeta("og:site_name", "property")?.[2];
      return ogSite?.trim() || null;
    };

    const title = getTitle();
    const description = getDescription();
    const image = getImage();
    const siteName = getSiteName();

    // Build a short AI-style summary if we have title + description
    let summary: string | null = null;
    if (title || description) {
      const parts: string[] = [];
      if (siteName) parts.push(`${siteName}`);
      if (title) parts.push(`"${title}"`);
      if (description) {
        const truncated =
          description.length > 200
            ? description.slice(0, 200) + "…"
            : description;
        parts.push(truncated);
      }
      if (parts.length > 0) {
        summary = parts.join(" — ");
      }
    }

    return {
      title: title || null,
      description: description || null,
      image: image || null,
      siteName: siteName || null,
      summary: summary || null,
    };
  } catch {
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
      title: null,
      description: null,
      image: null,
      siteName: null,
      summary: null,
      error: "Could not fetch preview",
    });
  }

  return NextResponse.json(data);
}