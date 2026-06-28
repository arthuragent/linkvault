"use client";

import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Pencil,
  Share2,
  ClipboardCopy,
  Check,
  CircleCheck,
  FolderInput,
  ArrowLeft,
  RefreshCw,
  Loader2,
  FileText,
  Headphones,
  AlertCircle,
} from "lucide-react";
import { getDomain, isLightColor } from "@/lib/utils";
import { useModalBackButton } from "./useModalBackButton";
import type { Category, Link } from "./types";

type Props = {
  link: Link;
  category?: Category;
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit: (link: Link) => void;
  onMove: (id: string, categoryId: string | null) => void;
  onToggleChecked: (id: string, checked: boolean) => void;
  onRefresh: (link: Link) => Promise<void> | void;
  onTranscribe: (link: Link) => Promise<Link>;
  onPollTranscription: (linkId: string) => Promise<Link | null>;
};

const LONG_PRESS_MS = 450;
const ACTIVE_TRANSCRIPTION_STATUSES = new Set([
  "downloading",
  "pending",
  "queued",
  "splitting",
  "processing",
  "transcribing",
  "running",
]);

function isYouTubeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

function isTranscriptionActive(status: string) {
  return ACTIVE_TRANSCRIPTION_STATUSES.has(status.toLowerCase());
}

function transcriptionLabel(link: Link) {
  const status = link.transcriptionStatus.toLowerCase();
  if (status === "completed") return "Transcript ready";
  if (status === "failed" || status === "error") return "Transcript failed";
  if (isTranscriptionActive(status)) return "Transcribing…";
  return "Transcribe video";
}

function transcriptionActionLabel(link: Link) {
  const status = link.transcriptionStatus.toLowerCase();
  if (status === "failed" || status === "error" || status === "cancelled") {
    return "Retry transcription";
  }
  return transcriptionLabel(link);
}

export function LinkCard({
  link,
  category,
  categories,
  onDelete,
  onEdit,
  onMove,
  onToggleChecked,
  onRefresh,
  onTranscribe,
  onPollTranscription,
}: Props) {
  const color = category?.color ?? "#6366f1";
  const textOnColor = isLightColor(color) ? "#0a0a0a" : "#ffffff";
  const domain = getDomain(link.url);

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const canTranscribe = isYouTubeUrl(link.url);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!link.transcriptionJobId || !isTranscriptionActive(link.transcriptionStatus)) return;
    let cancelled = false;
    const poll = async () => {
      try {
        await onPollTranscription(link.id);
        if (!cancelled) setTranscriptionError(null);
      } catch (err) {
        if (!cancelled) {
          setTranscriptionError(
            err instanceof Error ? err.message : "Failed to check transcription status",
          );
        }
      }
    };
    const timer = window.setInterval(() => void poll(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [link.id, link.transcriptionJobId, link.transcriptionStatus, onPollTranscription]);

  function startLongPress() {
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setMenuOpen(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(15);
      }
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  // Swallow the click that follows a long press so the link doesn't navigate.
  function handleClickCapture(e: React.MouseEvent) {
    if (longPressFiredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressFiredRef.current = false;
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(true);
  }

  async function handleShare() {
    setMenuOpen(false);
    const payload = { title: link.title, url: link.url };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // user cancelled or share failed; fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function handleCopyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setTranscriptionError("Could not copy link to clipboard");
    }
  }

  function handleEdit() {
    setMenuOpen(false);
    onEdit(link);
  }

  function handleDelete() {
    setMenuOpen(false);
    if (confirm(`Delete "${link.title}"?`)) {
      onDelete(link.id);
    }
  }

  function handleToggleChecked() {
    setMenuOpen(false);
    onToggleChecked(link.id, !link.checked);
  }

  function handlePickCategory(categoryId: string | null) {
    setMenuOpen(false);
    if (categoryId !== (link.categoryId ?? null)) {
      onMove(link.id, categoryId);
    }
  }

  async function handleRefresh() {
    setMenuOpen(false);
    setRefreshing(true);
    try {
      await onRefresh(link);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleTranscribe() {
    setMenuOpen(false);
    setTranscribing(true);
    setTranscriptionError(null);
    try {
      await onTranscribe(link);
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : "Failed to transcribe link");
    } finally {
      setTranscribing(false);
    }
  }

  const status = link.transcriptionStatus.toLowerCase();
  const showTranscript = status === "completed" && (link.transcriptText || link.audioUrl);
  const showTranscriptionStatus =
    canTranscribe && (transcribing || isTranscriptionActive(status) || status === "failed" || status === "error" || showTranscript);

  return (
    <>
      <div
        className="group rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-white/30 hover:bg-zinc-100 dark:hover:bg-white/[0.06] select-none md:flex md:items-stretch"
        style={{ touchAction: "manipulation" }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerMove={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onClickCapture={handleClickCapture}
        onContextMenu={handleContextMenu}
      >
        {link.metaImage && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-video w-full bg-zinc-100 dark:bg-white/[0.03] md:aspect-auto md:h-20 md:w-20 md:flex-shrink-0 md:self-center md:ml-3 md:my-3 md:rounded-lg md:overflow-hidden"
            draggable={false}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={link.metaImage}
              alt=""
              className="h-full w-full object-cover pointer-events-none"
              draggable={false}
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = "none";
              }}
            />
          </a>
        )}

        <div className="p-4 md:flex-1 md:min-w-0 md:py-3 md:px-4">
          <div className="flex items-center gap-2 min-w-0 mb-2">
            {link.checked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 flex-shrink-0">
                <CircleCheck className="h-3 w-3" />
                Done
              </span>
            )}
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

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            draggable={false}
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 mb-1 md:line-clamp-1">
              {link.title}
            </h3>
          </a>

          {link.summary && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 md:line-clamp-2">
              {link.summary}
            </p>
          )}

          {showTranscriptionStatus && (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
                {transcribing || isTranscriptionActive(status) ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                ) : status === "failed" || status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <FileText className="h-4 w-4 text-emerald-500" />
                )}
                {transcriptionLabel(link)}
              </div>
              {(link.transcriptionError || transcriptionError) && (
                <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                  {link.transcriptionError || transcriptionError}
                </p>
              )}
              {showTranscript && (
                <>
                  {link.transcriptText && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-indigo-600 dark:text-indigo-300">
                        Show saved transcript
                      </summary>
                      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {link.transcriptText}
                      </p>
                    </details>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {link.audioUrl && (
                      <a
                        href={link.audioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                      >
                        <Headphones className="h-3.5 w-3.5" />
                        Audio file
                      </a>
                    )}
                    {link.transcriptText && (
                      <a
                        href={`/links/${link.id}/transcript`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Open transcript
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <LinkActionsMenu
          link={link}
          categories={categories}
          onClose={() => setMenuOpen(false)}
          onEdit={handleEdit}
          onCopyLink={handleCopyLink}
          onShare={handleShare}
          onDelete={handleDelete}
          onPickCategory={handlePickCategory}
          onToggleChecked={handleToggleChecked}
          onRefresh={handleRefresh}
          onTranscribe={handleTranscribe}
          canTranscribe={canTranscribe}
          transcribing={transcribing}
        />
      )}

      {refreshing && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-medium text-white dark:text-zinc-900 shadow-lg flex items-center gap-2"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refreshing preview…
        </div>
      )}

      {copied && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-medium text-white dark:text-zinc-900 shadow-lg"
        >
          <Check className="inline h-3.5 w-3.5 mr-1" /> Link copied
        </div>
      )}
    </>
  );
}

type MenuProps = {
  link: Link;
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
  onCopyLink: () => void;
  onShare: () => void;
  onDelete: () => void;
  onPickCategory: (categoryId: string | null) => void;
  onToggleChecked: () => void;
  onRefresh: () => void;
  onTranscribe: () => void;
  canTranscribe: boolean;
  transcribing: boolean;
};

function LinkActionsMenu({
  link,
  categories,
  onClose,
  onEdit,
  onCopyLink,
  onShare,
  onDelete,
  onPickCategory,
  onToggleChecked,
  onRefresh,
  onTranscribe,
  canTranscribe,
  transcribing,
}: MenuProps) {
  const [view, setView] = useState<"actions" | "move">("actions");

  useModalBackButton(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "move") setView("actions");
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-xl"
      >
        {view === "actions" ? (
          <>
            <div className="border-b border-zinc-200 dark:border-white/10 px-4 py-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {link.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 truncate">{link.url}</p>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-white/10">
              <MenuItem icon={Pencil} label="Edit" onClick={onEdit} />
              <MenuItem icon={ClipboardCopy} label="Copy link" onClick={onCopyLink} />
              <MenuItem
                icon={CircleCheck}
                label={link.checked ? "Mark as not done" : "Mark as done"}
                onClick={onToggleChecked}
              />
              <MenuItem
                icon={FolderInput}
                label="Move to category"
                onClick={() => setView("move")}
              />
              <MenuItem
                icon={RefreshCw}
                label="Refresh preview"
                onClick={onRefresh}
              />
              {canTranscribe && (
                <MenuItem
                  icon={transcribing ? Loader2 : FileText}
                  label={transcribing ? "Starting transcription…" : transcriptionActionLabel(link)}
                  onClick={onTranscribe}
                />
              )}
              <MenuItem icon={Share2} label="Share" onClick={onShare} />
              <MenuItem
                icon={Trash2}
                label="Delete"
                onClick={onDelete}
                destructive
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 px-3 py-3">
              <button
                onClick={() => setView("actions")}
                className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Move to category
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-200 dark:divide-white/10">
              <CategoryRow
                emoji={null}
                color="#71717a"
                name="Uncategorized"
                active={link.categoryId == null}
                onClick={() => onPickCategory(null)}
              />
              {categories.map((c) => (
                <CategoryRow
                  key={c.id}
                  emoji={c.emoji}
                  color={c.color}
                  name={c.name}
                  active={c.id === link.categoryId}
                  onClick={() => onPickCategory(c.id)}
                />
              ))}
              {categories.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">
                  No categories yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
        destructive
          ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
          : "text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function CategoryRow({
  emoji,
  color,
  name,
  active,
  onClick,
}: {
  emoji: string | null;
  color: string;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const textOnColor = isLightColor(color) ? "#0a0a0a" : "#ffffff";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10"
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: color, color: textOnColor }}
      >
        {emoji && <span>{emoji}</span>}
        {name}
      </span>
      {active && <Check className="h-4 w-4 text-indigo-500" />}
    </button>
  );
}
