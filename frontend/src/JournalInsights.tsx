import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import api from "./services/api";
import { Trade, formatDate } from "./services/utils";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import JournalSelector, { Journal } from "./components/JournalSelector";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";

const TZ_KEY = "preferredTimezone";

// ── Tag chip color (same deterministic hash as TradeList) ─────────────────
const TAG_COLORS = [
  "border-green-600  text-green-400  bg-green-950/30",
  "border-cyan-700   text-cyan-400   bg-cyan-950/30",
  "border-violet-700 text-violet-400 bg-violet-950/30",
  "border-amber-700  text-amber-400  bg-amber-950/30",
  "border-rose-700   text-rose-400   bg-rose-950/30",
  "border-sky-700    text-sky-400    bg-sky-950/30",
];
function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt  = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
const pnlCls = (v: number) => v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-green-800";

// ── Section wrapper ────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="border border-green-900/50">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-900/40 bg-green-950/10">
      <Icon icon={icon} width={14} className="text-green-dark" />
      <p className="text-xs text-green-dark uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ── Trade card (expandable) ────────────────────────────────────────────────
interface TradeWithMeta extends Trade {
  tags?: string[] | null;
  message?: string | null;
}

const TradeCard: React.FC<{ trade: TradeWithMeta; tz: string; onTagClick: (tag: string) => void }> = ({
  trade, tz, onTagClick,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = ["long", "buy"].includes(trade.side.toLowerCase());

  return (
    <div className={`border transition-colors ${expanded ? "border-green-700/60" : "border-green-900/40 hover:border-green-800/60"}`}>
      {/* Row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Expand chevron */}
        <Icon
          icon={expanded ? "pixelarticons:chevron-down" : "pixelarticons:chevron-right"}
          width={12}
          className="text-green-800 shrink-0"
        />

        {/* Side badge */}
        <span className={`text-[9px] px-1.5 py-0.5 border shrink-0 ${isLong ? "border-green-700 text-green-400" : "border-red-800 text-red-400"}`}>
          {trade.side.toUpperCase()}
        </span>

        {/* Symbol */}
        <span className="text-green-dark text-sm font-workbech w-24 truncate shrink-0">{trade.symbol}</span>

        {/* Date */}
        <span className="text-[10px] text-green-900 hidden sm:block shrink-0">
          {formatDate(trade.timestamp, tz, "dd MMM HH:mm") ?? "—"}
        </span>

        {/* Tags */}
        <div className="flex gap-1 flex-wrap flex-1 min-w-0">
          {(trade.tags ?? []).map(tag => (
            <button
              key={tag}
              onClick={e => { e.stopPropagation(); onTagClick(tag); }}
              className={`text-[9px] px-1.5 py-0.5 border transition-opacity hover:opacity-70 ${tagColor(tag)}`}
            >
              {tag}
            </button>
          ))}
          {trade.message && (
            <Icon icon="pixelarticons:notes" width={11} className="text-green-800 self-center" />
          )}
        </div>

        {/* PnL */}
        <span className={`text-sm tabular-nums font-workbech shrink-0 ml-auto ${pnlCls(trade.pnl)}`}>
          {fmt(trade.pnl)}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-green-900/30 px-4 py-3 flex flex-col gap-3 bg-green-950/5">

          {/* Trade details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
            {[
              ["Entry", trade.entry_price.toFixed(4)],
              ["Qty",   trade.quantity.toFixed(4)],
              ["Closes", String(trade.partial_closes.length)],
              ["Fees",  trade.partial_closes.reduce((s, pc) => s + (pc.fees ?? 0), 0).toFixed(4)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-green-900">{k}</span>
                <span className="text-green-600 tabular-nums">{v}</span>
              </div>
            ))}
          </div>

          {/* Partial closes */}
          {trade.partial_closes.length > 0 && (
            <div className="flex flex-col gap-1">
              {trade.partial_closes.map((pc, i) => (
                <div key={i} className="flex gap-4 text-[11px] border-l-2 border-green-900/40 pl-2">
                  <span className="text-green-900">#{i + 1}</span>
                  <span className="text-green-700">exit {pc.exit_price.toFixed(4)}</span>
                  <span className="text-green-700">qty {pc.closed_quantity.toFixed(4)}</span>
                  <span className={`ml-auto tabular-nums ${pnlCls(pc.pnl ?? 0)}`}>{fmt(pc.pnl ?? 0)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          {trade.message && (
            <div className="border border-green-900/30 bg-black p-3">
              <p className="text-[10px] text-green-800 uppercase tracking-wider mb-1">
                <Icon icon="pixelarticons:notes" width={10} className="inline mr-1" />
                Note
              </p>
              <p className="text-xs text-green-500 whitespace-pre-wrap leading-relaxed">{trade.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
const JournalInsights: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user,       setUser]       = useState<User | null>(null);
  const [journal,    setJournal]    = useState<Journal | null>(null);
  const [trades,     setTrades]     = useState<TradeWithMeta[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [selectedTz, setSelectedTz] = useState("Local Timezone");

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [filterSide,  setFilterSide]  = useState<"all" | "buy" | "sell">("all");
  const [filterTag,   setFilterTag]   = useState("");
  const [filterNote,  setFilterNote]  = useState<"all" | "has_note" | "no_note">("all");
  const [sortBy,      setSortBy]      = useState<"date" | "pnl" | "symbol">("date");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async (j: Journal | null) => {
    if (!j) return;
    setLoading(true);
    try {
      const res = await api.get<TradeWithMeta[]>("/trades/", { params: { journal_id: j.id, limit: 1000 } });
      setTrades(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJournalChange = useCallback((j: Journal) => {
    setJournal(j);
    localStorage.setItem("selectedJournalId", String(j.id));
    fetchTrades(j);
  }, [fetchTrades]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const tz    = localStorage.getItem(TZ_KEY);
    if (tz) setSelectedTz(tz);
    setIsLoggedIn(!!token);
    if (!token) return;
    getAuth();
    onAuthStateChanged(getAuth(), u => setUser(u ?? null));
  }, []);

  // ── All unique tags ────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of trades) (t.tags ?? []).forEach(tag => set.add(tag));
    return [...set].sort();
  }, [trades]);

  // ── Filtered + sorted trades ───────────────────────────────────────────────
  const visible = useMemo(() => {
    let list: TradeWithMeta[] = [...trades];

    if (search)           list = list.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()));
    if (filterSide !== "all") {
      list = list.filter(t =>
        filterSide === "buy"
          ? ["long", "buy"].includes(t.side.toLowerCase())
          : ["short", "sell"].includes(t.side.toLowerCase())
      );
    }
    if (filterTag)        list = list.filter(t => (t.tags ?? []).includes(filterTag));
    if (filterNote === "has_note") list = list.filter(t => !!t.message);
    if (filterNote === "no_note")  list = list.filter(t => !t.message);

    if (sortBy === "date")   list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (sortBy === "pnl")    list.sort((a, b) => b.pnl - a.pnl);
    if (sortBy === "symbol") list.sort((a, b) => a.symbol.localeCompare(b.symbol));

    return list;
  }, [trades, search, filterSide, filterTag, filterNote, sortBy]);

  // ── Tag stats ──────────────────────────────────────────────────────────────
  const tagStats = useMemo(() => {
    const map: Record<string, { trades: number; pnl: number; wins: number }> = {};
    for (const t of trades) {
      for (const tag of (t.tags ?? [])) {
        if (!map[tag]) map[tag] = { trades: 0, pnl: 0, wins: 0 };
        map[tag].trades += 1;
        map[tag].pnl    += t.pnl ?? 0;
        if ((t.pnl ?? 0) > 0) map[tag].wins += 1;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1].trades - a[1].trades);
  }, [trades]);

  // ── Best / worst 5 ────────────────────────────────────────────────────────
  const sorted     = useMemo(() => [...trades].sort((a, b) => b.pnl - a.pnl), [trades]);
  const best5      = sorted.slice(0, 5);
  const worst5     = sorted.slice(-5).reverse();
  const notedCount = trades.filter(t => t.message).length;
  const taggedCount = trades.filter(t => (t.tags ?? []).length > 0).length;

  const filterBtnCls = (active: boolean) =>
    `px-3 py-1 text-xs border transition ${active
      ? "border-green-dark text-green-dark bg-green-950/30"
      : "border-green-900/60 text-green-800 hover:border-green-700 hover:text-green-600"}`;

  return (
    <div className="font-jersey15 text-green-600 bg-black min-h-screen">

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 h-16 border-b border-green-900/60 z-50 bg-black flex items-center justify-between px-4 gap-3">
        <h1
          className="text-2xl sm:text-3xl text-green-dark font-workbech px-1 cursor-pointer shrink-0"
          onClick={() => navigate("/")}
        >
          TradeJourney
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 justify-end">
          <button className="border rounded-sm border-green-600/60 px-8 py-1 text-sm bg-green-500 text-black hover:bg-green-600 hover:text-gray-300 transition"
                onClick={() => navigate("/trades")}
                title={t("new_trade")}
          >
                {t("new_trade")}
          </button>
          {isLoggedIn && (
            <JournalSelector
              selectedJournalId={journal?.id ?? null}
              onJournalChange={handleJournalChange}
            />
          )}
          <div className="hidden sm:block"><ClockWithTimezone timezone={selectedTz} /></div>
          <TimezoneSelector selectedTz={selectedTz} onChange={tz => { setSelectedTz(tz); localStorage.setItem(TZ_KEY, tz); }} />
          <LanguageSelector />
          {!isLoggedIn ? <LoginSignupButton /> : <LogoutButton />}
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 hover:w-48 flex-col items-center border-r border-green-900/60 z-40 bg-black py-4 gap-4 transition-all duration-300 ease-in-out group">
        {user?.photoURL && (
          <img src={user.photoURL} className="w-9 h-9 rounded-full border border-green-800 mb-2" alt="avatar" />
        )}
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/home")}
          title={t("home")}
        >
          <Icon icon="pixelarticons:home" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("home")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/trades")}
          title={t("trades_nav")}
        >
          <Icon icon="pixelarticons:chart-add" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("trades_nav")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/analytics")}
          title={t("analytics")}
        >
          <Icon icon="pixelarticons:analytics" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("analytics")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/risk")}
          title={t("risk_center")}
        >
          <Icon icon="pixelarticons:shield" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("risk_center")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/journal")}
          title={t("journal_insights")}
        >
          <Icon icon="pixelarticons:notes" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("journal_insights")}</span>
        </button>
      </aside>

      {/* ── Mobile nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-green-900/60 z-50 bg-black flex items-center justify-around px-2">
        {[
          { path: "/home",      icon: "pixelarticons:home",      label: t("home") },
          { path: "/trades",    icon: "pixelarticons:chart-add",  label: t("trades_nav") },
          { path: "/analytics", icon: "pixelarticons:bar-chart",  label: t("analytics") },
          { path: "/risk",      icon: "pixelarticons:shield",     label: t("risk_center") },
          { path: "/journal",   icon: "pixelarticons:notes",      label: t("journal_nav") },
        ].map(({ path, icon, label }) => (
          <button key={path} onClick={() => navigate(path)} className={`flex flex-col items-center gap-0.5 transition ${path === "/journal" ? "text-green-dark" : "text-green-600 hover:text-green-300"}`}>
            <Icon icon={icon} width={24} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main ── */}
      <main className="pt-16 md:ml-20 pb-20 md:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">

          {/* Title row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-3xl text-green-dark font-workbech">{t("journal_insights")}</h2>
              {journal && (
                <p className="text-xs text-green-800 mt-0.5">
                  <Icon icon="pixelarticons:notes" width={10} className="inline mr-1" />
                  {journal.name} · {trades.length} {t("trades")}
                  {notedCount > 0 && <> · {notedCount} {t("with_notes")}</>}
                  {taggedCount > 0 && <> · {taggedCount} {t("tagged")}</>}
                </p>
              )}
            </div>
          </div>

          {!journal ? (
            <div className="border border-yellow-700/40 bg-yellow-950/20 p-4 text-yellow-500 text-sm">
              {t("no_journal_warning")}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-green-800 py-8">
              <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
              {t("loading")}
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* ── Best / Worst ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section title={t("best_trades")} icon="pixelarticons:arrow-up">
                  {best5.length ? best5.map((t, i) => (
                    <div key={t.id ?? i} className="flex items-center gap-3 py-2 border-b border-green-900/20 last:border-0">
                      <span className="text-[10px] text-green-900 w-4 tabular-nums">#{i + 1}</span>
                      <span className="text-green-dark text-sm font-workbech w-20 truncate">{t.symbol}</span>
                      <span className="text-[10px] text-green-900 hidden sm:block flex-1">
                        {formatDate(t.timestamp, selectedTz, "dd MMM yyyy") ?? ""}
                      </span>
                      <span className="text-green-400 text-sm tabular-nums ml-auto font-workbech">{fmt(t.pnl)}</span>
                    </div>
                  )) : <p className="text-xs text-green-900">{t("notradesfound")}</p>}
                </Section>

                <Section title={t("worst_trades")} icon="pixelarticons:arrow-down">
                  {worst5.length ? worst5.map((t, i) => (
                    <div key={t.id ?? i} className="flex items-center gap-3 py-2 border-b border-green-900/20 last:border-0">
                      <span className="text-[10px] text-green-900 w-4 tabular-nums">#{i + 1}</span>
                      <span className="text-green-dark text-sm font-workbech w-20 truncate">{t.symbol}</span>
                      <span className="text-[10px] text-green-900 hidden sm:block flex-1">
                        {formatDate(t.timestamp, selectedTz, "dd MMM yyyy") ?? ""}
                      </span>
                      <span className="text-red-400 text-sm tabular-nums ml-auto font-workbech">{fmt(t.pnl)}</span>
                    </div>
                  )) : <p className="text-xs text-green-900">{t("notradesfound")}</p>}
                </Section>
              </div>

              {/* ── Tag breakdown ── */}
              {tagStats.length > 0 && (
                <Section title={t("by_tag")} icon="pixelarticons:tag">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tagStats.map(([tag, s]) => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                        className={`flex items-center gap-2 p-2.5 border transition text-left ${
                          filterTag === tag ? "border-green-600/60 bg-green-950/20" : "border-green-900/40 hover:border-green-800/60"
                        }`}
                      >
                        <span className={`text-xs px-1.5 py-0.5 border ${tagColor(tag)}`}>{tag}</span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-green-800">{s.trades} {t("trades")}</span>
                            <span className={pnlCls(s.pnl)}>{fmt(s.pnl)}</span>
                          </div>
                          <div className="mt-1 h-1 bg-green-950/40 border border-green-900/20">
                            <div
                              className={`h-full ${s.pnl >= 0 ? "bg-green-dark" : "bg-red-700"}`}
                              style={{ width: `${(s.wins / s.trades) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-green-900 mt-0.5">
                            {((s.wins / s.trades) * 100).toFixed(0)}% {t("wins_abbr")}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* ── Trade list ── */}
              <Section title={t("all_trades_deep")} icon="pixelarticons:list">

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">

                  {/* Search */}
                  <div className="flex border border-green-900/60 focus-within:border-green-700 transition-colors">
                    <Icon icon="pixelarticons:search" width={14} className="text-green-800 self-center ml-2" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={t("symbol")}
                      className="bg-black text-green-400 placeholder-green-900 px-2 py-1.5 text-xs outline-none w-28"
                    />
                  </div>

                  {/* Side */}
                  {(["all", "buy", "sell"] as const).map(s => (
                    <button key={s} onClick={() => setFilterSide(s)} className={filterBtnCls(filterSide === s)}>
                      {s === "all" ? t("allsides") : t(s)}
                    </button>
                  ))}

                  {/* Note filter */}
                  <button onClick={() => setFilterNote(n => n === "has_note" ? "all" : "has_note")} className={filterBtnCls(filterNote === "has_note")}>
                    <Icon icon="pixelarticons:notes" width={11} className="inline mr-1" />
                    {t("with_notes")}
                  </button>

                  {/* Active tag filter pill */}
                  {filterTag && (
                    <button onClick={() => setFilterTag("")} className={`px-2 py-1 text-xs border flex items-center gap-1 ${tagColor(filterTag)}`}>
                      {filterTag}
                      <Icon icon="pixelarticons:close" width={10} />
                    </button>
                  )}

                  {/* Sort */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-green-900">{t("sort_by")}:</span>
                    {(["date", "pnl", "symbol"] as const).map(s => (
                      <button key={s} onClick={() => setSortBy(s)} className={filterBtnCls(sortBy === s)}>
                        {t(`sort_${s}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag pills row */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                        className={`text-[9px] px-1.5 py-0.5 border transition-opacity ${tagColor(tag)} ${filterTag === tag ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Count */}
                <p className="text-[10px] text-green-900 mb-2">
                  {visible.length} / {trades.length} {t("trades")}
                </p>

                {/* Cards */}
                {visible.length === 0 ? (
                  <p className="text-xs text-green-900 py-4 text-center">{t("notradesfound")}</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visible.map((trade, i) => (
                      <TradeCard
                        key={trade.id ?? i}
                        trade={trade}
                        tz={selectedTz}
                        onTagClick={setFilterTag}
                      />
                    ))}
                  </div>
                )}
              </Section>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default JournalInsights;
