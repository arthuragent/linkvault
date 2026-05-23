"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { getDomain, isLightColor } from "@/lib/utils";
import type { Category, Link } from "./types";

type Props = {
  link: Link;
  category?: Category;
  onDelete: (id: string) => void;
  onEdit: (link: Link) => void;
};

export function LinkCard({ link, category, onDelete, onEdit }: Props) {
  const color = category?.color ?? "#6366f1";
  const textOnColor = isLightColor(color) ? "#0a0a0a" : "#ffffff";

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/30 hover:bg-white/[0.06]">
      <div className="flex items-start gap-3">
        {link.metaImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.metaImage}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover border border-white/10 bg-white/[0.03]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-2 mb-1">
            {category && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: color, color: textOnColor }}
              >
                {category.emoji && <span>{category.emoji}</span>}
                {category.name}
              </span>
            )}
            <span className="text-xs text-zinc-500 truncate">
              {getDomain(link.url)}
            </span>
          </div>
          <h3 className="font-medium text-zinc-100 truncate" title={link.title}>
            {link.title}
          </h3>
          {link.summary && (
            <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
              {link.summary}
            </p>
          )}
        </a>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            aria-label="Open link"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => onEdit(link)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            aria-label="Edit link"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
            aria-label="Delete link"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
