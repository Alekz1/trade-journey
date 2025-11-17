import { useState } from "react";

export default function TradeForm({ onAdd }) {
  const [form, setForm] = useState({
    symbol: "",
    side: "buy",
    entry_price: "",
    exit_price: "",
    quantity: "",
    fees: "", // Optional
    timestamp: "" // Optional
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.symbol || !form.entry_price || !form.exit_price || !form.quantity) {
      alert("Please fill in all required fields.");
      return;
    }
    const cleanedForm = {
      ...form,
      entry_price: parseFloat(form.entry_price),
      exit_price: parseFloat(form.exit_price),
      quantity: parseFloat(form.quantity),
      fees: form.fees ? parseFloat(form.fees) : null,
      timestamp: form.timestamp || null,
    };
    onAdd(cleanedForm);
    console.log("Submitting trade:", form);
    setForm({ symbol: "", side: "buy", entry_price: "", exit_price: "", quantity: "", fees: "", timestamp: "" });
  };

  return (
    <form onSubmit={handleSubmit} className=" flex flex-col gap-3 w-full">
      <input name="symbol" value={form.symbol} onChange={handleChange} placeholder="Symbol" className="border p-2 rounded" />
      <select name="side" value={form.side} onChange={handleChange} className="border p-2 rounded"style={{ backgroundColor: '#242424' }}>
        <option value="buy" className="border p-2 rounded" >Buy</option>
        <option value="sell" className="border p-2 rounded">Sell</option>
      </select>
      <input name="entry_price" value={form.entry_price} onChange={handleChange} placeholder="Entry" className="border p-2 rounded" />
      <input name="exit_price" value={form.exit_price} onChange={handleChange} placeholder="Exit" className="border p-2 rounded"/>
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" className="border p-2 rounded"/>
      <input name="fees" value={form.fees} onChange={handleChange} placeholder="Fees" className="border border-green-600 p-2 rounded text-gray-500"/>
      <input
        name="timestamp"
        type="datetime-local"
        value={form.timestamp}
        onChange={handleChange}
        placeholder="Timestamp (ISO format, optional)"
        className="border border-green-600 text-gray-500 p-2 rounded"
      />
      <h3 className="text-sm text-gray-400">* Leave timestamp empty to use current time</h3>

      <button type="submit" className="border p-2 text-green-600 bg-black/70  hover:border-green-300 transition rounded text-3xl">Add Trade</button>
    </form>
  );
}
