import React, { useMemo, useState, useCallback, useRef } from "react";
import api from "../services/api";
import { formatDate } from "../services/utils";
import { Trade } from "../services/utils";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import ImageModal from "./ImageModal";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Filters {
  symbol:    string;
  side:      string;
  date_from: string;
  date_to:   string;
  limit:     number;
  tag?:      string;
}

interface TradeListProps {
  trades:         Trade[];
  filters:        Filters;
  onFilterChange: (f: Partial<Filters>) => void;
  onApplyFilters: () => void;
  loading:        boolean;
  error:          string;
  refresh:        () => void;
  selectedTz:     string;
}

type SortKey = "timestamp" | "symbol" | "side" | "pnl" | "entry_price" | "quantity";
type SortDir = "asc" | "desc";

// ── Helpers ────────────────────────────────────────────────────────────────
const pnlColor = (v: number) =>
  v > 0 ? "text-green-500" : v < 0 ? "text-red-500" : "text-green-900";

const sideColor = (side: string) =>
  ["buy", "long"].includes(side.toLowerCase()) ? "text-green-500" : "text-red-500";

const fmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;

const isPartial = (t: Trade) => t.partial_closes.length > 1;

const sumFees = (t: Trade) => t.partial_closes.reduce((s, pc) => s + (pc.fees ?? 0), 0);

function sortTrades(trades: Trade[], key: SortKey, dir: SortDir): Trade[] {
  const multiplier = dir === "asc" ? 1 : -1;
  return [...trades].sort((a, b) => {
    let compare = 0;
    switch (key) {
      case "timestamp":
        // Assuming timestamp is a string parsable by Date
        compare = (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * multiplier;
        break;
      case "pnl":
        compare = ((a.pnl ?? -Infinity) - (b.pnl ?? -Infinity)) * multiplier;
        break;
      case "entry_price":
        compare = ((a.entry_price ?? 0) - (b.entry_price ?? 0)) * multiplier;
        break;
      case "quantity":
        compare = ((a.quantity ?? 0) - (b.quantity ?? 0)) * multiplier;
        break;
      case "symbol":
        compare = a.symbol.localeCompare(b.symbol) * multiplier;
        break;
      case "side":
        compare = a.side.localeCompare(b.side) * multiplier;
        break;
      default:
        compare = 0;
    }
    return compare;
  });
}

// Cycling tag colors — deterministic by tag string
const TAG_COLORS = [
  "border-green-700/70 text-green-600",
  "border-blue-800/70 text-blue-500",
  "border-yellow-700/70 text-yellow-500",
  "border-purple-800/70 text-purple-500",
  "border-cyan-800/70 text-cyan-500",
  "border-orange-800/70 text-orange-500",
];
const tagColor = (tag: string) => TAG_COLORS[
  [...tag].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) % TAG_COLORS.length
];

// ── TagChip ────────────────────────────────────────────────────────────────
const TagChip: React.FC<{ tag: string; onClick?: () => void }> = ({ tag, onClick }) => (
  <button
    onClick={onClick}
    className={`text-[10px] px-1.5 py-0 border tracking-wide whitespace-nowrap transition-opacity hover:opacity-70 ${tagColor(tag)}`}
    title={`Filter by #${tag}`}
    type="button"
  >
    #{tag}
  </button>
);

// ── MessageTooltip ─────────────────────────────────────────────────────────
const MessageCell: React.FC<{ message: string | null | undefined }> = ({ message }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!message) return <span className="text-green-950">—</span>;

  return (
    <div className="relative flex justify-center" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-green-700 hover:text-green-400 transition"
        title={message}
      >
        <Icon icon="pixelarticons:chat-text" width={14} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 w-56 bg-black border border-green-900/60 p-2 text-xs text-green-600 text-left shadow-xl shadow-black/60 whitespace-pre-wrap">
          {message}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-green-900/60" />
        </div>
      )}
    </div>
  );
};

// ── PartialCloseRow ────────────────────────────────────────────────────────
const PartialCloseRow: React.FC<{
  pc: Trade["partial_closes"][0];
  index: number;
  total: number;
  selectedTz: string;
}> = ({ pc, index, total, selectedTz }) => {
  const { t } = useTranslation();
  const pnl   = pc.pnl ?? 0;
  return (
    <tr className="text-center text-xs bg-black/50 hover:bg-green-950/15 transition-colors">
      {/* indent indicator */}
      <td className="border border-green-900/20 pl-3">
        <Icon
          icon={index === total - 1 ? "pixelarticons:corner-down-right" : "pixelarticons:caret-right"}
          width={11}
          className="text-green-900 mx-auto"
        />
      </td>
      <td className="px-2 py-1.5 border border-green-900/20 whitespace-nowrap text-green-800">
        {formatDate(pc.pctimestamp, selectedTz) ?? "—"}
      </td>
      <td className="px-2 py-1.5 border border-green-900/20 text-green-800" colSpan={2}>
        {t("close_n_of_total", { n: index + 1, total })}
      </td>
      <td className="px-2 py-1.5 border border-green-900/20 text-green-950">—</td>
      <td className="px-2 py-1.5 border border-green-900/20 tabular-nums text-green-600">{pc.exit_price}</td>
      <td className="px-2 py-1.5 border border-green-900/20 tabular-nums text-green-600">{pc.closed_quantity}</td>
      <td className={`px-2 py-1.5 border border-green-900/20 tabular-nums font-semibold ${pnlColor(pnl)}`}>{fmt(pnl)}</td>
      <td className="px-2 py-1.5 border border-green-900/20 tabular-nums text-green-800">{pc.fees != null ? (pc.fees as number).toFixed(2) : "—"}</td>
      <td className="px-2 py-1.5 border border-green-900/20 text-green-950" colSpan={4}>—</td>
    </tr>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
const TradeList: React.FC<TradeListProps> = ({
  trades, filters, onFilterChange, onApplyFilters,
  loading, error, refresh, selectedTz,
}) => {
  const { t } = useTranslation();

  const [sortKey,  setSortKey]  = useState<SortKey>("timestamp");
  const [sortDir,  setSortDir]  = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);

  // Collect all unique tags across displayed trades for the filter bar
  const allTags = useMemo(() => {
    const s = new Set<string>();
    trades.forEach(t => (t.tags ?? []).forEach(tag => s.add(tag)));
    return [...s].sort();
  }, [trades]);

  const sorted = useMemo(
    () => sortTrades(trades, sortKey, sortDir),
    [trades, sortKey, sortDir],
  );

  const { totalPnl, totalFees, wins, total } = useMemo(() => ({
    totalPnl:  trades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    totalFees: trades.reduce((s, t) => s + sumFees(t), 0),
    wins:      trades.filter(t => (t.pnl ?? 0) > 0).length,
    total:     trades.length,
  }), [trades]);

  const hasAnyPartial = sorted.some(isPartial);
  const hasAnyMessage = sorted.some(t => !!t.message);
  const hasAnyTags    = sorted.some(t => (t.tags?.length ?? 0) > 0);

  const toggleExpand = useCallback((id: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  const handleDelete = useCallback(async (id: number, symbol: string) => {
    if (!window.confirm(t("delete_confirm", { symbol }))) return;
    setDeleting(id);
    try {
      await api.delete(`/delete/trade/${id}/`);
      refresh();
    } finally {
      setDeleting(null);
    }
  }, [refresh, t]);

  const handleSort = useCallback((key: SortKey) => {
  setSortKey(prevKey => {
    const newDir = prevKey === key ? (sortDir === "asc" ? "desc" : "asc") : "desc";
    setSortDir(newDir);
    return key;
  });
  }, [sortDir]);

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls  = "border border-green-900/60 p-2 bg-black text-green-600 placeholder-green-900 focus:border-green-500 focus:outline-none text-xs min-w-0 transition-colors";
  const selectCls = "border border-green-900/60 p-2 bg-black text-green-600 focus:border-green-500 focus:outline-none text-xs transition-colors";

  // ── Sort header ────────────────────────────────────────────────────────────
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k
      ? <Icon icon="pixelarticons:arrows-sort"  width={9}  className="text-green-900   ml-0.5 inline opacity-50" />
      : sortDir === "asc"
      ? <Icon icon="pixelarticons:arrow-up"     width={9}  className="text-green-dark  ml-0.5 inline" />
      : <Icon icon="pixelarticons:arrow-down"   width={9}  className="text-green-dark  ml-0.5 inline" />;

  const SortTh = ({ k, label, cls = "" }: { k: SortKey; label: string; cls?: string }) => (
    <th
      onClick={() => handleSort(k)}
      className={`px-2 py-2 border border-green-900/50 whitespace-nowrap text-green-dark cursor-pointer select-none hover:bg-green-950/60 transition-colors text-xs ${cls}`}
    >
      {label}<SortIcon k={k} />
    </th>
  );

  const PlainTh = ({ label, cls = "" }: { label: string; cls?: string }) => (
    <th className={`px-2 py-2 border border-green-900/50 whitespace-nowrap text-green-dark text-xs ${cls}`}>
      {label}
    </th>
  );

  return (
    <div className="font-jersey15">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <h2 className="text-xl text-green-dark">{t("yourtrades")}</h2>
        {total > 0 && (
          <span className="text-xs text-green-800">
            {total} {t("trades")} · {wins}{t("wins_abbr")}&nbsp;/&nbsp;{total - wins}{t("losses_abbr")}
          </span>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <input
          placeholder={t("symbol")} value={filters.symbol}
          onChange={e => onFilterChange({ symbol: e.target.value })}
          className={`${inputCls} w-24 sm:w-28`}
        />
        <select value={filters.side} onChange={e => onFilterChange({ side: e.target.value })} className={selectCls}>
          <option value="">{t("allsides")}</option>
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
        <input type="date" value={filters.date_from} onChange={e => onFilterChange({ date_from: e.target.value })} className={`${inputCls} w-34`} />
        <input type="date" value={filters.date_to}   onChange={e => onFilterChange({ date_to: e.target.value })}   className={`${inputCls} w-34`} />
        <select value={filters.limit} onChange={e => onFilterChange({ limit: Number(e.target.value) })} className={selectCls}>
          {[5, 10, 25, 50, 100].map(n => (
            <option key={n} value={n}>{t("last")} {n}</option>
          ))}
        </select>
        <button
          onClick={onApplyFilters}
          className="border border-green-600/60 text-green-600 bg-black px-4 py-2 hover:border-green-300 hover:text-green-400 transition text-xs"
        >
          {t("applyfilters")}
        </button>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs text-green-900 mr-0.5">{t("filter_by_tag")}:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => onFilterChange({ tag: filters.tag === tag ? "" : tag })}
                className={`text-[10px] px-1.5 border tracking-wide transition-all ${tagColor(tag)}
                  ${filters.tag === tag ? "opacity-100 ring-1 ring-green-700/40" : "opacity-60 hover:opacity-100"}`}
              >
                #{tag}
              </button>
            ))}
            {filters.tag && (
              <button
                type="button"
                onClick={() => onFilterChange({ tag: "" })}
                className="text-[10px] text-green-900 hover:text-green-600 transition px-1"
              >
                ✕ {t("clear")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── State: loading / error ── */}
      {loading ? (
        <div className="flex items-center gap-2 text-green-800 text-sm py-6">
          <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
          {t("loading")}
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm py-4">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full border border-green-900/50 text-xs">

                {/* ── Column headers ── */}
                <thead className="bg-green-950/40 text-green-900 uppercase tracking-widest">
                  <tr>
                    <PlainTh label="" cls="w-7" />
                    <SortTh k="timestamp"   label={t("open_time")} />
                    <SortTh k="symbol"      label={t("symbol")} />
                    <SortTh k="side"        label={t("side")} />
                    <SortTh k="entry_price" label={t("entry")} />
                    <PlainTh label={t("exit")} />
                    <SortTh k="quantity"    label={t("quantity")} />
                    <SortTh k="pnl"         label={t("pnl")} />
                    <PlainTh label={t("fees")} />
                    {hasAnyTags    && <PlainTh label={t("tags")} />}
                    {hasAnyMessage && <PlainTh label={t("note")} />}
                    <PlainTh label={t("image")} />
                    <PlainTh label={t("delete")} />
                  </tr>
                </thead>

                <tbody>
                  {sorted.length > 0 ? (
                    <>
                      {sorted.map(trade => {
                        const partial  = isPartial(trade);
                        const isOpen   = partial && !!trade.id && expanded.has(trade.id);
                        const pnl      = trade.pnl ?? 0;
                        const pc0      = trade.partial_closes[0];
                        const fees     = sumFees(trade);

                        const rowBg = pnl > 0
                          ? "hover:bg-green-950/40"
                          : pnl < 0
                          ? "hover:bg-red-950/20"
                          : "hover:bg-green-950/15";

                        return (
                          <React.Fragment key={trade.id ?? trade.timestamp}>
                            {/* ── Summary row ── */}
                            <tr className={`text-center transition-colors ${rowBg}`}>

                              {/* Expand button */}
                              <td className="border border-green-900/30 w-7">
                                {partial ? (
                                  <button
                                    onClick={() => trade.id && toggleExpand(trade.id)}
                                    className="w-full h-full flex items-center justify-center text-green-800 hover:text-green-400 transition py-2"
                                    title={isOpen ? t("collapse_closes") : t("expand_closes")}
                                  >
                                    <Icon
                                      icon={isOpen ? "pixelarticons:chevron-down" : "pixelarticons:chevron-right"}
                                      width={12}
                                    />
                                  </button>
                                ) : (
                                  <span className="text-green-950">·</span>
                                )}
                              </td>

                              {/* Open time */}
                              <td className="px-2 py-2 border border-green-900/30 whitespace-nowrap text-green-700">
                                {formatDate(trade.timestamp, selectedTz)}
                              </td>

                              {/* Symbol + partial badge */}
                              <td className="px-2 py-2 border border-green-900/30 font-semibold text-green-400">
                                {trade.symbol}
                                {partial && (
                                  <span className="ml-1.5 text-[8px] px-1 border border-green-900/50 text-green-900 align-middle tracking-widest">
                                    {t("partial_label")}
                                  </span>
                                )}
                              </td>

                              {/* Side */}
                              <td className={`px-2 py-2 border border-green-900/30 font-semibold ${sideColor(trade.side)}`}>
                                {trade.side.toUpperCase()}
                              </td>

                              {/* Entry */}
                              <td className="px-2 py-2 border border-green-900/30 tabular-nums text-green-600">
                                {trade.entry_price}
                              </td>

                              {/* Exit */}
                              <td className="px-2 py-2 border border-green-900/30 tabular-nums text-green-600">
                                {partial
                                  ? <span className="text-green-900 italic">{t("multiple_exits")}</span>
                                  : pc0?.exit_price ?? "—"}
                              </td>

                              {/* Qty */}
                              <td className="px-2 py-2 border border-green-900/30 tabular-nums text-green-600">
                                {trade.quantity}
                              </td>

                              {/* PnL */}
                              <td className={`px-2 py-2 border border-green-900/30 tabular-nums font-semibold ${pnlColor(pnl)}`}>
                                {fmt(pnl)}
                              </td>

                              {/* Fees */}
                              <td className="px-2 py-2 border border-green-900/30 tabular-nums text-green-800">
                                {fees > 0 ? fees.toFixed(2) : "—"}
                              </td>

                              {/* Tags */}
                              {hasAnyTags && (
                                <td className="px-2 py-2 border border-green-900/30">
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {(trade.tags ?? []).map(tag => (
                                      <TagChip
                                        key={tag}
                                        tag={tag}
                                        onClick={() => onFilterChange({ tag })}
                                      />
                                    ))}
                                  </div>
                                </td>
                              )}

                              {/* Note */}
                              {hasAnyMessage && (
                                <td className="px-2 py-2 border border-green-900/30">
                                  <MessageCell message={trade.message} />
                                </td>
                              )}

                              {/* Image */}
                              <td className="px-2 py-2 border border-green-900/30">
                                {trade.image_url
                                  ? <div className="flex justify-center"><ImageModal imageSrc={trade.image_url} /></div>
                                  : <span className="text-green-950">—</span>}
                              </td>

                              {/* Delete */}
                              <td className="px-2 py-2 border border-green-900/30">
                                <button
                                  disabled={deleting === trade.id}
                                  onClick={() => trade.id != null && handleDelete(trade.id, trade.symbol)}
                                  className="text-red-700 hover:text-red-400 transition px-2 py-0.5 border border-red-900/50 hover:border-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-[10px]"
                                >
                                  {deleting === trade.id
                                    ? <Icon icon="pixelarticons:refresh" className="animate-spin" width={10} />
                                    : "DEL"}
                                </button>
                              </td>
                            </tr>

                            {/* ── Partial close detail rows ── */}
                            {isOpen && trade.partial_closes.map((pc, idx) => (
                              <PartialCloseRow
                                key={idx}
                                pc={pc}
                                index={idx}
                                total={trade.partial_closes.length}
                                selectedTz={selectedTz}
                              />
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {/* ── Totals row ── */}
                      <tr className="bg-green-950/25 text-center text-xs border-t-2 border-green-900/50 font-semibold">
                        <td className="border border-green-900/30" />
                        <td colSpan={5} className="px-2 py-2 border border-green-900/30 text-green-dark text-left">
                          {t("totals")} ({total}) · {wins}{t("wins_abbr")}&nbsp;/&nbsp;{total - wins}{t("losses_abbr")}
                        </td>
                        <td className="px-2 py-2 border border-green-900/30 tabular-nums text-green-800">
                          {trades.reduce((s, t) => s + (t.quantity ?? 0), 0).toFixed(2)}
                        </td>
                        <td className={`px-2 py-2 border border-green-900/30 tabular-nums ${pnlColor(totalPnl)}`}>
                          {fmt(totalPnl)}
                        </td>
                        <td className="px-2 py-2 border border-green-900/30 tabular-nums text-green-800">
                          {totalFees > 0 ? totalFees.toFixed(2) : "—"}
                        </td>
                        {/* fill remaining columns */}
                        <td
                          className="border border-green-900/30"
                          colSpan={(hasAnyTags ? 1 : 0) + (hasAnyMessage ? 1 : 0) + 2}
                        />
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td
                        colSpan={10 + (hasAnyTags ? 1 : 0) + (hasAnyMessage ? 1 : 0)}
                        className="text-center p-8 text-green-900"
                      >
                        {t("notradesfound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {hasAnyPartial && (
            <p className="mt-2 text-[10px] text-green-900 flex items-center gap-1">
              <Icon icon="pixelarticons:chevron-right" width={10} />
              {t("partial_expand_hint")}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default TradeList;
