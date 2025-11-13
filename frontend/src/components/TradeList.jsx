import React from "react";
import api from "../services/api";

const TradeList = ({ trades, filters, onFilterChange, onApplyFilters, loading, error, refresh }) => {
  const handleInput = (e) => {
    onFilterChange({ [e.target.name]: e.target.value });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deleteTrade = async (tradeId) => {
    await api.delete(`/delete/trade/${tradeId}/`)
    refresh();
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">Your Trades</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          name="symbol"
          placeholder="Symbol..."
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
          <option value="">All sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
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
          <option value={5}>Last 5</option>
          <option value={10}>Last 10</option>
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
        </select>
        <button
          onClick={onApplyFilters}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-green-950">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Symbol</th>
              <th className="p-2 border">Side</th>
              <th className="p-2 border">Entry</th>
              <th className="p-2 border">Exit</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">PnL</th>
              <th className="p-2 border">Fees</th>
              <th className="p-2 border">Delete</th>
            </tr>
          </thead>
          <tbody>
            {trades.length > 0 ? (
              trades.map((trade) => (
                <tr key={trade.id} className="text-center hover:bg-gray-900">
                  <td className="p-2 border">{formatDate(trade.timestamp)}</td>
                  <td className="p-2 border">{trade.symbol}</td>
                  <td
                    className={`p-2 border font-semibold ${
                      trade.side.toLowerCase() === "buy"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </td>
                  <td className="p-2 border">{trade.entry_price}</td>
                  <td className="p-2 border">{trade.exit_price}</td>
                  <td className="p-2 border">{trade.quantity}</td>
                  <td
                    className={`p-2 border ${
                      trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trade.pnl.toFixed(2)}
                  </td>
                  <td className="p-2 border">{trade.fees}</td>
                  <td><button onClick={()=>deleteTrade(trade.id)}>DEL</button></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center p-3 text-gray-500">
                  No trades found.
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
