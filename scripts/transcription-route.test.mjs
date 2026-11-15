import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/api/links/[id]/transcription/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function harness({ captions = "saved captions", status = "idle", text = null, job = null } = {}) {
  let link = { id: "test", url: "https://youtu.be/abcdefghijk", transcriptionStatus: status, transcriptText: text, transcriptionJobId: job };
  let providerCalls = 0;
  let captionCalls = 0;
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [link] }) }) }),
    update: () => ({ set: (fields) => ({ where: () => ({ returning: async () => { link = { ...link, ...fields }; return [link]; } }) }) }),
  };
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/db": { db }, "@/lib/schema": { links: { id: "id" } },
    "drizzle-orm": { eq: () => true },
    "@/lib/youtube-captions": { fetchYouTubeCaptions: async () => { captionCalls++; return captions; } },
  };
  const context = {
    exports: {}, require: (name) => { assert.ok(name in modules); return modules[name]; },
    URL, Date, Set, Response,
    process: { env: { MEGASCRIBE_API_TOKEN: "test-token" } },
    fetch: async () => { providerCalls++; return Response.json({ job_id: "provider-job", status: "queued" }); },
  };
  vm.runInNewContext(compiled, context);
  return {
    post: () => context.exports.POST(new Request("https://linkvault.test/api/links/test/transcription"), { params: Promise.resolve({ id: "test" }) }),
    counts: () => ({ providerCalls, captionCalls }),
  };
}

test("caption success persists complete local transcript without calling paid provider", async () => {
  const app = harness();
  const response = await app.post();
  const { link } = await response.json();
  assert.equal(response.status, 200);
  assert.equal(link.transcriptText, "saved captions");
  assert.equal(link.transcriptionStatus, "completed");
  assert.equal(link.transcriptUrl, "https://linkvault.test/links/test/transcript");
  assert.equal(link.transcriptionJobId, null);
  assert.equal(link.audioUrl, null);
  assert.deepEqual(app.counts(), { providerCalls: 0, captionCalls: 1 });
});

test("missing captions starts existing MegaScribe job and returns polling state", async () => {
  const app = harness({ captions: null });
  const response = await app.post();
  const { link } = await response.json();
  assert.equal(response.status, 202);
  assert.equal(link.transcriptionJobId, "provider-job");
  assert.equal(link.transcriptionStatus, "queued");
  assert.deepEqual(app.counts(), { providerCalls: 1, captionCalls: 1 });
});

test("saved transcripts and active provider jobs do not start duplicate extraction", async () => {
  for (const options of [{ status: "completed", text: "existing" }, { status: "queued", job: "existing-job" }]) {
    const app = harness(options);
    await app.post();
    assert.deepEqual(app.counts(), { providerCalls: 0, captionCalls: 0 });
  }
});
