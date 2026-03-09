import React, { useMemo, useState, useCallback } from "react";
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

// ── Sort ───────────────────────────────────────────────────────────────────
type SortKey = "timestamp" | "symbol" | "side" | "pnl" | "entry_price" | "quantity";
type SortDir = "asc" | "desc";

function sortTrades(trades: Trade[], key: SortKey, dir: SortDir): Trade[] {
  return [...trades].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    switch (key) {
      case "pnl":         va = a.pnl         ?? -Infinity; vb = b.pnl         ?? -Infinity; break;
      case "entry_price": va = a.entry_price  ?? 0;         vb = b.entry_price  ?? 0;         break;
      case "quantity":    va = a.quantity     ?? 0;         vb = b.quantity     ?? 0;         break;
      default:            va = (a[key] as string) ?? "";   vb = (b[key] as string) ?? "";
    }
    if (va < vb) return dir === "asc" ? -1 :  1;
    if (va > vb) return dir === "asc" ?  1 : -1;
    return 0;
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
/** True only when the trade was closed in more than one fill. */
const isPartialTrade = (trade: Trade): boolean => trade.partial_closes.length > 1;

const sumFees = (trade: Trade): number =>
  trade.partial_closes.reduce((s, pc) => s + (pc.fees ?? 0), 0);

const pnlColor = (v: number) =>
  v > 0 ? "text-green-500" : v < 0 ? "text-red-500" : "text-green-900";

const sideColor = (side: string) =>
  ["buy", "long"].includes(side.toLowerCase()) ? "text-green-500" : "text-red-500";

const fmt = (v: number, decimals = 2) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}`;

// ══════════════════════════════════════════════════════════════════════════
// Sub-component: one summary row per trade
// ══════════════════════════════════════════════════════════════════════════
interface SummaryRowProps {
  trade:      Trade;
  isPartial:  boolean;
  expanded:   boolean;
  onToggle:   () => void;
  onDelete:   (id: number, symbol: string) => void;
  isDeleting: boolean;
  selectedTz: string;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  trade, isPartial, expanded, onToggle, onDelete, isDeleting, selectedTz,
}) => {
  const { t } = useTranslation();
  const pnl  = trade.pnl ?? 0;
  const fees = sumFees(trade);
  // For a single full close use its exit price; for partial show a placeholder.
  const singleExit = !isPartial ? trade.partial_closes[0]?.exit_price : null;

  return (
    <tr
      className={`text-center transition-colors
        ${pnl > 0 ? "hover:bg-green-950/40" : pnl < 0 ? "hover:bg-red-950/20" : "hover:bg-green-950/20"}
      `}
    >
      {/* ── Expand toggle ── */}
      <td className="p-2 border border-green-900/40 w-8">
        {isPartial ? (
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full text-green-700 hover:text-green-400 transition"
            title={expanded ? t("collapse_closes") : t("expand_closes")}
            aria-label={expanded ? t("collapse_closes") : t("expand_closes")}
          >
            <Icon
              icon={expanded ? "pixelarticons:chevron-down" : "pixelarticons:chevron-right"}
              width={14}
            />
          </button>
        ) : (
          <span className="text-green-950 select-none">·</span>
        )}
      </td>

      {/* ── Open timestamp ── */}
      <td className="p-2 border border-green-900/40 whitespace-nowrap text-xs text-green-700">
        {formatDate(trade.timestamp, selectedTz)}
      </td>

      {/* ── Symbol + partial badge ── */}
      <td className="p-2 border border-green-900/40 font-semibold">
        {trade.symbol}
        {isPartial && (
          <span className="ml-1.5 text-[9px] px-1 border border-green-900/60 text-green-900 align-middle tracking-widest">
            {t("partial_label")}
          </span>
        )}
      </td>

      {/* ── Side ── */}
      <td className={`p-2 border border-green-900/40 font-semibold whitespace-nowrap ${sideColor(trade.side)}`}>
        {trade.side.toUpperCase()}
      </td>

      {/* ── Entry ── */}
      <td className="p-2 border border-green-900/40 tabular-nums">{trade.entry_price}</td>

      {/* ── Exit ── */}
      <td className="p-2 border border-green-900/40 tabular-nums">
        {isPartial
          ? <span className="text-xs text-green-800 italic">{t("multiple_exits")}</span>
          : singleExit ?? "—"}
      </td>

      {/* ── Quantity ── */}
      <td className="p-2 border border-green-900/40 tabular-nums">{trade.quantity}</td>

      {/* ── Total PnL ── */}
      <td className={`p-2 border border-green-900/40 font-semibold tabular-nums ${pnlColor(pnl)}`}>
        {fmt(pnl)}
      </td>

      {/* ── Total fees ── */}
      <td className="p-2 border border-green-900/40 tabular-nums text-green-700">
        {fees > 0 ? fees.toFixed(2) : "—"}
      </td>

      {/* ── Image ── */}
      <td className="p-2 border border-green-900/40">
        {trade.image_url
          ? <div className="flex justify-center"><ImageModal imageSrc={trade.image_url} /></div>
          : <span className="text-green-900">—</span>}
      </td>

      {/* ── Delete ── */}
      <td className="p-2 border border-green-900/40">
        <button
          disabled={isDeleting}
          onClick={() => trade.id !== undefined && onDelete(trade.id, trade.symbol)}
          className="text-red-600 hover:text-red-400 transition text-xs px-2 py-1 border border-red-900/60 hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDeleting
            ? <Icon icon="pixelarticons:refresh" className="animate-spin" width={12} />
            : "DEL"}
        </button>
      </td>
    </tr>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Sub-component: one detail row per partial close (shown when expanded)
// ══════════════════════════════════════════════════════════════════════════
interface PartialCloseRowProps {
  exit_price:      number;
  closed_quantity: number;
  fees:            number | null;
  pctimestamp:     string | null;
  pnl:             number | null;
  index:           number;
  total:           number;
  selectedTz:      string;
}

const PartialCloseRow: React.FC<PartialCloseRowProps> = ({
  exit_price, closed_quantity, fees, pctimestamp, pnl,
  index, total, selectedTz,
}) => {
  const { t } = useTranslation();
  const pcPnl   = pnl ?? 0;
  const isLast  = index === total - 1;

  return (
    <tr className="text-center text-xs bg-black/60 hover:bg-green-950/20 transition-colors">

      {/* Indent marker */}
      <td className="border border-green-900/30 px-1">
        <div className="flex justify-center items-center h-full">
          <Icon
            icon={isLast ? "pixelarticons:corner-down-right" : "pixelarticons:caret-right"}
            width={11}
            className="text-green-900"
          />
        </div>
      </td>

      {/* Close timestamp */}
      <td className="p-1.5 border border-green-900/30 whitespace-nowrap text-green-800">
        {formatDate(pctimestamp, selectedTz) ?? "—"}
      </td>

      {/* Close n/total label spanning symbol + side */}
      <td className="p-1.5 border border-green-900/30 text-green-800" colSpan={2}>
        {t("close_n_of_total", { n: index + 1, total })}
      </td>

      {/* Entry blank — inherited */}
      <td className="p-1.5 border border-green-900/30 text-green-950">—</td>

      {/* Exit price for this close */}
      <td className="p-1.5 border border-green-900/30 tabular-nums text-green-600">
        {exit_price}
      </td>

      {/* Quantity of this close */}
      <td className="p-1.5 border border-green-900/30 tabular-nums text-green-600">
        {closed_quantity}
      </td>

      {/* PnL for this slice */}
      <td className={`p-1.5 border border-green-900/30 tabular-nums font-semibold ${pnlColor(pcPnl)}`}>
        {fmt(pcPnl)}
      </td>

      {/* Fees for this slice */}
      <td className="p-1.5 border border-green-900/30 tabular-nums text-green-800">
        {fees != null ? fees.toFixed(2) : "—"}
      </td>

      {/* Image + Delete — not applicable on sub-rows */}
      <td className="p-1.5 border border-green-900/30 text-green-950" colSpan={2}>—</td>
    </tr>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════
const TradeList: React.FC<TradeListProps> = ({
  trades, filters, onFilterChange, onApplyFilters,
  loading, error, refresh, selectedTz,
}) => {
  const { t } = useTranslation();

  const [sortKey,  setSortKey]  = useState<SortKey>("timestamp");
  const [sortDir,  setSortDir]  = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);

  // ── Derived data ─────────────────────────────────────────────────────────
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

  const hasAnyPartial = useMemo(() => sorted.some(isPartialTrade), [sorted]);

  // ── Handlers ─────────────────────────────────────────────────────────────
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
    setSortKey(prev => {
      if (prev === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
      else              setSortDir("desc");
      return key;
    });
  }, []);

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputCls  = "border border-green-600/60 p-2 bg-black text-green-600 placeholder-green-900 focus:border-green-400 focus:outline-none text-sm min-w-0";
  const selectCls = "border border-green-600/60 p-2 bg-black text-green-600 focus:border-green-400 focus:outline-none text-sm";

  // ── Sort header helpers ───────────────────────────────────────────────────
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k
      ? <Icon icon="pixelarticons:arrows-sort" width={10} className="text-green-900   ml-0.5 inline" />
      : sortDir === "asc"
      ? <Icon icon="pixelarticons:arrow-up"    width={10} className="text-green-dark  ml-0.5 inline" />
      : <Icon icon="pixelarticons:arrow-down"  width={10} className="text-green-dark  ml-0.5 inline" />;

  const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(k)}
      className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark cursor-pointer select-none hover:bg-green-950/60 transition-colors"
    >
      {label}<SortIcon k={k} />
    </th>
  );

  const PlainTh = ({ label, title }: { label: string; title?: string }) => (
    <th
      title={title}
      className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark"
    >
      {label}
    </th>
  );

  return (
    <div className="mt-4 font-jersey15">

      {/* ── Heading ── */}
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <h2 className="text-xl font-bold text-green-dark">{t("yourtrades")}</h2>
        {total > 0 && (
          <span className="text-xs text-green-800">
            {total} {t("trades")} · {wins}{t("wins_abbr")}&nbsp;/&nbsp;{total - wins}{t("losses_abbr")}
          </span>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          name="symbol"
          placeholder={t("symbol")}
          value={filters.symbol}
          onChange={e => onFilterChange({ symbol: e.target.value })}
          className={`${inputCls} w-24 sm:w-32`}
        />
        <select
          name="side"
          value={filters.side}
          onChange={e => onFilterChange({ side: e.target.value })}
          className={selectCls}
        >
          <option value="">{t("allsides")}</option>
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
        <input
          name="date_from" type="date"
          value={filters.date_from}
          onChange={e => onFilterChange({ date_from: e.target.value })}
          className={`${inputCls} w-36`}
        />
        <input
          name="date_to" type="date"
          value={filters.date_to}
          onChange={e => onFilterChange({ date_to: e.target.value })}
          className={`${inputCls} w-36`}
        />
        <select
          name="limit"
          value={filters.limit}
          onChange={e => onFilterChange({ limit: Number(e.target.value) })}
          className={selectCls}
        >
          {[5, 10, 25, 50, 100].map(n => (
            <option key={n} value={n}>{t("last")} {n}</option>
          ))}
        </select>
        <button
          onClick={onApplyFilters}
          className="border border-green-600/60 text-green-600 bg-black px-4 py-2 hover:border-green-300 transition text-sm"
        >
          {t("applyfilters")}
        </button>
      </div>

      {/* ── States ── */}
      {loading ? (
        <div className="flex items-center gap-2 text-green-700 text-sm py-4">
          <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
          {t("loading")}
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm py-4">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full border border-green-900/60 text-sm">

                {/* ── Column headers ── */}
                <thead className="bg-green-950/60">
                  <tr>
                    {/* Expand toggle column — no sort */}
                    <PlainTh
                      label=""
                      title={hasAnyPartial ? t("expand_col_hint") : undefined}
                    />
                    <SortTh k="timestamp"  label={t("open_time")} />
                    <SortTh k="symbol"     label={t("symbol")} />
                    <SortTh k="side"       label={t("side")} />
                    <SortTh k="entry_price" label={t("entry")} />
                    <PlainTh label={t("exit")} />
                    <SortTh k="quantity"   label={t("quantity")} />
                    <SortTh k="pnl"        label={t("pnl")} />
                    <PlainTh label={t("fees")} />
                    <PlainTh label={t("image")} />
                    <PlainTh label={t("delete")} />
                  </tr>
                </thead>

                <tbody>
                  {sorted.length > 0 ? (
                    <>
                      {sorted.map(trade => {
                        const partial  = isPartialTrade(trade);
                        const isOpen   = partial && trade.id !== undefined && expanded.has(trade.id);

                        return (
                          <React.Fragment key={trade.id ?? `${trade.symbol}-${trade.timestamp}`}>

                            {/* One summary row per trade */}
                            <SummaryRow
                              trade={trade}
                              isPartial={partial}
                              expanded={isOpen}
                              onToggle={() => trade.id !== undefined && toggleExpand(trade.id)}
                              onDelete={handleDelete}
                              isDeleting={deleting === trade.id}
                              selectedTz={selectedTz}
                            />

                            {/* Detail rows — shown only when expanded and trade is partial */}
                            {isOpen && trade.partial_closes.map((pc, idx) => (
                              <PartialCloseRow
                                key={idx}
                                exit_price={pc.exit_price}
                                closed_quantity={pc.closed_quantity}
                                fees={pc.fees}
                                pctimestamp={pc.pctimestamp}
                                pnl={pc.pnl}
                                index={idx}
                                total={trade.partial_closes.length}
                                selectedTz={selectedTz}
                              />
                            ))}

                          </React.Fragment>
                        );
                      })}

                      {/* ── Totals row ── */}
                      <tr className="bg-green-950/30 font-semibold text-center text-xs border-t-2 border-green-900/60">
                        <td className="p-2 border border-green-900/40" />
                        <td className="p-2 border border-green-900/40 text-green-dark" colSpan={5}>
                          {t("totals")} ({total})
                        </td>
                        <td className="p-2 border border-green-900/40 tabular-nums text-green-800">
                          {trades.reduce((s, t) => s + t.quantity, 0).toFixed(2)}
                        </td>
                        <td className={`p-2 border border-green-900/40 tabular-nums ${pnlColor(totalPnl)}`}>
                          {fmt(totalPnl)}
                        </td>
                        <td className="p-2 border border-green-900/40 tabular-nums text-green-800">
                          {totalFees > 0 ? totalFees.toFixed(2) : "—"}
                        </td>
                        <td className="p-2 border border-green-900/40" colSpan={2} />
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={11} className="text-center p-6 text-green-900">
                        {t("notradesfound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Expand hint — shown only when partial trades are present ── */}
          {hasAnyPartial && (
            <p className="mt-2 text-xs text-green-900 flex items-center gap-1.5">
              <Icon icon="pixelarticons:chevron-right" width={12} />
              {t("partial_expand_hint")}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default TradeList;