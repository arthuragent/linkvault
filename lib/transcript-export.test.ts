import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryTranscriptFilename,
  formatCategoryTranscriptExport,
} from "./transcript-export.ts";

test("formats a category transcript export with every transcript separated by metadata", () => {
  const body = formatCategoryTranscriptExport(
    { name: "AI Videos", exportedAt: new Date("2026-07-01T14:30:00.000Z") },
    [
      {
        title: "First Video",
        url: "https://youtu.be/first",
        transcriptText: "First transcript text.",
        transcriptionCompletedAt: new Date("2026-07-01T13:00:00.000Z"),
      },
      {
        title: "Second Video",
        url: "https://youtu.be/second",
        transcriptText: "Second transcript text.",
        transcriptionCompletedAt: null,
      },
    ],
  );

  assert.match(body, /^# AI Videos — transcripts\n/);
  assert.match(body, /Exported: 2026-07-01T14:30:00.000Z/);
  assert.match(body, /Videos with saved transcripts: 2/);
  assert.match(body, /## 1\. First Video\nURL: https:\/\/youtu\.be\/first\nCompleted: 2026-07-01T13:00:00.000Z\n\nFirst transcript text\./);
  assert.match(body, /---\n\n## 2\. Second Video\nURL: https:\/\/youtu\.be\/second\n\nSecond transcript text\./);
});

test("returns a clear empty export when no transcripts are saved", () => {
  const body = formatCategoryTranscriptExport(
    { name: "Empty", exportedAt: new Date("2026-07-01T14:30:00.000Z") },
    [],
  );

  assert.match(body, /Videos with saved transcripts: 0/);
  assert.match(body, /No saved transcripts found for this category yet\./);
});

test("builds a safe category transcript filename", () => {
  assert.equal(categoryTranscriptFilename("SEO / AI: Research?"), "seo-ai-research-transcripts.txt");
  assert.equal(categoryTranscriptFilename("🤖"), "linkvault-category-transcripts.txt");
});
