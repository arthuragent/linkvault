"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { LinkCard } from "./LinkCard";
import { isLightColor } from "@/lib/utils";
import type { Category, CategoryNode, Link } from "./types";

type Props = {
  node: CategoryNode;
  categoriesById: Map<string, Category>;
  depth?: number;
  onDeleteLink: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onEditLink: (link: Link) => void;
};

export function CategoryGroup({
  node,
  categoriesById,
  depth = 0,
  onDeleteLink,
  onDeleteCategory,
  onEditLink,
}: Props) {
  const [open, setOpen] = useState(true);
  const total =
    node.links.length +
    node.children.reduce((sum, c) => sum + countLinks(c), 0);
  const textOnColor = isLightColor(node.color) ? "#0a0a0a" : "#ffffff";

  return (
    <section
      className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02]"
      style={{ marginLeft: depth * 16 }}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ backgroundColor: node.color, color: textOnColor }}
          >
            {node.emoji && <span>{node.emoji}</span>}
            {node.name}
          </span>
          <span className="text-xs text-zinc-500">
            {total} {total === 1 ? "link" : "links"}
          </span>
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete category "${node.name}"? Links will be uncategorized.`)) {
              onDeleteCategory(node.id);
            }
          }}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400"
          aria-label="Delete category"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {node.links.length === 0 && node.children.length === 0 && (
            <p className="text-sm text-zinc-500 italic">No links yet.</p>
          )}
          {node.links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              category={categoriesById.get(link.categoryId ?? "")}
              onDelete={onDeleteLink}
              onEdit={onEditLink}
            />
          ))}
          {node.children.map((child) => (
            <CategoryGroup
              key={child.id}
              node={child}
              categoriesById={categoriesById}
              depth={depth + 1}
              onDeleteLink={onDeleteLink}
              onDeleteCategory={onDeleteCategory}
              onEditLink={onEditLink}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function countLinks(node: CategoryNode): number {
  return node.links.length + node.children.reduce((s, c) => s + countLinks(c), 0);
}
