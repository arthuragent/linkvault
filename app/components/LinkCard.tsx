"use client";

import { ExternalLink, Trash2, Pencil } from "lucide-react";
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
  const domain = getDomain(link.url);

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all hover:border-white/30 hover:bg-white/[0.06]">
      {/* Full-width preview image */}
      {link.metaImage && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-video w-full bg-white/[0.03]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.metaImage}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement!.style.display = "none";
            }}
          />
        </a>
      )}

      {/* Card body */}
      <div className="p-4">
        {/* Category + domain row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {category && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: color, color: textOnColor }}
              >
                {category.emoji && <span>{category.emoji}</span>}
                {category.name}
              </span>
            )}
            <span className="text-xs text-zinc-500 truncate">{domain}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Title */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h3 className="font-semibold text-zinc-100 leading-snug line-clamp-2 mb-1">
            {link.title}
          </h3>
        </a>

        {/* Summary / Description */}
        {link.summary && (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
            {link.summary}
          </p>
        )}
      </div>
    </div>
  );
}