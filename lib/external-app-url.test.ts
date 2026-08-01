import test from "node:test";
import assert from "node:assert/strict";
import { buildExternalAppUrl } from "./youtube-url.ts";

const ANDROID_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138 Mobile Safari/537.36";

test("builds an Android YouTube intent with a browser fallback", () => {
  const url = "https://www.youtube.com/watch?v=abc123&list=playlist";

  assert.equal(
    buildExternalAppUrl(url, ANDROID_USER_AGENT),
    `intent://www.youtube.com/watch?v=abc123&list=playlist#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(url)};end`,
  );
});

test("keeps the normal URL outside Android", () => {
  const url = "https://youtu.be/abc123";

  assert.equal(buildExternalAppUrl(url, "Mozilla/5.0 (iPhone)"), url);
});

test("keeps non-YouTube URLs unchanged on Android", () => {
  const url = "https://example.com/article";

  assert.equal(buildExternalAppUrl(url, ANDROID_USER_AGENT), url);
});

test("keeps malformed URLs unchanged", () => {
  assert.equal(buildExternalAppUrl("not a url", ANDROID_USER_AGENT), "not a url");
});
