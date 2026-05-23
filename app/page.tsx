"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Bookmark,
  Menu,
  ChevronDown,
  ChevronRight,
  Plus,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { QuickAddOverlay } from "./components/QuickAddOverlay";
import { CategoryDropdown } from "./components/CategoryDropdown";
import { CategoryGroup } from "./components/CategoryGroup";
import { LinkCard } from "./components/LinkCard";
import { SaveLinkModal } from "./components/SaveLinkModal";
import { AddCategoryModal } from "./components/AddCategoryModal";
import { Sidebar } from "./components/Sidebar";
import type { Category, CategoryNode, Link } from "./components/types";

const STORAGE_KEY = "linkvault:ui-state";

type PersistedState = {
  activeCategoryId: string | null;
  uncategorizedOpen: boolean;
  collapsedCategoryIds: string[];
};

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return { activeCategoryId: null, uncategorizedOpen: true, collapsedCategoryIds: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeCategoryId: null, uncategorizedOpen: true, collapsedCategoryIds: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      activeCategoryId: parsed.activeCategoryId ?? null,
      uncategorizedOpen: parsed.uncategorizedOpen ?? true,
      collapsedCategoryIds: Array.isArray(parsed.collapsedCategoryIds)
        ? parsed.collapsedCategoryIds
        : [],
    };
  } catch {
    return { activeCategoryId: null, uncategorizedOpen: true, collapsedCategoryIds: [] };
  }
}

export default function Home() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [uncategorizedOpen, setUncategorizedOpen] = useState(true);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [prefillUrl, setPrefillUrl] = useState("");
  const [prefillTitle, setPrefillTitle] = useState("");
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [hydrated, setHydrated] = useState(false);

  function openNewLink() {
    setEditingLink(null);
    setPrefillUrl("");
    setPrefillTitle("");
    setSaveModalOpen(true);
  }

  function handleEditLink(link: Link) {
    setEditingLink(link);
    setSaveModalOpen(true);
  }

  function toggleCategoryCollapsed(id: string) {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCollapseAll() {
    // If anything is currently expanded, collapse everything; otherwise expand.
    const anyExpanded =
      uncategorizedOpen ||
      categories.some((c) => !collapsedCategoryIds.has(c.id));
    if (anyExpanded) {
      setCollapsedCategoryIds(new Set(categories.map((c) => c.id)));
      setUncategorizedOpen(false);
    } else {
      setCollapsedCategoryIds(new Set());
      setUncategorizedOpen(true);
    }
  }

  // Load persisted UI state once on mount.
  useEffect(() => {
    const persisted = loadPersistedState();
    setActiveCategoryId(persisted.activeCategoryId);
    setUncategorizedOpen(persisted.uncategorizedOpen);
    setCollapsedCategoryIds(new Set(persisted.collapsedCategoryIds));
    setHydrated(true);
  }, []);

  // Persist whenever the relevant slice changes (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = {
      activeCategoryId,
      uncategorizedOpen,
      collapsedCategoryIds: [...collapsedCategoryIds],
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // storage unavailable — ignore
    }
  }, [hydrated, activeCategoryId, uncategorizedOpen, collapsedCategoryIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("url");
    const title = params.get("title");
    if (url) {
      setPrefillUrl(url);
      setPrefillTitle(title ?? "");
      setSaveModalOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [linksRes, catsRes] = await Promise.all([
        fetch("/api/links"),
        fetch("/api/categories"),
      ]);
      const linksData = await linksRes.json();
      const catsData = await catsRes.json();
      setLinks(linksData.links ?? []);
      setCategories(catsData.categories ?? []);
    } finally {
      setLoading(false);
    }
  }

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return links.filter((link) => {
      if (activeCategoryId && link.categoryId !== activeCategoryId) {
        return false;
      }
      if (!q) return true;
      return (
        link.title.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        (link.summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [links, search, activeCategoryId]);

  const tree = useMemo<CategoryNode[]>(() => {
    const nodes = new Map<string, CategoryNode>();
    for (const c of categories) {
      nodes.set(c.id, { ...c, children: [], links: [] });
    }
    for (const link of filteredLinks) {
      if (link.categoryId && nodes.has(link.categoryId)) {
        nodes.get(link.categoryId)!.links.push(link);
      }
    }
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    if (activeCategoryId && nodes.has(activeCategoryId)) {
      // When filtering, show only the selected category (and its descendants).
      return [nodes.get(activeCategoryId)!];
    }
    return roots;
  }, [categories, filteredLinks, activeCategoryId]);

  const uncategorizedLinks = filteredLinks.filter((l) => !l.categoryId);

  async function handleDeleteLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/links/${id}`, { method: "DELETE" });
  }

  async function handleMoveLink(id: string, categoryId: string | null) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, categoryId } : l)),
    );
    await fetch(`/api/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
  }

  async function handleRefreshLink(link: Link) {
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.url }),
      });
      if (!res.ok) return;
      const og = await res.json();
      const updates: Record<string, string | null> = {};
      if (og.title) updates.title = og.title;
      if (og.description) updates.summary = og.description;
      if (og.image) updates.metaImage = og.image;
      if (Object.keys(updates).length === 0) return;
      const patchRes = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!patchRes.ok) return;
      const data = await patchRes.json();
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? data.link : l)),
      );
    } catch {
      // ignore — refresh is opt-in, user can retry
    }
  }

  async function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setLinks((prev) =>
      prev.map((l) => (l.categoryId === id ? { ...l, categoryId: null } : l)),
    );
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
  }

  function handleLinkSaved(link: Link) {
    setLinks((prev) => {
      const idx = prev.findIndex((l) => l.id === link.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = link;
        return next;
      }
      return [link, ...prev];
    });
  }

  function handleCategorySaved(cat: Category) {
    setCategories((prev) => [...prev, cat]);
  }

  return (
    <div className="min-h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="/logo-mark.png"
                alt=""
                width={96}
                height={96}
                priority
                className="h-9 w-9"
              />
              <span className="text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
                <span className="font-semibold">Link</span>
                <span className="font-bold">Vault</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Quick add link"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        <SearchBar value={search} onChange={setSearch} />

        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <CategoryDropdown
                categories={categories}
                activeId={activeCategoryId}
                onSelect={setActiveCategoryId}
              />
            </div>
            {(() => {
              const anyExpanded =
                uncategorizedOpen ||
                categories.some((c) => !collapsedCategoryIds.has(c.id));
              const Icon = anyExpanded ? ChevronsDownUp : ChevronsUpDown;
              return (
                <button
                  type="button"
                  onClick={toggleCollapseAll}
                  aria-label={anyExpanded ? "Collapse all" : "Expand all"}
                  title={anyExpanded ? "Collapse all" : "Expand all"}
                  className="shrink-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })()}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {links.length === 0 ? (
              <EmptyState onAdd={openNewLink} />
            ) : (
              <div className="space-y-4">
                {tree.map((node) => (
                  <CategoryGroup
                    key={node.id}
                    node={node}
                    categoriesById={categoriesById}
                    categories={categories}
                    collapsed={collapsedCategoryIds}
                    onToggleCollapsed={toggleCategoryCollapsed}
                    onDeleteLink={handleDeleteLink}
                    onDeleteCategory={handleDeleteCategory}
                    onEditLink={handleEditLink}
                    onMoveLink={handleMoveLink}
                    onRefreshLink={handleRefreshLink}
                  />
                ))}
                {uncategorizedLinks.length > 0 && (
                  <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02]">
                    <button
                      onClick={() => setUncategorizedOpen((v) => !v)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      {uncategorizedOpen ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Uncategorized
                      </span>
                      <span className="text-xs text-zinc-500">
                        {uncategorizedLinks.length}
                      </span>
                    </button>
                    {uncategorizedOpen && (
                      <div className="space-y-3 px-4 pb-4">
                        {uncategorizedLinks.map((link) => (
                          <LinkCard
                            key={link.id}
                            link={link}
                            categories={categories}
                            onDelete={handleDeleteLink}
                            onEdit={handleEditLink}
                            onMove={handleMoveLink}
                            onRefresh={handleRefreshLink}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
                {filteredLinks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 p-8 text-center text-sm text-zinc-500">
                    No links match your search.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewCategory={() => setCategoryModalOpen(true)}
      />

      <QuickAddOverlay
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={handleLinkSaved}
      />

      <SaveLinkModal
        open={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          setEditingLink(null);
        }}
        categories={categories}
        initialUrl={prefillUrl}
        initialTitle={prefillTitle}
        editLink={editingLink ?? undefined}
        onSaved={handleLinkSaved}
        onCategoryCreated={handleCategorySaved}
      />

      <AddCategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onSaved={handleCategorySaved}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 p-12 text-center">
      <Bookmark className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600" />
      <h2 className="mt-4 text-lg font-medium text-zinc-800 dark:text-zinc-200">No links yet</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Save your first link to get started.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
      >
        Save a link
      </button>
    </div>
  );
}
