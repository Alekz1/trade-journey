import React, {
  useState, useEffect, useRef, useCallback,
  ChangeEvent, KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

export interface Journal {
  id: number;
  name: string;
  content?: string | null;
  owner_id: string;
}

interface DropdownPos { top: number; left: number; width: number; }

interface JournalSelectorProps {
  selectedJournalId: number | null;
  onJournalChange: (journal: Journal) => void;
  onLoaded?: (hasJournals: boolean) => void;
}

const JournalSelector: React.FC<JournalSelectorProps> = ({
  selectedJournalId, onJournalChange, onLoaded
}) => {
  const { t } = useTranslation();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [open, setOpen] = useState(false);
  // FIX: use fixed positioning — getBoundingClientRect() returns viewport-relative coords
  // which map directly to fixed-positioned elements. Using "absolute" required scrollX/Y offsets
  // which broke when the page was scrolled.
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: 260 });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [listError, setListError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const onLoadedRef = useRef(onLoaded);
  useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);

  const selected = journals.find(j => j.id === selectedJournalId) ?? null;

  // ── Load journals ────────────────────────────────────────────────────────
  const loadJournals = useCallback(async () => {
    setLoading(true); setListError("");
    try {
      const res = await api.get<Journal[]>("/journals/");
      setJournals(res.data);
      if (onLoadedRef.current) onLoadedRef.current(res.data.length > 0);
    } catch {
      setListError(t("journal_load_error"));
      if (onLoadedRef.current) onLoadedRef.current(false);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadJournals(); }, [loadJournals]);

  // Auto-select first journal on first load
  useEffect(() => {
    if (journals.length > 0 && selectedJournalId === null) {
      onJournalChange(journals[0]);
    }
  }, [journals, selectedJournalId, onJournalChange]);

  // ── Toggle dropdown (FIX: fixed positioning) ─────────────────────────────
  const toggleOpen = useCallback(() => {
    setOpen(prev => {
      if (!prev && triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setPos({
          // FIX: pure viewport coords — no scrollY/scrollX needed with position:fixed
          top: r.bottom + 6,
          left: r.left,
          width: Math.max(r.width, 260),
        });
      }
      return !prev;
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on scroll / resize (position would be stale)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Focus modal name input when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [showCreateModal]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (e: React.MouseEvent, journal: Journal) => {
    e.stopPropagation();
    if (!window.confirm(t("journal_delete_confirm", { name: journal.name }))) return;
    setDeletingId(journal.id);
    setListError("");
    try {
      await api.delete(`/journals/${journal.id}/`);
      const next = journals.filter(j => j.id !== journal.id);
      setJournals(next);
      if (journal.id === selectedJournalId && next.length > 0) onJournalChange(next[0]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? t("journal_delete_error");
      setListError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true); setCreateError("");
    try {
      const res = await api.post<Journal>("/journals/", { name, content: newDesc.trim() || null });
      const created = res.data;
      setJournals(prev => [...prev, created]);
      setNewName(""); setNewDesc("");
      setShowCreateModal(false);
      onJournalChange(created);
      setOpen(false);
    } catch {
      setCreateError(t("journal_create_error"));
    } finally {
      setCreating(false);
    }
  };

  const handleModalKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreate(); }
    if (e.key === "Escape") setShowCreateModal(false);
  };

  // ── Portal: dropdown list ─────────────────────────────────────────────────
  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      // FIX: position fixed (not absolute) so viewport coords apply directly
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
      className="border border-green-900/60 bg-black shadow-2xl shadow-black/80 font-jersey15"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-900/40">
        <span className="text-xs text-green-800 uppercase tracking-widest">{t("journals")}</span>
        {loading && <Icon icon="pixelarticons:refresh" className="animate-spin text-green-900" width={12} />}
      </div>

      <ul className="max-h-52 overflow-y-auto" role="listbox">
        {journals.length === 0 && !loading && (
          <li className="px-3 py-3 text-xs text-green-900 text-center">{t("journal_none")}</li>
        )}
        {journals.map(journal => {
          const isActive = journal.id === selectedJournalId;
          const isDeleting = deletingId === journal.id;
          return (
            <li key={journal.id}>
              <button
                role="option"
                aria-selected={isActive}
                onClick={() => { onJournalChange(journal); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors group
                  ${isActive ? "bg-green-950/50 text-green-dark" : "text-green-700 hover:bg-green-950/30 hover:text-green-500"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {isActive
                    ? <Icon icon="pixelarticons:chevron-right" width={10} className="text-green-dark shrink-0" />
                    : <span className="w-[10px] shrink-0" />}
                  <span className="truncate">{journal.name}</span>
                </span>
                {journals.length > 1 && (
                  <button
                    onClick={e => handleDelete(e, journal)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 ml-2 shrink-0 text-red-800 hover:text-red-500 transition-all disabled:opacity-40"
                    title={t("journal_delete")}
                    aria-label={`${t("journal_delete")} ${journal.name}`}
                  >
                    {isDeleting
                      ? <Icon icon="pixelarticons:refresh" className="animate-spin" width={12} />
                      : <Icon icon="pixelarticons:trash" width={12} />}
                  </button>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {listError && <p className="px-3 py-1 text-xs text-red-600">✗ {listError}</p>}

      <div className="border-t border-green-900/40">
        <button
          onClick={() => { setOpen(false); setShowCreateModal(true); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-green-700 hover:text-green-400 hover:bg-green-950/20 transition-colors"
        >
          <Icon icon="pixelarticons:plus-box" width={14} />
          {t("journal_new")}
        </button>
      </div>
    </div>,
    document.body,
  ) : null;

  // ── Portal: create modal ──────────────────────────────────────────────────
  const createModal = showCreateModal ? createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
    >
      <div className="w-full max-w-sm border border-green-900/60 bg-black font-jersey15 shadow-2xl shadow-black">
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-900/40">
          <h2 className="text-green-dark font-workbech text-lg">{t("journal_create_title")}</h2>
          <button onClick={() => setShowCreateModal(false)} className="text-green-900 hover:text-green-600 transition">
            <Icon icon="pixelarticons:close" width={18} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-green-800 uppercase tracking-widest">{t("journal_name")} *</label>
            <input
              ref={nameInputRef}
              value={newName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              onKeyDown={handleModalKey}
              placeholder={t("journal_name_placeholder")}
              maxLength={64}
              className="bg-black border border-green-900/60 focus:border-green-600 text-green-400 placeholder-green-900 px-3 py-2 text-sm outline-none transition-colors w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-green-800 uppercase tracking-widest">{t("journal_desc")}</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              onKeyDown={handleModalKey}
              placeholder={t("journal_desc_placeholder")}
              rows={3}
              maxLength={256}
              className="bg-black border border-green-900/60 focus:border-green-600 text-green-400 placeholder-green-900 px-3 py-2 text-sm outline-none transition-colors resize-none w-full"
            />
          </div>

          {createError && <p className="text-xs text-red-600">✗ {createError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="flex-1 py-2.5 text-sm bg-green-dark border border-green-dark text-black hover:bg-green-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating
                ? <><Icon icon="pixelarticons:refresh" className="animate-spin" width={14} />{t("journal_creating")}</>
                : t("journal_create_btn")}
            </button>
            <button
              onClick={() => { setShowCreateModal(false); setNewName(""); setNewDesc(""); setCreateError(""); }}
              className="px-4 py-2.5 text-sm border border-green-900/60 text-green-700 hover:border-green-600 hover:text-green-500 transition"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggleOpen}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-all duration-150
          ${open
            ? "border-green-600 text-green-400 bg-green-950/30"
            : "border-green-900/60 text-green-600 bg-black hover:border-green-600/70"}`}
        title={t("journal_select")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon icon="pixelarticons:notes" width={14} className="shrink-0" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {loading && !selected ? "…" : (selected?.name ?? t("journal_none_selected"))}
        </span>
        <Icon
          icon="pixelarticons:chevron-down"
          width={12}
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {dropdown}
      {createModal}
    </>
  );
};

export default JournalSelector;
export type { JournalSelectorProps };
