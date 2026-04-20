import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import api from "./services/api";
import { Trade } from "./services/utils";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import JournalSelector, { Journal } from "./components/JournalSelector";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";

const TZ_KEY = "preferredTimezone";

// ── Input field ────────────────────────────────────────────────────────────
const CalcInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, prefix, suffix, type = "number" }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] text-green-800 uppercase tracking-widest">{label}</label>
    <div className="flex border border-green-900/60 focus-within:border-green-600 transition-colors">
      {prefix && (
        <span className="px-2 py-2 text-green-900 text-sm border-r border-green-900/60 bg-green-950/10 select-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        min="0"
        step="any"
        className="flex-1 bg-black text-green-400 placeholder-green-900 px-3 py-2 text-sm outline-none tabular-nums min-w-0"
      />
      {suffix && (
        <span className="px-2 py-2 text-green-900 text-sm border-l border-green-900/60 bg-green-950/10 select-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// ── Result row ─────────────────────────────────────────────────────────────
const ResultRow: React.FC<{
  label: string;
  value: string;
  accent?: "green" | "red" | "yellow" | "neutral";
  large?: boolean;
}> = ({ label, value, accent = "neutral", large }) => {
  const valCls =
    accent === "green"  ? "text-green-400"  :
    accent === "red"    ? "text-red-400"    :
    accent === "yellow" ? "text-yellow-400" : "text-green-600";

  return (
    <div className="flex items-center justify-between py-2 border-b border-green-900/20 last:border-0">
      <span className="text-xs text-green-800">{label}</span>
      <span className={`tabular-nums ${large ? "text-xl font-workbech" : "text-sm"} ${valCls}`}>
        {value}
      </span>
    </div>
  );
};

// ── Stat tile ──────────────────────────────────────────────────────────────
const StatTile: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "neutral";
  icon: string;
}> = ({ label, value, sub, accent = "neutral", icon }) => {
  const valCls =
    accent === "green" ? "text-green-400" :
    accent === "red"   ? "text-red-400"   : "text-green-600";

  return (
    <div className="border border-green-900/50 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] text-green-800 uppercase tracking-widest">
        <Icon icon={icon} width={11} />
        {label}
      </div>
      <p className={`text-2xl tabular-nums font-workbech ${valCls}`}>{value}</p>
      {sub && <p className="text-[10px] text-green-900">{sub}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
const Risk: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user,       setUser]       = useState<User | null>(null);
  const [journal,    setJournal]    = useState<Journal | null>(null);
  const [trades,     setTrades]     = useState<Trade[]>([]);
  const [selectedTz, setSelectedTz] = useState("Local Timezone");

  // ── Position sizing state ──────────────────────────────────────────────────
  const [accountSize,  setAccountSize]  = useState("10000");
  const [riskPct,      setRiskPct]      = useState("1");
  const [psEntry,      setPsEntry]      = useState("");
  const [psStop,       setPsStop]       = useState("");

  // ── R:R state ─────────────────────────────────────────────────────────────
  const [rrEntry,  setRrEntry]  = useState("");
  const [rrStop,   setRrStop]   = useState("");
  const [rrTarget, setRrTarget] = useState("");

  // ── Fetch trades for historical stats ─────────────────────────────────────
  const fetchTrades = useCallback(async (j: Journal | null) => {
    if (!j) return;
    try {
      const res = await api.get<Trade[]>("/trades/", { params: { journal_id: j.id, limit: 1000 } });
      setTrades(res.data);
    } catch { /* non-critical */ }
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

  // ── Position sizing calculation ────────────────────────────────────────────
  const posCalc = useMemo(() => {
    const acct  = parseFloat(accountSize) || 0;
    const risk  = parseFloat(riskPct)     || 0;
    const entry = parseFloat(psEntry)     || 0;
    const stop  = parseFloat(psStop)      || 0;
    if (!acct || !risk || !entry || !stop || entry === stop) return null;

    const dollarRisk   = acct * (risk / 100);
    const stopDistance = Math.abs(entry - stop);
    const posSize      = dollarRisk / stopDistance;
    const stopPct      = (stopDistance / entry) * 100;

    return { dollarRisk, posSize, stopDistance, stopPct };
  }, [accountSize, riskPct, psEntry, psStop]);

  // ── R:R calculation ────────────────────────────────────────────────────────
  const rrCalc = useMemo(() => {
    const entry  = parseFloat(rrEntry)  || 0;
    const stop   = parseFloat(rrStop)   || 0;
    const target = parseFloat(rrTarget) || 0;
    if (!entry || !stop || !target || entry === stop) return null;

    const riskDist   = Math.abs(entry - stop);
    const rewardDist = Math.abs(target - entry);
    const rrRatio    = rewardDist / riskDist;
    const minWinRate = (1 / (1 + rrRatio)) * 100;

    return { rrRatio, minWinRate };
  }, [rrEntry, rrStop, rrTarget]);

  // ── Historical stats from trades ───────────────────────────────────────────
  const histStats = useMemo(() => {
    if (!trades.length) return null;

    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Max drawdown
    let peak = 0, cum = 0, maxDd = 0;
    for (const t of sorted) {
      cum += t.pnl ?? 0;
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > maxDd) maxDd = dd;
    }

    // Longest loss streak
    let maxStreak = 0, cur = 0;
    for (const t of sorted) {
      if ((t.pnl ?? 0) < 0) { cur++; if (cur > maxStreak) maxStreak = cur; }
      else cur = 0;
    }

    // Avg loss
    const losses   = trades.filter(t => (t.pnl ?? 0) < 0);
    const avgLoss  = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;

    // R multiple (avg win / abs avg loss)
    const wins   = trades.filter(t => (t.pnl ?? 0) > 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const rMult  = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;

    return { maxDd, maxStreak, avgLoss, rMult, trades: trades.length };
  }, [trades]);

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

      {/* ── Sidebar ── */}
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

      {/* ── Mobile nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-green-900/60 z-50 bg-black flex items-center justify-around px-2">
        {[
          { path: "/home",      icon: "pixelarticons:home",      label: t("home") },
          { path: "/trades",    icon: "pixelarticons:chart-add",  label: t("trades_nav") },
          { path: "/analytics", icon: "pixelarticons:bar-chart",  label: t("analytics") },
          { path: "/risk",      icon: "pixelarticons:shield",     label: t("risk_center") },
          { path: "/journal",   icon: "pixelarticons:notes",      label: t("journal_nav") },
        ].map(({ path, icon, label }) => (
          <button key={path} onClick={() => navigate(path)} className={`flex flex-col items-center gap-0.5 transition ${path === "/risk" ? "text-green-dark" : "text-green-600 hover:text-green-300"}`}>
            <Icon icon={icon} width={24} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main ── */}
      <main className="pt-16 md:ml-20 pb-20 md:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">

          <div className="mb-6">
            <h2 className="text-3xl text-green-dark font-workbech">{t("risk_center")}</h2>
            <p className="text-xs text-green-800 mt-0.5">{t("risk_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Position Sizing ── */}
            <div className="border border-green-900/50 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-green-900/30 pb-3">
                <Icon icon="pixelarticons:briefcase" width={16} className="text-green-dark" />
                <h3 className="text-green-dark text-lg">{t("position_sizing")}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CalcInput label={t("account_size")} value={accountSize} onChange={setAccountSize} prefix="$" />
                <CalcInput label={t("risk_percent")} value={riskPct}     onChange={setRiskPct}     suffix="%" placeholder="1" />
                <CalcInput label={t("entry_price_calc")} value={psEntry} onChange={setPsEntry} />
                <CalcInput label={t("stop_loss")}        value={psStop}  onChange={setPsStop} />
              </div>

              {/* Risk % visual bar */}
              <div>
                <div className="flex justify-between text-[10px] text-green-900 mb-1">
                  <span>0%</span><span>{t("risk_percent")}</span><span>5%</span>
                </div>
                <div className="h-1.5 bg-green-950/40 border border-green-900/40">
                  <div
                    className={`h-full transition-all ${parseFloat(riskPct) > 3 ? "bg-red-600" : parseFloat(riskPct) > 1.5 ? "bg-yellow-600" : "bg-green-dark"}`}
                    style={{ width: `${Math.min((parseFloat(riskPct) || 0) / 5 * 100, 100)}%` }}
                  />
                </div>
                {parseFloat(riskPct) > 2 && (
                  <p className="text-[10px] text-yellow-600 mt-1">⚠ {t("risk_high_warning")}</p>
                )}
              </div>

              <div className="border border-green-900/30 p-3 flex flex-col">
                {posCalc ? (
                  <>
                    <ResultRow label={t("dollar_risk")}      value={`$${posCalc.dollarRisk.toFixed(2)}`}   accent="red"     large />
                    <ResultRow label={t("recommended_qty")}  value={posCalc.posSize.toFixed(4)}             accent="green"   large />
                    <ResultRow label={t("stop_distance")}    value={`${posCalc.stopDistance.toFixed(4)} (${posCalc.stopPct.toFixed(2)}%)`} />
                  </>
                ) : (
                  <p className="text-xs text-green-900 text-center py-3">{t("enter_values")}</p>
                )}
              </div>
            </div>

            {/* ── R:R Analyzer ── */}
            <div className="border border-green-900/50 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-green-900/30 pb-3">
                <Icon icon="pixelarticons:arrow-bar-right" width={16} className="text-green-dark" />
                <h3 className="text-green-dark text-lg">{t("rr_analyzer")}</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <CalcInput label={t("entry_price_calc")} value={rrEntry}  onChange={setRrEntry} />
                <CalcInput label={t("stop_loss")}        value={rrStop}   onChange={setRrStop} />
                <CalcInput label={t("take_profit_price")} value={rrTarget} onChange={setRrTarget} />
              </div>

              {/* Visual R:R bar */}
              {rrCalc && (
                <div className="flex h-6 border border-green-900/40 overflow-hidden">
                  <div
                    className="bg-red-800/60 flex items-center justify-center text-[9px] text-red-300"
                    style={{ width: `${100 / (1 + rrCalc.rrRatio)}%` }}
                  >
                    1R
                  </div>
                  <div
                    className="bg-green-900/60 flex items-center justify-center text-[9px] text-green-300"
                    style={{ width: `${100 * rrCalc.rrRatio / (1 + rrCalc.rrRatio)}%` }}
                  >
                    {rrCalc.rrRatio.toFixed(1)}R
                  </div>
                </div>
              )}

              <div className="border border-green-900/30 p-3 flex flex-col">
                {rrCalc ? (
                  <>
                    <ResultRow
                      label={t("rr_ratio")}
                      value={`1 : ${rrCalc.rrRatio.toFixed(2)}`}
                      accent={rrCalc.rrRatio >= 1.5 ? "green" : rrCalc.rrRatio >= 1 ? "yellow" : "red"}
                      large
                    />
                    <ResultRow
                      label={t("required_winrate_label")}
                      value={`${rrCalc.minWinRate.toFixed(1)}%`}
                      accent="neutral"
                    />
                    <p className="text-[10px] text-green-900 mt-2">
                      {t("breakeven_winrate")}: {rrCalc.minWinRate.toFixed(1)}%
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-green-900 text-center py-3">{t("enter_values")}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Historical Stats ── */}
          {histStats && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="pixelarticons:history" width={14} className="text-green-800" />
                <p className="text-xs text-green-800 uppercase tracking-widest">{t("historical_risk_stats")}</p>
                <span className="text-[10px] text-green-900">— {journal?.name} · {histStats.trades} {t("trades")}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                  label={t("max_drawdown")}
                  value={`-$${histStats.maxDd.toFixed(2)}`}
                  accent="red"
                  icon="pixelarticons:arrow-down"
                />
                <StatTile
                  label={t("longest_loss_streak")}
                  value={`${histStats.maxStreak}`}
                  sub={t("streak_losses")}
                  accent="red"
                  icon="pixelarticons:minus-box"
                />
                <StatTile
                  label={t("avg_loss_trade")}
                  value={`$${histStats.avgLoss.toFixed(2)}`}
                  accent="red"
                  icon="pixelarticons:coin"
                />
                <StatTile
                  label="R Multiple"
                  value={histStats.rMult.toFixed(2)}
                  sub="avg win / avg loss"
                  accent={histStats.rMult >= 1.5 ? "green" : histStats.rMult >= 1 ? "neutral" : "red"}
                  icon="pixelarticons:bar-chart"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Risk;
