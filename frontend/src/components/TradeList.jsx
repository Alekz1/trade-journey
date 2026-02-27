import React from "react";
import api from "../services/api";
import { formatDate } from "../services/utils";
import { useTranslation } from "react-i18next";
import ImageModal from "./ImageModal";

const TradeList = ({ trades, filters, onFilterChange, onApplyFilters, loading, error, refresh, selectedTz }) => {
  const handleInput = (e) => {
    onFilterChange({ [e.target.name]: e.target.value });
  };

  const deleteTrade = async (tradeId) => {
    await api.delete(`/delete/trade/${tradeId}/`);
    refresh();
  };

  const { t } = useTranslation();

  const inputClass = "border border-green-600/60 p-2 rounded bg-black text-green-600 placeholder-green-900 focus:border-green-400 focus:outline-none text-sm min-w-0";
  const selectClass = "border border-green-600/60 p-2 rounded bg-black text-green-600 focus:border-green-400 focus:outline-none text-sm";

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-3 text-green-dark">{t("yourtrades")}</h2>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          name="symbol"
          placeholder={t("symbol")}
          value={filters.symbol}
          onChange={handleInput}
          className={`${inputClass} w-24 sm:w-32`}
        />
        <select
          name="side"
          value={filters.side}
          onChange={handleInput}
          className={selectClass}
        >
          <option value="">{t("allsides")}</option>
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
        <input
          name="date_from"
          type="date"
          value={filters.date_from}
          onChange={handleInput}
          className={`${inputClass} w-36`}
        />
        <input
          name="date_to"
          type="date"
          value={filters.date_to}
          onChange={handleInput}
          className={`${inputClass} w-36`}
        />
        <select
          name="limit"
          value={filters.limit}
          onChange={handleInput}
          className={selectClass}
        >
          <option value={5}>{t("last")} 5</option>
          <option value={10}>{t("last")} 10</option>
          <option value={25}>{t("last")} 25</option>
          <option value={50}>{t("last")} 50</option>
          <option value={100}>{t("last")} 100</option>
        </select>
        <button
          onClick={onApplyFilters}
          className="border border-green-600/60 text-green-600 bg-black px-4 py-2 rounded hover:border-green-300 transition text-sm"
        >
          {t("applyfilters")}
        </button>
      </div>

      {/* ── Table — wrapped in overflow-x-auto so it scrolls on mobile ── */}
      {loading ? (
        <p className="text-green-700">{t("loading")}</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full border border-green-900/60 text-sm">
              <thead className="bg-green-950/60">
                <tr>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("date")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("symbol")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("side")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("entry")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("exit")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("quantity")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("pnl")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("fees")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("image")}</th>
                  <th className="p-2 border border-green-900/60 whitespace-nowrap text-green-dark">{t("delete")}</th>
                </tr>
              </thead>
              <tbody>
                {trades.length > 0 ? (
                  trades.map((trade) =>
                    trade.partial_closes.map((pc, idx) => (
                      <tr
                        key={`${trade.id}-${idx}`}
                        className="text-center hover:bg-green-950/40 transition"
                      >
                        <td className="p-2 border border-green-900/40 whitespace-nowrap text-xs">
                          {formatDate(pc.timestamp || trade.timestamp, selectedTz)}
                        </td>
                        <td className="p-2 border border-green-900/40 font-semibold">{trade.symbol}</td>
                        <td
                          className={`p-2 border border-green-900/40 font-semibold whitespace-nowrap ${
                            trade.side.toLowerCase() === "buy" || trade.side.toLowerCase() === "long"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {trade.side.toUpperCase()}
                        </td>
                        <td className="p-2 border border-green-900/40 tabular-nums">{trade.entry_price}</td>
                        <td className="p-2 border border-green-900/40 tabular-nums">{pc.exit_price}</td>
                        <td className="p-2 border border-green-900/40 tabular-nums">{pc.closed_quantity}</td>
                        <td
                          className={`p-2 border border-green-900/40 font-semibold tabular-nums ${
                            trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {typeof trade.pnl === "number" ? trade.pnl.toFixed(2) : trade.pnl}
                        </td>
                        <td className="p-2 border border-green-900/40 tabular-nums">{pc.fees ?? "—"}</td>
                        <td className="p-2 border border-green-900/40">
                          {trade.image_url ? (
                            <ImageModal imageSrc={trade.image_url} />
                          ) : (
                            <span className="text-green-900">—</span>
                          )}
                        </td>
                        <td className="p-2 border border-green-900/40">
                          <button
                            className="text-red-600 hover:text-red-400 transition font-semibold text-xs px-2 py-1 border border-red-900/60 hover:border-red-500 rounded"
                            onClick={() => deleteTrade(trade.id)}
                          >
                            DEL
                          </button>
                        </td>
                      </tr>
                    ))
                  )
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