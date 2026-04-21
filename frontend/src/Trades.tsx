import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import api from "./services/api";
import { Icon } from "@iconify/react";

import TradeList from "./components/TradeList";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";
import JournalSelector, { Journal } from "./components/JournalSelector";
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

const TZ_KEY = "preferredTimezone";

const Trades: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [isJournalsLoaded, setIsJournalsLoaded] = useState(false);
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

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async (
    f: Filters = filters,
    journal: Journal | null = selectedJournal,
  ) => {
    if (!journal) return;
    setLoading(true);
    setError("");
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

  const fullRefresh = useCallback(async () => {
    await fetchTrades();
  }, [fetchTrades]);

  // ── Journal change ─────────────────────────────────────────────────────────
  const handleJournalChange = useCallback((journal: Journal) => {
    setSelectedJournal(journal);
    localStorage.setItem("selectedJournalId", String(journal.id));
    const resetFilters: Filters = { symbol: "", side: "", date_from: "", date_to: "", limit: 10 };
    setFilters(resetFilters);
    fetchTrades(resetFilters, journal);
  }, [fetchTrades]);

  const handleTimezoneChange = (tz: string) => {
    setSelectedTz(tz);
    localStorage.setItem(TZ_KEY, tz);
  };

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedTz = localStorage.getItem(TZ_KEY);
    if (storedTz) setSelectedTz(storedTz);
    else setSelectedTz("Local Timezone");
    setIsLoggedIn(!!token);
    if (!token) return;
    // Trades are fetched once JournalSelector fires onJournalChange
    const auth = getAuth();
    onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null));
  }, []);

  // ── Add trade ──────────────────────────────────────────────────────────────
  const addTrade = async (trade: FTrade) => {
    if (!selectedJournal) {
      setError(t("select_journal_first"));
      return;
    }
    try {
      const fd = new FormData();
      fd.append("symbol", trade.symbol);
      fd.append("side", trade.side);
      fd.append("entry_price", String(trade.entry_price));
      fd.append("quantity", String(trade.quantity));
      fd.append("jid", String(selectedJournal.id));
      fd.append("partial_closes", JSON.stringify(trade.partial_closes));
      fd.append("message", trade.message ?? "");
      fd.append("tags", JSON.stringify(trade.tags ?? []));
      if (trade.timestamp) fd.append("timestamp", trade.timestamp);
      if (trade.file) fd.append("file", trade.file);
      await api.post<Trade>("/trades/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fullRefresh();
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
      <header className="fixed top-0 inset-x-0 h-16 border-b border-green-900/60 z-50 bg-black flex items-center justify-between px-4 gap-3">
        <h1
          className="text-2xl sm:text-3xl text-green-dark font-workbech px-1 cursor-pointer shrink-0"
          onClick={() => navigate("/home")}
        >
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
          {!isLoggedIn && <LoginSignupButton />}
          {isLoggedIn && <LogoutButton />}
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
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-0.5 transition ${path === "/trades" ? "text-green-dark" : "text-green-600 hover:text-green-300"}`}
          >
            <Icon icon={icon} width={24} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      {isLoggedIn && (
        <main className="pt-16 md:ml-20 pb-20 md:pb-8 min-h-screen overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Journal badge */}
            {selectedJournal && (
              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm border border-green-900/60 px-2 py-0.5 text-green-800 tracking-wide">
                  <Icon icon="pixelarticons:notes" width={12} className="inline mr-1" />
                  {selectedJournal.name}
                </span>
              </div>
            )}

            {/* No-journal warning */}
            {!selectedJournal && isJournalsLoaded && (
              <div className="border border-yellow-700/40 bg-yellow-950/20 p-4 text-yellow-500 text-sm mb-5">
                {t("no_journal_warning")}
              </div>
            )}

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
                    {!selectedJournal && isJournalsLoaded ? (
                      <p className="text-yellow-600 text-sm py-4 text-center">
                        {t("select_journal_first")}
                      </p>
                    ) : (
                      <TradeForm
                        onAdd={addTrade}
                        journalId={selectedJournal?.id ?? 0}
                      />
                    )}
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
                  refresh={fullRefresh}
                  selectedTz={selectedTz}
                />

                <div className="border border-green-900/40 bg-black p-4 relative overflow-hidden">
                  <span className="absolute -top-3 left-4 bg-black px-2 text-[10px] text-green-700 tracking-widest uppercase">
                    {t("import_csv")}
                  </span>
                  <ImportCSV refresh={fullRefresh} journalId={selectedJournal?.id ?? null} />
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