import test from "node:test";
import assert from "node:assert/strict";
import { canonicalVideoUrl, captionTrack, captionsToText, fetchYouTubeCaptions } from "./youtube-captions.ts";

const manual = "https://www.youtube.com/api/timedtext?v=abcdefghijk&lang=he";
const automatic = `${manual}&kind=asr`;
const tracks = (url: string) => [{ ext: "json3", url }];
const payload = { events: [{ segs: [{ utf8: "שלום " }, { utf8: "עולם" }] }, { segs: [{ utf8: "\n" }] }, { segs: [{ utf8: "עוד משפט" }] }] };

test("canonicalizes video URLs and strips playlist/attacker-controlled parameters", () => {
  for (const input of ["https://youtu.be/abcdefghijk?list=evil", "https://m.youtube.com/shorts/abcdefghijk", "https://youtube.com/watch?v=abcdefghijk&list=evil"]) {
    assert.equal(canonicalVideoUrl(input), "https://www.youtube.com/watch?v=abcdefghijk");
  }
  for (const input of ["file:///etc/passwd", "https://youtube.com.attacker.test/watch?v=abcdefghijk", "https://youtube.com/playlist?list=abc", "--exec=sh", "https://youtube.com/watch?v=bad"]) {
    assert.equal(canonicalVideoUrl(input), null);
  }
});

test("prefers original human captions, then original automatic captions, never auto-translations", () => {
  assert.equal(captionTrack({ language: "he", subtitles: { he: tracks(manual) }, automatic_captions: { "he-orig": tracks(automatic) } }), manual);
  assert.equal(captionTrack({ language: "he", automatic_captions: { "he-orig": tracks(automatic), en: tracks(manual) } }), automatic);
  assert.equal(captionTrack({ automatic_captions: { "he-orig": tracks(automatic) } }), automatic);
  assert.equal(captionTrack({ automatic_captions: { en: tracks(manual) } }), null);
  assert.equal(captionTrack({ subtitles: { live_chat: tracks(manual) } }), null);
});

test("rejects unsafe subtitle targets", () => {
  for (const url of ["http://127.0.0.1/api/timedtext", "https://evil.test/api/timedtext", "https://www.youtube.com/redirect", "https://user:pass@youtube.com/api/timedtext"]) {
    assert.equal(captionTrack({ subtitles: { he: tracks(url) } }), null);
  }
});

test("converts JSON3 segments to readable text without timestamps, preserving intentional repetitions", () => {
  assert.equal(captionsToText(payload), "שלום עולם\nעוד משפט");
  assert.equal(captionsToText({ events: [{ segs: [{ utf8: "yes" }] }, { segs: [{ utf8: "yes" }] }] }), "yes\nyes");
  for (const input of [null, {}, { events: [{ segs: [null, { utf8: 123 }] }] }]) assert.equal(captionsToText(input), null);
});

test("caption success returns saved text; empty captions, blocked responses and extractor failures permit fallback", async () => {
  const metadata = async () => ({ subtitles: { he: tracks(manual) } });
  assert.equal(await fetchYouTubeCaptions("https://youtu.be/abcdefghijk", {
    metadata, fetch: async () => Response.json(payload),
  }), "שלום עולם\nעוד משפט");
  for (const response of [Response.json({ events: [] }), new Response("blocked", { status: 429 }), new Response("not JSON"), new Response("x".repeat(4 * 1024 * 1024 + 1))]) {
    assert.equal(await fetchYouTubeCaptions("https://youtu.be/abcdefghijk", { metadata, fetch: async () => response }), null);
  }
  assert.equal(await fetchYouTubeCaptions("https://youtu.be/abcdefghijk", {
    metadata: async () => { throw new Error("timeout or missing binary"); },
    fetch: async () => { throw new Error("must not fetch"); },
  }), null);
  assert.equal(await fetchYouTubeCaptions("https://youtu.be/abcdefghijk", {
    metadata: async () => ({}), fetch: async () => { throw new Error("must not fetch"); },
  }), null);
});
