import React, { useState, useEffect } from "react";
import { useNavigate, To } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import api from "./services/api";
import { auth } from "./services/firebase";
import { Icon } from "@iconify/react";

import TradeList from "./components/TradeList";
import TradePnL from "./components/TradePnL";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import Winrate from "./components/Winrate";
import { DualProgressBar } from "./components/Dualprogressbar";
import { TradeLineChart } from "./components/TradePnlLineChart";
import { WinrateLineChart } from "./components/WinrateLineChart";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";
import TradeForm2 from "./components/TradeForm2";

type Trade = {
  id?: number;
  symbol: string;
  side: string;
  timestamp: string;
  pnl: number;
  entry_price: number;
  exit_price: number;
  quantity: number;
  fees: number | string;
};

interface FTrade {
  symbol: string;
  side: "buy" | "sell";
  entry_price: number;
  quantity: number;
  pnl: number | null;
  timestamp: string | null;
  partial_closes: {
    exit_price: number;
    closed_quantity: number;
    fees: number | null;
    timestamp: string | null;
    pnl: number | null;
  }[];
  file: File | null;
}

type Filters = {
  symbol: string;
  side: string;
  date_from: string;
  date_to: string;
  limit: number;
};

type UserStats = {
  total_pnl: number;
  winrate: number;
  sellpercent?: number;
};

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total_pnl: 0, winrate: 0, sellpercent: 0 });
  const [selectedTz, setSelectedTz] = useState<string>("Local Timezone");
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    symbol: "",
    side: "",
    date_from: "",
    date_to: "",
    limit: 10,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).catch((err) => console.error("Firebase logout error:", err));
    localStorage.removeItem("token");
  };

  const fetchTrades = async (activeFilters: Filters = filters) => {
    try {
      setLoading(true);
      setError("");
      const cleanedFilters = Object.fromEntries(
        Object.entries(activeFilters).filter(
          ([_, value]) => value !== "" && value !== null && value !== undefined
        )
      );
      const res = await api.get<Trade[]>("/trades/", { params: cleanedFilters });
      setTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
      setError("Failed to fetch trades");
    } finally {
      setLoading(false);
    }
  };

  const fetchTradesUnfiltered = async () => {
    try {
      const res = await api.get<Trade[]>("/trades/");
      setAllTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await api.get<UserStats>("/users/me/stats/");
      setUserStats(res.data);
    } catch (error) {
      console.error("Error fetching user PnL:", error);
    }
  };

  const refreshUserStats = async () => {
    try {
      const res = await api.get<UserStats>("/users/me/stats/refresh/");
      setUserStats(res.data);
    } catch (error) {
      console.error("Error refreshing user PnL:", error);
    }
  };

  const fullrefresh = async () => {
    await fetchTrades();
    await fetchTradesUnfiltered();
    await refreshUserStats();
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTz(tz);
    localStorage.setItem("preferredTimezone", tz);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedTz = localStorage.getItem("preferredTimezone");
    if (storedTz) setSelectedTz(storedTz);
    else setSelectedTz("Local Timezone");
    setIsLoggedIn(!!token);
    if (!token) return;
    fetchTrades();
    fetchUserStats();
    fetchTradesUnfiltered();
    const auth = getAuth();
    onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null));
  }, []);

  const addTrade = async (trade: FTrade) => {
    try {
      const fd = new FormData();
      fd.append("symbol", trade.symbol);
      fd.append("side", trade.side);
      fd.append("entry_price", String(trade.entry_price));
      fd.append("quantity", String(trade.quantity));
      fd.append("partial_closes", JSON.stringify(trade.partial_closes));
      if (trade.file) fd.append("file", trade.file);
      const res = await api.post<Trade>("/trades/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTrades((prev) => [...prev, res.data]);
      await fullrefresh();
    } catch (err: any) {
      if (err.response?.status === 401) setError(t("unauthorized"));
      else setError(t("addtradeerror"));
    }
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleApplyFilters = () => fetchTrades(filters);

  return (
    <div className="font-jersey15 text-green-600 bg-black min-h-screen">

      {/* ── Fixed Header ──────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 h-16 border-b border-green-900/60 z-50 bg-black flex items-center justify-between px-3">
        <h1 className="text-xl sm:text-2xl text-green-dark font-workbech px-1">TradeJourney</h1>
        <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
          <div className="hidden sm:block"><ClockWithTimezone timezone={selectedTz} /></div>
          <TimezoneSelector selectedTz={selectedTz} onChange={handleTimezoneChange} />
          <LanguageSelector />
          {!isLoggedIn && <LoginSignupButton />}
          {isLoggedIn && <LogoutButton />}
        </div>
      </header>

      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-14 flex-col items-center border-r border-green-900/60 z-40 bg-black py-3 gap-4">
        {user?.photoURL && (
          <img
            src={user.photoURL}
            className="w-9 h-9 rounded-full border border-green-800 mb-2"
            alt="avatar"
          />
        )}
        <button
          className="text-green-600 hover:text-green-300 transition"
          onClick={() => navigate("/home")}
          title="Home"
        >
          <Icon icon="pixelarticons:home" width={36} height={36} />
        </button>
        <button
          className="text-green-600 hover:text-green-300 transition"
          onClick={() => navigate("/trades")}
          title="Trades"
        >
          <Icon icon="pixelarticons:chart-add" width={36} height={36} />
        </button>
      </aside>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-green-900/60 z-50 bg-black flex items-center justify-around px-6">
        <button
          className="flex flex-col items-center gap-0.5 text-green-600 hover:text-green-300 transition"
          onClick={() => navigate("/home")}
        >
          <Icon icon="pixelarticons:home" width={28} height={28} />
          <span className="text-xs">Home</span>
        </button>

        <button
          className="flex flex-col items-center gap-0.5 text-green-600 hover:text-green-300 transition"
          onClick={() => setShowQuickAdd(!showQuickAdd)}
        >
          <Icon icon="pixelarticons:plus-box" width={28} height={28} />
          <span className="text-xs">{t("addtrade")}</span>
        </button>

        <button
          className="flex flex-col items-center gap-0.5 text-green-600 hover:text-green-300 transition"
          onClick={() => navigate("/trades")}
        >
          <Icon icon="pixelarticons:chart-add" width={28} height={28} />
          <span className="text-xs">Trades</span>
        </button>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      {isLoggedIn && (
        <main className="pt-16 md:ml-14 pb-20 md:pb-8 min-h-screen overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Welcome */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-green-dark mb-5">
              {t("welcome")}, {user?.displayName}!
            </h2>

            {/* Stats + Quick Add row */}
            <div className="flex flex-col xl:flex-row gap-5">

              {/* Stats column */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">

                {/* PnL + Winrate chart cards */}
                <div className="flex flex-col sm:flex-row gap-3">

                  {/* PnL Card */}
                  <div className="border border-green-900/60 flex-1 min-w-0 flex flex-col">
                    <TradePnL userPnl={userStats.total_pnl} />
                    {/* FIX: h-40 gives chart.js enough room for 6 Y-axis ticks */}
                    <div className="h-40 px-3 pb-2">
                      <TradeLineChart trades={allTrades} />
                    </div>
                  </div>

                  {/* Winrate Card */}
                  <div className="border border-green-900/60 flex-1 min-w-0 flex flex-col">
                    <Winrate winrate={userStats.winrate} />
                    {/* FIX: h-40 */}
                    <div className="h-40 px-3 pb-2">
                      <WinrateLineChart trades={allTrades} />
                    </div>
                  </div>

                </div>

                {/* Long/Short bar */}
                <div className="border border-green-900/60 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                  <p className="text-green-dark text-lg whitespace-nowrap">
                    {t("totaltrades")}: {trades.length}
                  </p>
                  <div className="w-full flex flex-col gap-1">
                    <DualProgressBar
                      rightPercent={userStats.sellpercent ?? 0}
                      leftColor="bg-green-500"
                      rightColor="bg-red-600"
                    />
                    <div className="flex justify-between text-sm">
                      <p className="text-green-dark">
                        {t("buy")} %: {(100 - (userStats.sellpercent ?? 0)).toFixed(2)}%
                      </p>
                      <p className="text-red-600">
                        {t("sell")} %: {userStats.sellpercent?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Refresh */}
                <button
                  className="border border-green-600/60 p-3 text-xl text-green-600 bg-black hover:border-green-300 transition rounded"
                  onClick={refreshUserStats}
                >
                  {t("refreshstats")}
                </button>
              </div>

              {/* Quick Add — desktop inline, mobile as modal-ish panel */}
              <div className="hidden md:flex flex-col items-start xl:w-80 shrink-0">
                <p className="text-green-dark text-2xl mb-2">{t("quickadd")}</p>
                <TradeForm2 onAdd={addTrade} compactMode={true} />
              </div>
            </div>

            {/* Mobile Quick Add Panel (toggle from bottom nav) */}
            {showQuickAdd && (
              <div className="md:hidden mt-4 border border-green-600/60 p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-green-dark text-xl">{t("quickadd")}</p>
                  <button
                    className="text-green-600 hover:text-green-300"
                    onClick={() => setShowQuickAdd(false)}
                  >
                    <Icon icon="pixelarticons:close" width={24} height={24} />
                  </button>
                </div>
                <TradeForm2 onAdd={addTrade} compactMode={true} />
              </div>
            )}

            {/* Trade List */}
            <div className="mt-5 flex flex-col gap-5">
              <TradeList
                trades={trades}
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={handleApplyFilters}
                loading={loading}
                error={error}
                refresh={fullrefresh}
                selectedTz={selectedTz}
              />
              <div className="pt-2">
                <ImportCSV refresh={fullrefresh} />
              </div>
            </div>

          </div>
        </main>
      )}
    </div>
  );
};

export default Home;