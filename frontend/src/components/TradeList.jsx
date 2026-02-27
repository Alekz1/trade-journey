import React from "react";
import api from "../services/api";
import { formatDate } from "../services/utils";
import { useTranslation } from 'react-i18next';
import ImageModal from "./ImageModal";

const TradeList = ({ trades, filters, onFilterChange, onApplyFilters, loading, error, refresh, selectedTz }) => {
  const handleInput = (e) => {
    onFilterChange({ [e.target.name]: e.target.value });
    console.log(trades);
  };

  const deleteTrade = async (tradeId) => {
    await api.delete(`/delete/trade/${tradeId}/`);
    refresh();
  };

  const { t } = useTranslation();

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">{t('yourtrades')}</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          name="symbol"
          placeholder={t("symbol")}
          value={filters.symbol}
          onChange={handleInput}
          className="border p-2 rounded"
        />
        <select
          name="side"
          value={filters.side}
          onChange={handleInput}
          className="border p-2 rounded"
          style={{ backgroundColor: '#242424' }}
        >
          <option value="">{t('allsides')}</option>
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t('sell')}</option>
        </select>
        <input
          name="date_from"
          type="date"
          value={filters.date_from}
          onChange={handleInput}
          className="border p-2 rounded"
        />
        <input
          name="date_to"
          type="date"
          value={filters.date_to}
          onChange={handleInput}
          className="border p-2 rounded"
        />
        <select
          name="limit"
          value={filters.limit}
          onChange={handleInput}
          className="border p-2 rounded"
          style={{ backgroundColor: '#242424' }}
        >
          <option value={5}>{t("last")} 5</option>
          <option value={10}>{t("last")} 10</option>
          <option value={25}>{t("last")} 25</option>
          <option value={50}>{t("last")} 50</option>
          <option value={100}>{t("last")} 100</option>
        </select>
        <button
          onClick={onApplyFilters}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {t("applyfilters")}
        </button>
      </div>

      {loading ? (
        <p>{t("loading")}</p>
      ) : error ? (
        <p className="text-red-600"></p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-green-950">
            <tr>
              <th className="p-2 border">{t("date")}</th>
              <th className="p-2 border">{t("symbol")}</th>
              <th className="p-2 border">{t("side")}</th>
              <th className="p-2 border">{t("entry")}</th>
              <th className="p-2 border">{t("exit")}</th>
              <th className="p-2 border">{t("quantity")}</th>
              <th className="p-2 border">{t("pnl")}</th>
              <th className="p-2 border">{t("fees")}</th>
              <th className="p-2 border">{t("image")}</th>
              <th className="p-2 border">{t("delete")}</th>
            </tr>
          </thead>
          <tbody>
            {trades.length > 0 ? (
              trades.map((trade) =>
                trade.partial_closes.map((pc, idx) => (
                  <tr key={`${trade.id}-${idx}`} className="text-center hover:bg-green-950/70">
                    <td className="p-2 border">{formatDate(pc.timestamp || trade.timestamp, selectedTz)}</td>
                    <td className="p-2 border">{trade.symbol}</td>
                    <td
                      className={`p-2 border border-green-600 font-semibold ${
                        trade.side.toLowerCase() === "buy" || trade.side.toLowerCase() === "long" 
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </td>
                    <td className="p-2 border">{trade.entry_price}</td>
                    <td className="p-2 border">{pc.exit_price}</td>
                    <td className="p-2 border">{pc.closed_quantity}</td>
                    <td
                      className={`p-2 border border-green-600 ${
                        trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {trade.pnl.toFixed(2)}
                    </td>
                    <td className="p-2 border">{pc.fees}</td>
                    <td className="p-2 border">
                      {trade.image_url ? (
                        <ImageModal imageSrc={trade.image_url} />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="border border-green-600">
                      <button
                        className="text-red-500 hover:text-red-400 text-lg"
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
                <td colSpan={9} className="text-center p-3 text-gray-500">
                  {t("notradesfound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TradeList;