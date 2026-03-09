import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

/* ─── Animated counter ──────────────────────────────────────────────── */
const Counter = ({ to, suffix = "" }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.ceil(to / 60);
    const id = setInterval(() => {
      n = Math.min(n + step, to);
      setVal(n);
      if (n >= to) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [to]);
  return <>{val.toLocaleString()}{suffix}</>;
};

/* ─── Feature card ───────────────────────────────────────────────────── */
const FeatureCard = ({ icon, title, desc }) => (
  <div className="border border-green-900/50 p-6 flex flex-col gap-3 hover:border-green-600/70 hover:bg-green-950/20 transition-all duration-300 group cursor-default">
    <Icon icon={icon} width={28} className="text-green-dark group-hover:scale-110 transition-transform duration-200" />
    <h3 className="text-green-dark font-workbech text-base">{title}</h3>
    <p className="text-green-800 text-sm leading-relaxed">{desc}</p>
  </div>
);

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    import("./services/home3d");
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-jersey15 text-green-400 bg-black overflow-x-hidden">

      {/* ── Canvas background ── */}
      <canvas id="bg" className="fixed inset-0 -z-10 w-full h-full pointer-events-none" />

      {/* ── Scanline overlay ── */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)",
        }}
      />

      {/* ════════════════════ NAV ════════════════════ */}
      <nav className="sticky top-0 z-50 mx-3 sm:mx-6 mt-3 sm:mt-4 border border-green-900/60 bg-black/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="text-xl sm:text-2xl font-bold text-green-dark font-workbech shrink-0 hover:text-green-500 transition-colors"
          >
            TradeJourney
          </button>

          {/* Desktop center links */}
          <div className="hidden md:flex gap-8 text-green-700 text-sm absolute left-1/2 -translate-x-1/2">
            {[["#features", t("features")], ["#about", t("contacts")], ["#about", t("contribute")]].map(
              ([href, label]) => (
                <a
                  key={label}
                  href={href}
                  className="hover:text-green-400 transition-colors duration-150 tracking-wide"
                >
                  {label}
                </a>
              )
            )}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <LanguageSelector />
            <button
              onClick={() => navigate("/auth")}
              className="px-5 py-1.5 text-sm border border-green-600/60 text-green-600 bg-transparent hover:border-green-400 hover:text-green-400 transition-all duration-200"
            >
              {t("login")}
            </button>
            <button
              onClick={() => navigate("/auth?tab=register")}
              className="px-5 py-1.5 text-sm font-workbech bg-green-500 border border-green-dark text-black hover:bg-green-600 hover:border-green-600 transition-all duration-200"
            >
              {t("signup")}
            </button>
          </div>

          {/* Mobile right: lang + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSelector />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-green-600 hover:text-green-300 transition p-1"
              aria-label="Toggle navigation"
            >
              <Icon
                icon={menuOpen ? "pixelarticons:close" : "pixelarticons:menu"}
                width={24}
              />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-green-900/50 flex flex-col gap-2">
            {[["#features", t("features")], ["#about", t("contacts")], ["#about", t("contribute")]].map(
              ([href, label]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="text-green-700 hover:text-green-400 transition py-1 text-sm"
                >
                  {label}
                </a>
              )
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { navigate("/auth"); setMenuOpen(false); }}
                className="flex-1 py-2 text-sm border border-green-600/60 text-green-600 hover:border-green-400 transition"
              >
                {t("login")}
              </button>
              <button
                onClick={() => { navigate("/auth?tab=register"); setMenuOpen(false); }}
                className="flex-1 py-2 text-sm bg-green-dark border border-green-dark text-black font-workbech hover:bg-green-600 transition"
              >
                {t("signup")}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-12 flex-1">

        {/* Status chip */}
        <div className="flex items-center gap-2 border border-green-900/60 px-3 py-1 mb-8 text-xs text-green-800 tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-green-dark animate-pulse shrink-0" />
          SYSTEM ONLINE — PAPER TRADING ACTIVE
        </div>

        {/* Main title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold leading-none mb-5 font-workbech text-green-dark tracking-tight">
          TradeJourney
        </h1>

        {/* Terminal subtitle */}
        <div className="text-xl sm:text-base text-green-700 mb-7.5">
          <span className="text-green-900">$ </span>
          <span className="text-xl">{t("moto")}</span>
          <span className="animate-pulse">█</span>
        </div>
      

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <button
            onClick={() => navigate("/auth?tab=register")}
            className="px-8 py-3 text-base font-workbech bg-green-500 border border-green-dark text-black hover:bg-green-600 transition-all duration-200"
          >
            {t("signup")} →
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="px-8 py-3 text-base border border-green-600/60 text-green-600 hover:border-green-400 hover:text-green-400 transition-all duration-200"
          >
            {t("login")}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 border border-green-900/60 divide-y sm:divide-y-0 sm:divide-x divide-green-900/60 w-full max-w-xl">
          {[
            { label: "TRADES LOGGED", to: 12847, suffix: "+" },
            { label: "USERS",         to: 430,   suffix: "+" },
            { label: "SYMBOLS",       to: 99,    suffix: "+" },
          ].map(({ label, to, suffix }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 py-3 bg-black/50">
              <span className="text-2xl font-bold text-green-dark tabular-nums font-workbech">
                <Counter to={to} suffix={suffix} />
              </span>
              <span className="text-xs text-green-900 tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section id="features" className="px-4 sm:px-8 lg:px-16 pb-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-green-900/40" />
          <h2 className="text-green-dark font-workbech text-lg tracking-widest shrink-0">
            {t("features")}
          </h2>
          <div className="h-px flex-1 bg-green-900/40" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
          <FeatureCard icon="pixelarticons:chart-line"      title="P&L Tracking"        desc="Track realized and unrealized profit & loss across all instruments in real time." />
          <FeatureCard icon="pixelarticons:file-plus"       title="CSV Import"           desc="Import your full trade history from TradingView Order or Balance History exports." />
          <FeatureCard icon="pixelarticons:chart-area-line" title="Win Rate Analytics"   desc="Visualize your win rate over time and identify patterns in your trading." />
          <FeatureCard icon="pixelarticons:image"           title="Chart Screenshots"    desc="Attach chart images to each trade for post-trade analysis and review." />
          <FeatureCard icon="pixelarticons:coins"           title="Multi-Symbol"         desc="Journal trades across forex, indices, crypto, and equities in one dashboard." />
          <FeatureCard icon="pixelarticons:clock"           title="Timezone Aware"       desc="All timestamps are timezone-aware. Switch between local and market timezones instantly." />
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer id="about" className="border-t border-green-900/40 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-green-900">
        <span className="font-workbech text-green-dark text-sm">TradeJourney</span>
        <span>© {new Date().getFullYear()} — Open source trading journal</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-green-600 transition">GitHub</a>
          <a href="#" className="hover:text-green-600 transition">Docs</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
