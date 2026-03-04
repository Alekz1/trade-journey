import React, { useMemo, useState } from "react";
import api from "../services/api";
import { formatDate } from "../services/utils";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import ImageModal from "./ImageModal";
import { Trade } from "../services/utils";

// ── Types ──────────────────────────────────────────────────────────────────




export interface Filters {
  symbol:    string;
  side:      string;
  date_from: string;
  date_to:   string;
  limit:     number;
}

interface TradeListProps {
  trades:          Trade[];
  filters:         Filters;
  onFilterChange:  (f: Partial<Filters>) => void;
  onApplyFilters:  () => void;
  loading:         boolean;
  error:           string;
  refresh:         () => void;
  selectedTz:      string;
}

// ── Sort helpers ───────────────────────────────────────────────────────────
type SortKey = "timestamp" | "symbol" | "side" | "pnl" | "entry_price" | "quantity";
type SortDir = "asc" | "desc";

const SORT_LABEL: Record<SortKey, string> = {
  timestamp:   "date",
  symbol:      "symbol",
  side:        "side",
  pnl:         "pnl",
  entry_price: "entry",
  quantity:    "quantity",
};

function sortTrades(trades: Trade[], key: SortKey, dir: SortDir): Trade[] {
  return [...trades].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    if (key === "timestamp") { va = a.timestamp ?? ""; vb = b.timestamp ?? ""; }
    else if (key === "pnl")  { va = a.pnl ?? -Infinity; vb = b.pnl ?? -Infinity; }
    else if (key === "symbol" || key === "side") { va = a[key]; vb = b[key]; }
    else { va = a[key]; vb = b[key]; }
    if (va < vb) return dir === "asc" ? -1 :  1;
    if (va > vb) return dir === "asc" ?  1 : -1;
    return 0;
  });
}

// ── Component ─────────────────────────────────────────────────────────────
const TradeList: React.FC<TradeListProps> = ({
  trades, filters, onFilterChange, onApplyFilters,
  loading, error, refresh, selectedTz,
}) => {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<number | null>(null);

  // ── Sorted trades ──────────────────────────────────────────────────────
  const sorted = useMemo(() => sortTrades(trades, sortKey, sortDir), [trades, sortKey, sortDir]);

  // ── Totals ─────────────────────────────────────────────────────────────
  const totalPnl = useMemo(
    () => trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
    [trades]
  );
  const totalFees = useMemo(
    () => trades.reduce(
      (sum, t) => sum + t.partial_closes.reduce((s, pc) => s + (pc.fees ?? 0), 0),
      0
    ),
    [trades]
  );
  const wins  = trades.filter((t) => (t.pnl ?? 0) > 0).length;
  const total = trades.length;

  // ── Sort click handler ─────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ── Delete with confirm ────────────────────────────────────────────────
  const handleDelete = async (id: number, symbol: string) => {
    if (!window.confirm(`Delete trade: ${symbol}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/delete/trade/${id}/`);
      refresh();
    } finally {
      setDeleting(null);
    }
  };

  // ── Shared class strings ───────────────────────────────────────────────
  const inputCls  = "border border-green-600/60 p-2 bg-black text-green-600 placeholder-green-900 focus:border-green-400 focus:outline-none text-sm min-w-0";
  const selectCls = "border border-green-600/60 p-2 bg-black text-green-600 focus:border-green-400 focus:outline-none text-sm";

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <Icon icon="pixelarticons:arrows-sort" width={10} className="text-green-900 ml-0.5 inline" />
    ) : sortDir === "asc" ? (
      <Icon icon="pixelarticons:arrow-up"   width={10} className="text-green-dark ml-0.5 inline" />
    ) : (
      <Icon icon="pixelarticons:arrow-down" width={10} className="text-green-dark ml-0.5 inline" />
    );

  const SortTh = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(k)}
      className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark cursor-pointer select-none hover:bg-green-950/60 transition"
    >
      {children}<SortIcon k={k} />
    </th>
  );

  return (
    <div className="mt-4 font-jersey15">
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <h2 className="text-xl font-bold text-green-dark">{t("yourtrades")}</h2>
        {total > 0 && (
          <span className="text-xs text-green-800">
            {total} {t("trades") ?? "trades"} · {wins}W / {total - wins}L
          </span>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          name="symbol"
          placeholder={t("symbol")}
          value={filters.symbol}
          onChange={(e) => onFilterChange({ symbol: e.target.value })}
          className={`${inputCls} w-24 sm:w-32`}
        />
        <select
          name="side"
          value={filters.side}
          onChange={(e) => onFilterChange({ side: e.target.value })}
          className={selectCls}
        >
          <option value="">{t("allsides")}</option>
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
        <input
          name="date_from"
          type="date"
          value={filters.date_from}
          onChange={(e) => onFilterChange({ date_from: e.target.value })}
          className={`${inputCls} w-36`}
        />
        <input
          name="date_to"
          type="date"
          value={filters.date_to}
          onChange={(e) => onFilterChange({ date_to: e.target.value })}
          className={`${inputCls} w-36`}
        />
        <select
          name="limit"
          value={filters.limit}
          onChange={(e) => onFilterChange({ limit: Number(e.target.value) })}
          className={selectCls}
        >
          {[5, 10, 25, 50, 100].map((n) => (
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

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center gap-2 text-green-700 text-sm py-4">
          <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
          {t("loading")}
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm py-4">{error}</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full border border-green-900/60 text-sm">
              <thead className="bg-green-950/60">
                <tr>
                  <SortTh k="timestamp">{t("date")}</SortTh>
                  <SortTh k="symbol">{t("symbol")}</SortTh>
                  <SortTh k="side">{t("side")}</SortTh>
                  <SortTh k="entry_price">{t("entry")}</SortTh>
                  {/* Exit has no sort key — it belongs to partial_closes */}
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("exit")}</th>
                  <SortTh k="quantity">{t("quantity")}</SortTh>
                  <SortTh k="pnl">{t("pnl")}</SortTh>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("fees")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("image")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("delete")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length > 0 ? (
                  <>
                    {sorted.map((trade) =>
                      trade.partial_closes.map((pc, idx) => {
                        const pnlNum = trade.pnl ?? 0;
                        const isWin  = pnlNum > 0;
                        const rowBg  = isWin
                          ? "hover:bg-green-950/50"
                          : pnlNum < 0
                          ? "hover:bg-red-950/20"
                          : "hover:bg-green-950/20";

                        return (
                          <tr key={`${trade.id}-${idx}`} className={`text-center transition ${rowBg}`}>
                            <td className="p-2 border border-green-900/40 whitespace-nowrap text-xs">
                              {formatDate(pc.pctimestamp ?? trade.timestamp, selectedTz)}
                            </td>
                            <td className="p-2 border border-green-900/40 font-semibold">{trade.symbol}</td>
                            <td
                              className={`p-2 border border-green-900/40 font-semibold whitespace-nowrap ${
                                ["buy","long"].includes(trade.side.toLowerCase())
                                  ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {trade.side.toUpperCase()}
                            </td>
                            <td className="p-2 border border-green-900/40 tabular-nums">{trade.entry_price}</td>
                            <td className="p-2 border border-green-900/40 tabular-nums">{pc.exit_price}</td>
                            <td className="p-2 border border-green-900/40 tabular-nums">{pc.closed_quantity}</td>
                            <td
                              className={`p-2 border border-green-900/40 font-semibold tabular-nums ${
                                pnlNum >= 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {pnlNum >= 0 ? "+" : ""}{pnlNum.toFixed(2)}
                            </td>
                            <td className="p-2 border border-green-900/40 tabular-nums">{pc.fees ?? "—"}</td>
                            <td className="p-2 border border-green-900/40">
                              {trade.image_url ? (
                                <div className="flex justify-center">
                                  <ImageModal imageSrc={trade.image_url} />
                                </div>
                              ) : (
                                <span className="text-green-900">—</span>
                              )}
                            </td>
                            <td className="p-2 border border-green-900/40">
                              <button
                                disabled={deleting === trade.id}
                                className="text-red-600 hover:text-red-400 transition text-xs px-2 py-1 border border-red-900/60 hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => trade.id !== undefined && handleDelete(trade.id, trade.symbol)}
                              >
                                {deleting === trade.id ? (
                                  <Icon icon="pixelarticons:refresh" className="animate-spin" width={12} />
                                ) : (
                                  "DEL"
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* ── Totals row ── */}
                    <tr className="bg-green-950/30 font-semibold text-center text-xs border-t-2 border-green-900/60">
                      <td className="p-2 border border-green-900/40 text-green-dark" colSpan={6}>
                        TOTAL ({total})
                      </td>
                      <td
                        className={`p-2 border border-green-900/40 tabular-nums ${
                          totalPnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
                      </td>
                      <td className="p-2 border border-green-900/40 tabular-nums text-green-800">
                        {totalFees.toFixed(2)}
                      </td>
                      <td colSpan={2} className="p-2 border border-green-900/40" />
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center p-6 text-green-900">
                      {t("notradesfound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeList;
