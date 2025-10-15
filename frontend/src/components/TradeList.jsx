import React, { useEffect, useState } from "react";
import api from "../services/api";

const TradeList = () => {
  const [trades, setTrades] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (symbol) params.symbol = symbol;
      if (side) params.side = side;
      if (fromDate) params.date_from = fromDate;
      if (toDate) params.date_to = toDate;
      if (limit) params.limit = limit;

      const res = await api.get("/trades/", { params });
      setTrades(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch trades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [symbol, side, fromDate, toDate, limit]);

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

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-3">Your Trades</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Symbol..."
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={side}
          onChange={(e) => setSide(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border p-2 rounded"
        >
          <option value={5}>Last 5</option>
          <option value={10}>Last 10</option>
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
        </select>
        <button
          onClick={fetchTrades}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Apply Filters
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Symbol</th>
              <th className="p-2 border">Side</th>
              <th className="p-2 border">Entry</th>
              <th className="p-2 border">Exit</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">PnL</th>
              <th className="p-2 border">Fees</th>
            </tr>
          </thead>
          <tbody>
            {trades.length > 0 ? (
              trades.map((trade) => (
                <tr key={trade.id} className="text-center hover:bg-gray-100">
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
