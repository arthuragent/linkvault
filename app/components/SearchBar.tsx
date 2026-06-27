"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
};

export function SearchBar({ value, onChange, autoFocus = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search links by title, URL, or summary…"
        className="w-full rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] py-3 pl-12 pr-12 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition-all focus:border-indigo-500/60 focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
