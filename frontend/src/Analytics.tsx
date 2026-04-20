import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Filler, Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import api from "./services/api";
import { Trade } from "./services/utils";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import JournalSelector, { Journal } from "./components/JournalSelector";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler, Legend);

const TZ_KEY = "preferredTimezone";
type Period = "7d" | "30d" | "90d" | "all";

// ── Shared chart theme ──────────────────────────────────────────────────────
const chartBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#000",
      borderColor: "rgba(0,146,15,0.4)",
      borderWidth: 1,
      titleColor: "#00920F",
      bodyColor: "#4ade80",
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(20,83,45,0.15)" },
      ticks: { color: "#166534", font: { size: 10 } },
      border: { color: "rgba(20,83,45,0.3)" },
    },
    y: {
      grid: { color: "rgba(20,83,45,0.15)" },
      ticks: { color: "#166534", font: { size: 10 } },
      border: { color: "rgba(20,83,45,0.3)" },
    },
  },
};

// ── StatCard ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "neutral";
  icon?: string;
}> = ({ label, value, sub, accent = "neutral", icon }) => {
  const valueCls =
    accent === "green" ? "text-green-400" :
    accent === "red"   ? "text-red-400"   : "text-green-600";

  return (
    <div className="border border-green-900/50 bg-black p-4 flex flex-col gap-1 hover:border-green-700/60 transition-colors">
      <div className="flex items-center gap-1.5 text-[15px] text-green-800 uppercase tracking-widest">
        {icon && <Icon icon={icon} width={11} />}
        {label}
      </div>
      <p className={`text-2xl tabular-nums font-workbech ${valueCls}`}>{value}</p>
      {sub && <p className="text-[15px] text-green-900">{sub}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [user,       setUser]           = useState<User | null>(null);
  const [trades,     setTrades]         = useState<Trade[]>([]);
  const [loading,    setLoading]        = useState(false);
  const [journal,    setJournal]        = useState<Journal | null>(null);
  const [period,     setPeriod]         = useState<Period>("30d");
  const [selectedTz, setSelectedTz]     = useState("Local Timezone");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async (j: Journal | null) => {
    if (!j) return;
    setLoading(true);
    try {
      const res = await api.get<Trade[]>("/trades/", {
        params: { journal_id: j.id, limit: 1000 },
      });
      setTrades(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJournalChange = useCallback((j: Journal) => {
    setJournal(j);
    localStorage.setItem("selectedJournalId", String(j.id));
    fetchTrades(j);
  }, [fetchTrades]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const tz    = localStorage.getItem(TZ_KEY);
    if (tz) setSelectedTz(tz);
    setIsLoggedIn(!!token);
    if (!token) return;
    const auth = getAuth();
    onAuthStateChanged(auth, u => setUser(u ?? null));
  }, []);

  // ── Period filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (period === "all") return trades;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 86_400_000;
    return trades.filter(t => new Date(t.timestamp + "Z").getTime() >= cutoff);
  }, [trades, period]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!filtered.length) return null;

    const sorted = [...filtered].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const totalPnl = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const wins     = filtered.filter(t => (t.pnl ?? 0) > 0);
    const losses   = filtered.filter(t => (t.pnl ?? 0) < 0);
    const winRate  = filtered.length ? (wins.length / filtered.length) * 100 : 0;
    const avgWin   = wins.length   ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length   : 0;
    const avgLoss  = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const grossWin  = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

    const totalFees = filtered.reduce((s, t) =>
      s + t.partial_closes.reduce((fs, pc) => fs + (pc.fees ?? 0), 0), 0
    );

    // Best / worst day
    const byDay: Record<string, number> = {};
    for (const t of filtered) {
      const day = t.timestamp.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + (t.pnl ?? 0);
    }
    const dayEntries = Object.entries(byDay);
    const bestDay  = dayEntries.sort((a, b) => b[1] - a[1])[0];
    const worstDay = dayEntries.sort((a, b) => a[1] - b[1])[0];

    // Cumulative PnL
    let cum = 0;
    const cumData = sorted.map(t => {
      cum += t.pnl ?? 0;
      return { x: t.timestamp.slice(0, 10), y: parseFloat(cum.toFixed(2)) };
    });

    // By symbol
    const bySymbol: Record<string, number> = {};
    for (const t of filtered) {
      bySymbol[t.symbol] = (bySymbol[t.symbol] ?? 0) + (t.pnl ?? 0);
    }
    const symbolEntries = Object.entries(bySymbol)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 10);

    // Day of week
    const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const byDow = Array(7).fill(null).map(() => ({ pnl: 0, count: 0 }));
    for (const t of filtered) {
      const dow = new Date(t.timestamp + "Z").getDay();
      byDow[dow].pnl   += t.pnl ?? 0;
      byDow[dow].count += 1;
    }

    // Streaks
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    let finalStreak = 0;
    for (const t of sorted) {
      if ((t.pnl ?? 0) > 0) {
        curWin++; curLoss = 0;
        if (curWin > maxWin) maxWin = curWin;
        finalStreak = curWin;
      } else {
        curLoss++; curWin = 0;
        if (curLoss > maxLoss) maxLoss = curLoss;
        finalStreak = -curLoss;
      }
    }

    // Long / short split
    const longs  = filtered.filter(t => ["long", "buy"].includes(t.side.toLowerCase())).length;
    const shorts = filtered.length - longs;

    return {
      totalPnl, wins: wins.length, losses: losses.length, winRate,
      avgWin, avgLoss, profitFactor, totalFees, bestDay, worstDay,
      cumData, symbolEntries, byDow, DOW_KEYS,
      maxWin, maxLoss, finalStreak, longs, shorts,
    };
  }, [filtered]);

  // ── Chart configs ──────────────────────────────────────────────────────────
  const cumLineData = useMemo(() => {
    if (!stats) return null;
    const pnls = stats.cumData.map(d => d.y);
    return {
      labels: stats.cumData.map(d => d.x),
      datasets: [{
        data: pnls,
        borderColor: "#00920F",
        backgroundColor: "rgba(0,146,15,0.08)",
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
      }],
    };
  }, [stats]);

  const symbolBarData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.symbolEntries.map(([sym]) => sym),
      datasets: [{
        data: stats.symbolEntries.map(([, pnl]) => parseFloat(pnl.toFixed(2))),
        backgroundColor: stats.symbolEntries.map(([, pnl]) =>
          pnl >= 0 ? "rgba(0,146,15,0.7)" : "rgba(220,38,38,0.7)"
        ),
        borderColor: stats.symbolEntries.map(([, pnl]) =>
          pnl >= 0 ? "#00920F" : "#dc2626"
        ),
        borderWidth: 1,
      }],
    };
  }, [stats]);

  const dowBarData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.DOW_KEYS.map(k => t(k)),
      datasets: [{
        data: stats.byDow.map(d => parseFloat(d.pnl.toFixed(2))),
        backgroundColor: stats.byDow.map(d =>
          d.pnl >= 0 ? "rgba(0,146,15,0.6)" : "rgba(220,38,38,0.6)"
        ),
        borderColor: stats.byDow.map(d => d.pnl >= 0 ? "#00920F" : "#dc2626"),
        borderWidth: 1,
      }],
    };
  }, [stats, t]);

  const fmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;

  const PERIODS: Period[] = ["7d", "30d", "90d", "all"];
  const periodLabel: Record<Period, string> = {
    "7d": t("period_7d"), "30d": t("period_30d"), "90d": t("period_90d"), "all": t("period_all"),
  };

  return (
    <div className="font-jersey15 text-green-600 bg-black min-h-screen">

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 h-16 border-b border-green-900/60 z-50 bg-black flex items-center justify-between px-4 gap-3">
        <h1
          className="text-2xl sm:text-3xl text-green-dark font-workbech px-1 cursor-pointer shrink-0"
          onClick={() => navigate("/")}
        >
          TradeJourney
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 justify-end">
          {isLoggedIn && (
            <JournalSelector
              selectedJournalId={journal?.id ?? null}
              onJournalChange={handleJournalChange}
            />
          )}
          <div className="hidden sm:block"><ClockWithTimezone timezone={selectedTz} /></div>
          <TimezoneSelector selectedTz={selectedTz} onChange={tz => { setSelectedTz(tz); localStorage.setItem(TZ_KEY, tz); }} />
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

      {/* ── Mobile bottom nav ── */}
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
            className={`flex flex-col items-center gap-0.5 transition ${path === "/analytics" ? "text-green-dark" : "text-green-600 hover:text-green-300"}`}
          >
            <Icon icon={icon} width={24} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main ── */}
      <main className="pt-16 md:ml-20 pb-20 md:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">

          {/* Page title + period selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-3xl text-green-dark font-workbech">{t("analytics")}</h2>
              {journal && (
                <p className="text-xs text-green-800 mt-0.5">
                  <Icon icon="pixelarticons:notes" width={10} className="inline mr-1" />
                  {journal.name} · {filtered.length} {t("trades")}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs border transition ${
                    period === p
                      ? "border-green-dark text-green-dark bg-green-950/30"
                      : "border-green-900/50 text-green-800 hover:border-green-700 hover:text-green-600"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {!journal ? (
            <div className="border border-yellow-700/40 bg-yellow-950/20 p-4 text-yellow-500 text-sm">
              {t("no_journal_warning")}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-green-800 py-8">
              <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
              {t("loading")}
            </div>
          ) : !stats ? (
            <p className="text-green-900 py-8 text-sm">{t("no_trades_period")}</p>
          ) : (
            <div className="flex flex-col gap-5">

              {/* ── Stat cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label={t("pnlsum")}
                  value={fmt(stats.totalPnl)}
                  accent={stats.totalPnl >= 0 ? "green" : "red"}
                  icon="pixelarticons:coin"
                />
                <StatCard
                  label={t("winrate")}
                  value={fmtPct(stats.winRate)}
                  sub={`${stats.wins}W / ${stats.losses}L`}
                  accent={stats.winRate >= 50 ? "green" : "red"}
                  icon="pixelarticons:check"
                />
                <StatCard
                  label={t("profit_factor")}
                  value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"}
                  accent={stats.profitFactor >= 1 ? "green" : "red"}
                  icon="pixelarticons:bar-chart"
                />
                <StatCard
                  label={t("totaltrades")}
                  value={String(filtered.length)}
                  sub={`${stats.longs}L / ${stats.shorts}S`}
                  icon="pixelarticons:list"
                />
                <StatCard
                  label={t("avg_win")}
                  value={fmt(stats.avgWin)}
                  accent="green"
                  icon="pixelarticons:arrow-up"
                />
                <StatCard
                  label={t("avg_loss")}
                  value={fmt(stats.avgLoss)}
                  accent="red"
                  icon="pixelarticons:arrow-down"
                />
                <StatCard
                  label={t("best_day")}
                  value={stats.bestDay ? fmt(stats.bestDay[1]) : "—"}
                  sub={stats.bestDay?.[0] ?? ""}
                  accent="green"
                  icon="pixelarticons:calendar"
                />
                <StatCard
                  label={t("worst_day")}
                  value={stats.worstDay ? fmt(stats.worstDay[1]) : "—"}
                  sub={stats.worstDay?.[0] ?? ""}
                  accent="red"
                  icon="pixelarticons:calendar"
                />
              </div>

              {/* ── Streaks + fees row ── */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label={t("win_streak")}
                  value={`${stats.maxWin}`}
                  sub={t("streak_wins")}
                  accent="green"
                  icon="pixelarticons:arrow-up"
                />
                <StatCard
                  label={t("loss_streak")}
                  value={`${stats.maxLoss}`}
                  sub={t("streak_losses")}
                  accent="red"
                  icon="pixelarticons:arrow-down"
                />
                <StatCard
                  label={t("total_fees_paid")}
                  value={`-${stats.totalFees.toFixed(2)}`}
                  accent="red"
                  icon="pixelarticons:coin"
                />
              </div>

              {/* ── Charts row 1: Cumulative PnL ── */}
              <div className="border border-green-900/50 p-4">
                <p className="text-green-800 uppercase tracking-widest mb-3">{t("cumulative_pnl")}</p>
                <div className="h-52">
                  {cumLineData && (
                    <Line
                      data={cumLineData}
                      options={{
                        ...chartBase,
                        scales: {
                          ...chartBase.scales,
                          y: {
                            ...chartBase.scales.y,
                            ticks: {
                              ...chartBase.scales.y.ticks,
                              callback: (v: any) => `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(0)}`,
                            },
                          },
                        },
                      } as never}
                    />
                  )}
                </div>
              </div>

              {/* ── Charts row 2: Symbol + Day of Week ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="border border-green-900/50 p-4">
                  <p className="text-green-800 uppercase tracking-widest mb-3">{t("pnl_by_symbol")}</p>
                  <div className="h-48">
                    {symbolBarData && (
                      <Bar
                        data={symbolBarData}
                        options={{
                          ...chartBase,
                          scales: {
                            ...chartBase.scales,
                            y: {
                              ...chartBase.scales.y,
                              ticks: {
                                ...chartBase.scales.y.ticks,
                                callback: (v: any) => `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(0)}`,
                              },
                            },
                          },
                        } as never}
                      />
                    )}
                  </div>
                </div>

                <div className="border border-green-900/50 p-4">
                  <p className="text-green-800 uppercase tracking-widest mb-3">{t("by_day_of_week")}</p>
                  <div className="h-48">
                    {dowBarData && (
                      <Bar
                        data={dowBarData}
                        options={{
                          ...chartBase,
                          scales: {
                            ...chartBase.scales,
                            y: {
                              ...chartBase.scales.y,
                              ticks: {
                                ...chartBase.scales.y.ticks,
                                callback: (v: any) => `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(0)}`,
                              },
                            },
                          },
                        } as never}
                      />
                    )}
                  </div>
                  {/* Trade count per day */}
                  <div className="flex gap-1 mt-2">
                    {stats.byDow.map((d, i) => (
                      <div key={i} className="flex-1 text-center">
                        <p className="text-[9px] text-green-900">{d.count > 0 ? d.count : "·"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
