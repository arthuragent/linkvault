"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Bookmark, Menu } from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { CategoryDropdown } from "./components/CategoryDropdown";
import { CategoryGroup } from "./components/CategoryGroup";
import { LinkCard } from "./components/LinkCard";
import { SaveLinkModal } from "./components/SaveLinkModal";
import { AddCategoryModal } from "./components/AddCategoryModal";
import { FloatingActionButton } from "./components/FloatingActionButton";
import { Sidebar } from "./components/Sidebar";
import type { Category, CategoryNode, Link } from "./components/types";

export default function Home() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prefillUrl, setPrefillUrl] = useState("");
  const [prefillTitle, setPrefillTitle] = useState("");
  const [editingLink, setEditingLink] = useState<Link | null>(null);

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
    return roots;
  }, [categories, filteredLinks]);

  const uncategorizedLinks = filteredLinks.filter((l) => !l.categoryId);

  async function handleDeleteLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/links/${id}`, { method: "DELETE" });
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image
              src="/logo-banner-light.png"
              alt="LinkVault"
              width={800}
              height={448}
              priority
              className="h-12 w-auto block dark:hidden"
            />
            <Image
              src="/logo-banner-dark.png"
              alt="LinkVault"
              width={800}
              height={448}
              priority
              className="h-12 w-auto hidden dark:block"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        <SearchBar value={search} onChange={setSearch} />

        {categories.length > 0 && (
          <CategoryDropdown
            categories={categories}
            activeId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
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
                    onDeleteLink={handleDeleteLink}
                    onDeleteCategory={handleDeleteCategory}
                    onEditLink={handleEditLink}
                  />
                ))}
                {uncategorizedLinks.length > 0 && (
                  <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02]">
                    <header className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Uncategorized
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {uncategorizedLinks.length}
                      </span>
                    </header>
                    <div className="space-y-3 px-4 pb-4">
                      {uncategorizedLinks.map((link) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          onDelete={handleDeleteLink}
                          onEdit={handleEditLink}
                        />
                      ))}
                    </div>
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

      <FloatingActionButton onClick={openNewLink} />

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
