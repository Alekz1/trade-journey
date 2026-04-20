import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import api from "./services/api";
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
import JournalSelector, { Journal } from "./components/JournalSelector";

import { useTranslation } from "react-i18next";
import { Trade } from "./services/utils";
import PnlCalendar from "./components/PnlCalendar";
import AveragePnlChart from "./components/AveragePnlChart";

type Filters = {
  symbol: string; side: string;
  date_from: string; date_to: string; limit: number;
};
type UserStats = { total_pnl: number; winrate: number; sellpercent?: number; };
type JournalStats = { total_pnl: number; winrate: number; total_trades: number; sellpercent?: number; };

const TZ_KEY = "preferredTimezone";

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total_pnl: 0, winrate: 0, sellpercent: 0 });
  const [journalStats, setJournalStats] = useState<JournalStats | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [selectedTz, setSelectedTz] = useState("Local Timezone");

  const [loading, setLoading] = useState(false);
  const [isJournalsLoaded, setIsJournalsLoaded] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    symbol: "", side: "", date_from: "", date_to: "", limit: 10,
  });

  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async (
    f: Filters = filters,
    journal: Journal | null = selectedJournal,
  ) => {
    if (!journal) return;
    setLoading(true); setError("");
    try {
      const params = Object.fromEntries(
        Object.entries({ ...f, journal_id: journal.id }).filter(([, v]) => v !== "" && v != null)
      );
      const res = await api.get<Trade[]>("/trades/", { params });
      setTrades(res.data);
    } catch {
      setError("Failed to fetch trades");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedJournal]);

  const fetchAllTrades = useCallback(async (journal: Journal | null = selectedJournal) => {
    if (!journal) return;
    try {
      const res = await api.get<Trade[]>("/trades/", { params: { limit: 500, journal_id: journal.id } });
      setAllTrades(res.data);
    } catch { /* non-critical */ }
  }, [selectedJournal]);

  const fetchUserStats = useCallback(async () => {
    try {
      const res = await api.get<UserStats>("/users/me/stats/");
      setUserStats(res.data);
    } catch { /* non-critical */ }
  }, []);

  const fetchJournalStats = useCallback(async (journal: Journal | null = selectedJournal) => {
    if (!journal) return;
    try {
      const res = await api.get<JournalStats>(`/journals/${journal.id}/stats/`);
      setJournalStats(res.data);
    } catch { /* non-critical */ }
  }, [selectedJournal]);

  const fullRefresh = useCallback(async () => {
    await Promise.all([
      fetchTrades(),
      fetchAllTrades(),
      api.get<UserStats>("/users/me/stats/refresh/").then(r => setUserStats(r.data)).catch(() => { }),
      selectedJournal
        ? api.get<JournalStats>(`/journals/${selectedJournal.id}/stats/refresh/`).then(r => setJournalStats(r.data)).catch(() => { })
        : Promise.resolve(),
    ]);
  }, [fetchTrades, fetchAllTrades, selectedJournal]);

  // ── Journal change (called by JournalSelector) ────────────────────────────
  const handleJournalChange = useCallback((journal: Journal) => {
    setSelectedJournal(journal);
    localStorage.setItem("selectedJournalId", String(journal.id));
    const resetFilters: Filters = { symbol: "", side: "", date_from: "", date_to: "", limit: 10 };
    setFilters(resetFilters);
    fetchTrades(resetFilters, journal);
    fetchJournalStats(journal);
    fetchAllTrades(journal);
  }, [fetchTrades, fetchJournalStats, fetchAllTrades]);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedTz = localStorage.getItem(TZ_KEY);
    if (storedTz) setSelectedTz(storedTz);
    setIsLoggedIn(!!token);
    if (!token) return;
    fetchAllTrades();
    fetchUserStats();
    const auth = getAuth();
    onAuthStateChanged(auth, u => setUser(u ?? null));
    // Journal is selected and trades are fetched by JournalSelector.onJournalChange
  }, []);

  // ── Misc handlers ──────────────────────────────────────────────────────────
  const handleTimezoneChange = (tz: string) => {
    setSelectedTz(tz);
    localStorage.setItem(TZ_KEY, tz);
  };



  const displayStats = journalStats ?? userStats;
  const sellPct = displayStats.sellpercent ?? 0;

  return (
    <div className="font-jersey15 text-green-600 bg-black min-h-screen">

            {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 h-16 border-b border-green-900/60 z-50 bg-black flex items-center justify-between px-4 gap-3">
        <h1 className="text-2xl sm:text-3xl text-green-dark font-workbech px-1 cursor-pointer shrink-0" onClick={() => navigate("/")}>
          TradeJourney
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 justify-end">
          {isLoggedIn && (
            <JournalSelector
              selectedJournalId={selectedJournal?.id ?? null}
              onJournalChange={handleJournalChange}
              onLoaded={() => setTimeout(() => setIsJournalsLoaded(true), 10)}
            />
          )}
          <div className="hidden sm:block"><ClockWithTimezone timezone={selectedTz} /></div>
          <TimezoneSelector selectedTz={selectedTz} onChange={handleTimezoneChange} />
          <LanguageSelector />
          {!isLoggedIn ? <LoginSignupButton /> : <LogoutButton />}
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 hover:w-48 flex-col items-center border-r border-green-900/60 z-40 bg-black py-4 gap-4 transition-all duration-300 ease-in-out group">
        {user?.photoURL && (
          <img src={user.photoURL} className="w-9 h-9 rounded-full border border-green-800 mb-2" alt="avatar" />
        )}
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/home")}
          title={t("home")}
        >
          <Icon icon="pixelarticons:home" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("home")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/trades")}
          title={t("trades_nav")}
        >
          <Icon icon="pixelarticons:chart-add" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("trades_nav")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/analytics")}
          title={t("analytics")}
        >
          <Icon icon="pixelarticons:analytics" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("analytics")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/risk")}
          title={t("risk_center")}
        >
          <Icon icon="pixelarticons:shield" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("risk_center")}</span>
        </button>
        <button
          className="w-full flex justify-center items-center gap-3 px-4 py-3 text-green-600 hover:text-green-300 transition-colors hover:bg-green-900/30 group/button"
          onClick={() => navigate("/journal")}
          title={t("journal_insights")}
        >
          <Icon icon="pixelarticons:notes" width={32} className="shrink-0 group-hover/button:w-[24px] transition-all duration-200" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">{t("journal_insights")}</span>
        </button>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-green-900/60 z-50 bg-black flex items-center justify-around px-2">
        {[
          { path: "/home",      icon: "pixelarticons:home",      label: t("home") },
          { path: "/trades",    icon: "pixelarticons:chart-add",  label: t("trades_nav") },
          { path: "/analytics", icon: "pixelarticons:bar-chart",  label: t("analytics") },
          { path: "/risk",      icon: "pixelarticons:shield",     label: t("risk_center") },
          { path: "/journal",   icon: "pixelarticons:notes",      label: t("journal_nav") },
        ].map(({ path, icon, label }) => (
          <button key={path} onClick={() => navigate(path)} className={`flex flex-col items-center gap-0.5 transition ${path === "/home" ? "text-green-dark" : "text-green-600 hover:text-green-300"}`}>
            <Icon icon={icon} width={24} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </nav>

            {/* ── Main ── */}
      {isLoggedIn && (
        <main className="pt-16 md:ml-20 pb-20 md:pb-8 min-h-screen overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Welcome + journal badge */}
            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-green-dark">
                {t("welcome")}, {user?.displayName ?? "Trader"}!
              </h2>
              {selectedJournal && (
                <span className="text-sm border border-green-900/60 px-2 py-0.5 text-green-800 tracking-wide">
                  <Icon icon="pixelarticons:notes" width={12} className="inline mr-1" />
                  {selectedJournal.name}
                </span>
              )}
            </div>

            {!selectedJournal && isJournalsLoaded && (
              <div className="border border-yellow-700/40 bg-yellow-950/20 p-4 text-yellow-500 text-sm mb-5">
                {t("no_journal_warning")}
              </div>
            )}

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="border border-green-900/60 flex-1 min-w-0 flex flex-col">
                    <TradePnL userPnl={displayStats.total_pnl} />
                    <div className="h-40 px-3 pb-2"><TradeLineChart trades={allTrades} /></div>
                  </div>
                  <div className="border border-green-900/60 flex-1 min-w-0 flex flex-col">
                    <Winrate winrate={displayStats.winrate} />
                    <div className="h-40 px-3 pb-2"><WinrateLineChart trades={allTrades} /></div>
                  </div>
                </div>

                <div className="border border-green-900/60 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                  <p className="text-green-dark text-lg whitespace-nowrap">
                    {t("totaltrades")}: {(displayStats as JournalStats).total_trades ?? trades.length}
                  </p>
                  <div className="w-full flex flex-col gap-1">
                    <DualProgressBar rightPercent={sellPct} leftColor="bg-green-500" rightColor="bg-red-600" />
                    <div className="flex justify-between text-sm">
                      <p className="text-green-dark">{t("buy")} %: {(100 - sellPct).toFixed(2)}%</p>
                      <p className="text-red-600">{t("sell")} %: {sellPct.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                <button
                  className="border border-green-600/60 p-3 text-sm text-green-600 bg-black hover:border-green-300 transition flex items-center gap-2 justify-center"
                  onClick={fullRefresh}
                >
                  <Icon icon="pixelarticons:refresh" width={16} />
                  {t("refreshstats")}
                </button>
              </div>

              {/* PnL Calendar */}
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                <PnlCalendar trades={allTrades} selectedTz={selectedTz} />
                <AveragePnlChart trades={allTrades} />
              </div>
            </div>



            <div className="mt-5 flex flex-col gap-5">
              <TradeList
                trades={trades}
                filters={filters}
                onFilterChange={f => setFilters(prev => ({ ...prev, ...f }))}
                onApplyFilters={() => fetchTrades(filters)}
                loading={loading}
                error={error}
                refresh={fullRefresh}
                selectedTz={selectedTz}
              />
              <div className="pt-2">
                <ImportCSV refresh={fullRefresh} journalId={selectedJournal?.id ?? null} />
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default Home;