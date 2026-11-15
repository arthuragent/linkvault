import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Standalone builds include Python; Node serverless runtimes need no system Python.
const version = "2026.10.26";
const assets = {
  x64: ["yt-dlp_linux", "767ba9dce7052aa196f8b12652f433d76de128ba168966fa84b6394d5e6c6795"],
  arm64: ["yt-dlp_linux_aarch64", "e87e9533e89fe5889abaa21f5114dfe7756d6aa6219b83551add04d48b18e483"],
};
if (process.platform !== "linux" || !assets[process.arch]) {
  throw new Error("Bundled yt-dlp requires Linux x64/arm64. On other systems use next dev with YT_DLP_PATH pointing to a local installation.");
}
const [asset, checksum] = assets[process.arch];
const directory = fileURLToPath(new URL("../vendor/", import.meta.url));
const target = `${directory}yt-dlp`;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const existing = await readFile(target).catch(() => null);
if (!existing || hash(existing) !== checksum) {
  const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${asset}`, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`yt-dlp download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== checksum) throw new Error("yt-dlp checksum mismatch");
  await mkdir(directory, { recursive: true });
  await writeFile(`${target}.download`, bytes, { mode: 0o755 });
  await rename(`${target}.download`, target);
}
await chmod(target, 0o755);
console.log(`yt-dlp ${version} verified (${process.arch})`);
