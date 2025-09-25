import { useState, useEffect } from "react";
import TradeForm from "./components/TradeForm";
import TradeList from "./components/TradeList";
import api from "./services/api";

function App() {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    api.get("/trades/").then(res => setTrades(res.data));
  }, []);

  const addTrade = async (trade) => {
    const res = await api.post("/trades/", trade);
    setTrades([...trades, res.data]);
  };

  return (
    <div className="p-4">
      <h1>📊 Trade Journal</h1>
      <TradeForm onAdd={addTrade} />
      <TradeList trades={trades} />
    </div>
  );
}

export default App;
