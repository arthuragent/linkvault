"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Copy, Check } from "lucide-react";
import { BOOKMARKLET_SOURCE } from "../bookmarklet";

export default function BookmarkletPage() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const href = BOOKMARKLET_SOURCE(origin || "https://your-linkvault.example.com");

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Save links from anywhere</h1>
          <p className="mt-2 text-zinc-400">
            Drag the button below to your browser&apos;s bookmarks bar. On any
            page, click it to open LinkVault with the URL and title pre-filled.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-zinc-400 mb-3">
            Step 1: Drag this button to your bookmarks bar
          </p>
          <a
            href={href}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-5 py-3 font-semibold text-white shadow-lg cursor-grab active:cursor-grabbing"
            draggable
          >
            <Bookmark className="h-5 w-5" />
            Save to LinkVault
          </a>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-zinc-400 mb-3">
            Or copy this code and create a bookmark manually
          </p>
          <pre className="rounded-lg bg-black/40 p-4 text-xs text-zinc-300 overflow-x-auto">
            <code>{href}</code>
          </pre>
          <button
            onClick={copy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm hover:bg-white/[0.06]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
