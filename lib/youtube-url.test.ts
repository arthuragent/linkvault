import test from "node:test";
import assert from "node:assert/strict";
import { isYouTubeUrl } from "./youtube-url.ts";

test("detects normal YouTube and youtu.be video URLs", () => {
  assert.equal(isYouTubeUrl("https://www.youtube.com/watch?v=abc123"), true);
  assert.equal(isYouTubeUrl("https://youtu.be/abc123"), true);
  assert.equal(isYouTubeUrl("https://m.youtube.com/watch?v=abc123"), true);
});

test("rejects non-YouTube and malformed URLs", () => {
  assert.equal(isYouTubeUrl("https://example.com/watch?v=abc123"), false);
  assert.equal(isYouTubeUrl("not a url"), false);
});
