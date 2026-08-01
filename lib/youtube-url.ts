export function isYouTubeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

const YOUTUBE_ANDROID_PACKAGE = "com.google.android.youtube";

export function buildExternalAppUrl(url: string, userAgent: string) {
  if (!/\bAndroid\b/i.test(userAgent) || !isYouTubeUrl(url)) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return url;

    const scheme = parsed.protocol.slice(0, -1);
    const fragment = parsed.hash ? encodeURIComponent(parsed.hash) : "";
    const intentTarget = `${parsed.host}${parsed.pathname}${parsed.search}${fragment}`;

    return `intent://${intentTarget}#Intent;scheme=${scheme};package=${YOUTUBE_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(url)};end`;
  } catch {
    return url;
  }
}
