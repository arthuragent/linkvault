"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Bookmark,
  Menu,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowRight,
  ClipboardPaste,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { CategoryDropdown } from "./components/CategoryDropdown";
import { CategoryGroup } from "./components/CategoryGroup";
import { LinkCard } from "./components/LinkCard";
import { SaveLinkModal } from "./components/SaveLinkModal";
import { AddCategoryModal } from "./components/AddCategoryModal";
import { Sidebar } from "./components/Sidebar";
import { isValidUrl } from "@/lib/utils";
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
  const [searchOpen, setSearchOpen] = useState(false);
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

  async function handleDirectSaveLink(url: string) {
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      throw new Error("Please paste a valid http(s) URL");
    }

    let title = trimmed;
    let summary: string | null = null;
    let metaImage: string | null = null;

    try {
      const previewRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (previewRes.ok) {
        const preview = await previewRes.json();
        if (preview.title) title = preview.title;
        if (preview.description) summary = preview.description;
        if (preview.image) metaImage = preview.image;
      }
    } catch {
      // Preview is optional; keep the URL as title.
    }

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: trimmed,
        title,
        summary,
        metaImage,
        categoryId: null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to save link");
    }

    const data = await res.json();
    handleLinkSaved({ ...data.link, categoryId: null });
  }

  async function handleDeleteLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/links/${id}`, { method: "DELETE" });
  }

  async function handleToggleChecked(id: string, checked: boolean) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, checked } : l)),
    );
    const res = await fetch(`/api/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked }),
    });
    if (!res.ok) {
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, checked: !checked } : l)),
      );
    }
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

  async function handleTranscribeLink(link: Link) {
    const hasJob = Boolean(link.transcriptionJobId) &&
      !["idle", "failed", "error", "cancelled"].includes(link.transcriptionStatus);
    const res = await fetch(`/api/links/${link.id}/transcription`, {
      method: hasJob ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to transcribe link");
    }
    if (data.link) {
      setLinks((prev) => prev.map((l) => (l.id === link.id ? data.link : l)));
      return data.link as Link;
    }
    return link;
  }

  async function handlePollTranscription(linkId: string) {
    const res = await fetch(`/api/links/${linkId}/transcription`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to check transcription status");
    }
    if (data.link) {
      setLinks((prev) => prev.map((l) => (l.id === linkId ? data.link : l)));
      return data.link as Link;
    }
    return null;
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
            onClick={() => setSearchOpen((v) => !v)}
            className={`rounded-lg p-2 transition-colors ${
              searchOpen || search
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            aria-label="Open search"
            aria-pressed={searchOpen}
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        <DirectAddLinkBar onSave={handleDirectSaveLink} />

        {(searchOpen || search) && (
          <SearchBar value={search} onChange={setSearch} autoFocus={searchOpen} />
        )}

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
                    onToggleChecked={handleToggleChecked}
                    onRefreshLink={handleRefreshLink}
                    onTranscribeLink={handleTranscribeLink}
                    onPollTranscription={handlePollTranscription}
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
                            onToggleChecked={handleToggleChecked}
                            onRefresh={handleRefreshLink}
                            onTranscribe={handleTranscribeLink}
                            onPollTranscription={handlePollTranscription}
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

type DirectAddLinkBarProps = {
  onSave: (url: string) => Promise<void>;
};

function DirectAddLinkBar({ onSave }: DirectAddLinkBarProps) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handlePaste() {
    try {
      if (typeof navigator.clipboard?.readText !== "function") {
        setError("Clipboard access unavailable — paste with Ctrl/Cmd+V");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setError(null);
        setSaved(false);
      }
    } catch {
      setError("Clipboard access denied — paste with Ctrl/Cmd+V");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await onSave(url);
      setUrl("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit}>
        <div className="group flex items-stretch overflow-hidden rounded-full border border-zinc-300/70 bg-zinc-50 shadow-sm transition-all focus-within:border-indigo-500/60 focus-within:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:focus-within:bg-white/[0.06]">
          <button
            type="button"
            onClick={handlePaste}
            disabled={saving}
            aria-label="Paste from clipboard"
            className="flex shrink-0 items-center justify-center pl-5 pr-2 text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ClipboardPaste className="h-5 w-5" />
          </button>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="Paste a link to save…"
            disabled={saving}
            className="min-w-0 flex-1 bg-transparent py-3 pl-2 pr-4 text-base text-zinc-900 outline-none placeholder:text-zinc-500 disabled:opacity-50 dark:text-zinc-100"
          />
          <div className="w-px self-stretch bg-zinc-300/70 dark:bg-white/10" />
          <button
            type="submit"
            disabled={saving || !url.trim()}
            aria-label="Save link"
            className="group/save flex items-center gap-2 px-5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-indigo-500/10 sm:px-6"
          >
            <span className="hidden sm:inline">Save</span>
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              <Check className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover/save:translate-x-1" />
            )}
          </button>
        </div>
      </form>
      {error && <p className="px-2 text-sm text-red-500 dark:text-red-400">{error}</p>}
      {saved && <p className="px-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">Saved to Uncategorized</p>}
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
