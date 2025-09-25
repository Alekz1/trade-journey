import { useState } from "react";

export default function TradeForm({ onAdd }) {
  const [form, setForm] = useState({
    symbol: "",
    side: "buy",
    entry_price: "",
    exit_price: "",
    quantity: "",
    fees: 0,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(form);
    setForm({ symbol: "", side: "buy", entry_price: "", exit_price: "", quantity: "", fees: 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input name="symbol" value={form.symbol} onChange={handleChange} placeholder="Symbol" />
      <select name="side" value={form.side} onChange={handleChange}>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <input name="entry_price" value={form.entry_price} onChange={handleChange} placeholder="Entry" />
      <input name="exit_price" value={form.exit_price} onChange={handleChange} placeholder="Exit" />
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" />
      <input name="fees" value={form.fees} onChange={handleChange} placeholder="Fees" />
      <button type="submit">Add Trade</button>
    </form>
  );
}
