import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, Headphones } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { links } from "@/lib/schema";
import { getDomain } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

function formatDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function TranscriptPage({ params }: Props) {
  const { id } = await params;
  const rows = await db.select().from(links).where(eq(links.id, id)).limit(1);
  const link = rows[0];
  if (!link || !link.transcriptText) notFound();

  const completedAt = formatDate(link.transcriptionCompletedAt);
  const sourceDomain = getDomain(link.url);

  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              aria-label="Back to LinkVault"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Image
              src="/logo-mark.png"
              alt=""
              width={96}
              height={96}
              priority
              className="h-8 w-8 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                LinkVault transcript
              </p>
              <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {link.title}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <FileText className="h-3.5 w-3.5" />
                Saved in LinkVault
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                {link.title}
              </h2>
              <p className="break-all text-sm text-zinc-500 dark:text-zinc-400">
                {sourceDomain} · {link.url}
              </p>
              {completedAt && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Transcribed {completedAt}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Original video
              </a>
              {link.audioUrl && (
                <a
                  href="#audio-player"
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  Listen
                </a>
              )}
              <a
                href={`/api/links/${link.id}/transcript.txt?download=1`}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
              >
                <Download className="h-3.5 w-3.5" />
                Download transcript
              </a>
              {link.audioUrl && (
                <a
                  href={`/api/links/${link.id}/audio?download=1`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download audio
                </a>
              )}
            </div>
          </div>
        </section>

        {link.audioUrl && (
          <section
            id="audio-player"
            className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-500/10 sm:p-5"
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                <Headphones className="h-4 w-4" />
                Original audio
              </div>
              <a
                href={`/api/links/${link.id}/audio?download=1`}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <Download className="h-3.5 w-3.5" />
                Download audio
              </a>
            </div>
            <audio
              controls
              preload="metadata"
              src={`/api/links/${link.id}/audio`}
              className="h-11 w-full"
            >
              Your browser does not support the audio player.
            </audio>
          </section>
        )}

        <article className="mt-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70 sm:p-6">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-zinc-800 dark:text-zinc-200 sm:text-base">
            {link.transcriptText}
          </pre>
        </article>
      </div>
    </main>
  );
}
