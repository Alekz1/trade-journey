import React, { useState, useEffect } from "react";
import { To, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import api from "./services/api";
import { Icon } from "@iconify/react";

import TradeList from "./components/TradeList";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";
import TradeForm from "./components/TradeForm";
import { FTrade, Trade } from "./services/utils";

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

const Trades: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<number>(1);
  const [userStats, setUserStats] = useState<UserStats>({ total_pnl: 0, winrate: 0, sellpercent: 0 });
  const [selectedTz, setSelectedTz] = useState<string>("Local Timezone");
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
          <span className="text-xs">{t("home")}</span>
        </button>
        <button
          className="flex flex-col items-center gap-0.5 text-green-600 hover:text-green-300 transition"
          onClick={() => navigate("/trades")}
        >
          <Icon icon="pixelarticons:chart-add" width={28} height={28} />
          <span className="text-xs">{t("trades_nav")}</span>
        </button>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      {isLoggedIn && (
        <main className="pt-16 md:ml-14 pb-20 md:pb-8 min-h-screen overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">

            <div className="flex flex-col xl:flex-row gap-6 items-start">
              {/* ── Left Column: Form ── */}
              <div className="w-full xl:w-[480px] shrink-0">
                <div className="border border-green-800/40 bg-black shadow-[0_0_25px_rgba(0,0,0,0.8)] relative overflow-hidden">
                  {/* Terminal Header */}
                  <div className="bg-green-950/60 border-b border-green-900/60 px-4 py-2.5 flex items-center justify-between">
                    <h2 className="text-lg text-green-400 flex items-center gap-2 m-0 uppercase tracking-widest font-semibold">
                      <Icon icon="pixelarticons:terminal" width={18} />
                      {t("addtrade")}
                    </h2>
                    <div className="flex gap-1.5 opacity-70">
                      <div className="w-3 h-3 bg-green-900/80 border border-green-900"></div>
                      <div className="w-3 h-3 bg-green-700/80 border border-green-700"></div>
                      <div className="w-3 h-3 bg-green-500/80 border border-green-500"></div>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-4 sm:p-5">
                    <TradeForm onAdd={addTrade} journalId={selectedJournalId} />
                    {error && (
                      <div className="mt-4 border border-red-900/60 bg-red-950/30 p-3 flex items-start gap-2">
                        <Icon icon="pixelarticons:alert" className="text-red-500 shrink-0 mt-0.5" width={16} />
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right Column: Lists & Data ── */}
              <div className="w-full flex-1 min-w-0 flex flex-col gap-6">
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

                <div className="border border-green-900/40 bg-black p-4 relative overflow-hidden">
                  <span className="absolute -top-3 left-4 bg-black px-2 text-[10px] text-green-700 tracking-widest uppercase">
                    DATA IMPORT
                  </span>
                  <ImportCSV refresh={fullrefresh} journalId={selectedJournalId} />
                </div>
              </div>
            </div>

          </div>
        </main>
      )}
    </div>
  );
};

export default Trades;