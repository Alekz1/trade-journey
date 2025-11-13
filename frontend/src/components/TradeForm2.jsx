import { useState } from "react";

export default function TradeForm2({ onAdd }) {
  const [form, setForm] = useState({
    symbol: "",
    side: "buy",
    entry_price: "",
    exit_price: "",
    quantity: "",
    fees: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.symbol || !form.entry_price || !form.exit_price || !form.quantity) {
      alert("Please fill in all required fields.");
      return;
    }
    onAdd(form);
    setForm({ symbol: "", side: "buy", entry_price: "", exit_price: "", quantity: "", fees: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 flex flex-wrap gap-2 mb-4">
      <input name="symbol" value={form.symbol} onChange={handleChange} placeholder="Symbol" className="border p-2 rounded" />
      <select name="side" value={form.side} onChange={handleChange} className="border p-2 rounded"style={{ backgroundColor: '#242424' }}>
        <option value="buy" className="border p-2 rounded" >Buy</option>
        <option value="sell" className="border p-2 rounded">Sell</option>
      </select>
      <input name="entry_price" value={form.entry_price} onChange={handleChange} placeholder="Entry" className="border p-2 rounded" />
      <input name="exit_price" value={form.exit_price} onChange={handleChange} placeholder="Exit" className="border p-2 rounded"/>
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" className="border p-2 rounded"/>
      <input name="fees" value={form.fees} onChange={handleChange} placeholder="Fees" className="border p-2 rounded"/>
      <button type="submit">Add Trade</button>
    </form>
  );
}
