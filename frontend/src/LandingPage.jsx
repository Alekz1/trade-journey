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

/* ─── Pricing card ───────────────────────────────────────────────────── */
const PricingCard = ({ planKey, price, features, cta, popular = false, onCta }) => {
  const { t } = useTranslation();
  return (
    <div className={`border flex flex-col gap-5 p-6 relative transition-all duration-300 ${
      popular
        ? "border-green-500/80 bg-green-950/20 shadow-[0_0_30px_rgba(74,222,128,0.12)]"
        : "border-green-900/50 hover:border-green-700/60 hover:bg-green-950/10"
    }`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-workbech tracking-widest px-3 py-0.5 font-bold">
          {t("plan_popular")}
        </div>
      )}
      <div>
        <h3 className="text-green-dark font-workbech text-lg tracking-wide mb-3">{t(planKey)}</h3>
        <div className="flex items-end gap-1">
          <span className="text-green-dark font-workbech text-4xl font-bold">{price}</span>
          <span className="text-green-800  mb-1">Eur{t("plan_month")}</span>
        </div>
      </div>
      <div className="h-px bg-green-900/40" />
      <ul className="flex flex-col gap-2.5 flex-1">
        {features.map((fKey, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Icon
              icon={fKey.disabled ? "pixelarticons:close" : "pixelarticons:check"}
              width={14}
              className={`mt-0.5 shrink-0 ${fKey.disabled ? "text-green-900" : "text-green-500"}`}
            />
            <span className={fKey.disabled ? "text-green-900" : "text-green-700"}>{t(fKey.key)}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className={`mt-2 py-3 text-sm font-workbech tracking-widest transition-all duration-200 ${
          popular
            ? "bg-green-500 border border-green-dark text-black hover:bg-green-600"
            : "border border-green-700/60 text-green-600 hover:border-green-400 hover:text-green-400"
        }`}
      >
        {t(cta)}
      </button>
    </div>
  );
};

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    import("./services/home3d");
  }, []);

  const plans = [
    {
      planKey: "plan_free",
      price: t("plan_free_price"),
      cta: "plan_get_started",
      popular: false,
      features: [
        { key: "plan_free_f1" },
        { key: "plan_free_f2" },
        { key: "plan_free_f3" },
        { key: "plan_free_f4" },
        { key: "plan_free_f5", disabled: true },
      ],
    },
    {
      planKey: "plan_pro",
      price: t("plan_pro_price"),
      cta: "plan_subscribe",
      popular: true,
      features: [
        { key: "plan_pro_f1" },
        { key: "plan_pro_f2" },
        { key: "plan_pro_f3" },
        { key: "plan_pro_f4" },
        { key: "plan_pro_f5" },
        { key: "plan_pro_f6" },
      ],
    },
    {
      planKey: "plan_elite",
      price: t("plan_elite_price"),
      cta: "plan_contact_sales",
      popular: false,
      features: [
        { key: "plan_elite_f1" },
        { key: "plan_elite_f2" },
        { key: "plan_elite_f3" },
        { key: "plan_elite_f4" },
        { key: "plan_elite_f5" },
        { key: "plan_elite_f6" },
      ],
    },
  ];

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
            {[["#features", t("features")], ["#pricing", t("pricing")], ["#contact", t("contacts")]].map(
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
            {[["#features", t("features")], ["#pricing", t("pricing")], ["#contact", t("contacts")]].map(
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
          <FeatureCard icon="pixelarticons:chart-line"      title={t("feature_pnl_title")}     desc={t("feature_pnl_desc")} />
          <FeatureCard icon="pixelarticons:file-plus"       title={t("feature_csv_title")}     desc={t("feature_csv_desc")} />
          <FeatureCard icon="pixelarticons:chart-area-line" title={t("feature_winrate_title")} desc={t("feature_winrate_desc")} />
          <FeatureCard icon="pixelarticons:image"           title={t("feature_chart_title")}   desc={t("feature_chart_desc")} />
          <FeatureCard icon="pixelarticons:coins"           title={t("feature_multi_title")}   desc={t("feature_multi_desc")} />
          <FeatureCard icon="pixelarticons:clock"           title={t("feature_tz_title")}      desc={t("feature_tz_desc")} />
        </div>
      </section>

      {/* ════════════════════ PRICING ════════════════════ */}
      <section id="pricing" className="px-4 sm:px-8 lg:px-16 pb-20">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-px flex-1 bg-green-900/40" />
          <h2 className="text-green-dark font-workbech text-lg tracking-widest shrink-0">
            {t("pricing")}
          </h2>
          <div className="h-px flex-1 bg-green-900/40" />
        </div>
        <p className="text-center text-green-800 text-sm mb-10 tracking-wide">{t("pricing_subtitle")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <PricingCard
              key={plan.planKey}
              {...plan}
              onCta={() => navigate("/auth?tab=register")}
            />
          ))}
        </div>
      </section>

      {/* ════════════════════ CONTACT ════════════════════ */}
      <section id="contact" className="px-4 sm:px-8 lg:px-16 pb-20">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-px flex-1 bg-green-900/40" />
          <h2 className="text-green-dark font-workbech text-lg tracking-widest shrink-0">
            {t("contacts")}
          </h2>
          <div className="h-px flex-1 bg-green-900/40" />
        </div>
        <p className="text-center text-green-800 text-sm mb-10 tracking-wide">{t("contact_subtitle")}</p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Contact info ── */}
          <div className="flex flex-col gap-4">
            {[
              { icon: "pixelarticons:mail", label: t("contact_email_label"), value: t("contact_email_value"), href: `mailto:${t("contact_email_value")}` },
              { icon: "pixelarticons:chat-typing", label: t("contact_discord_label"), value: t("contact_discord_value"), href: "#" },
              { icon: "pixelarticons:github", label: "GitHub", value: t("contact_github_value"), href: "#" },
            ].map(({ icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                className="border border-green-900/50 p-4 flex items-center gap-4 hover:border-green-600/70 hover:bg-green-950/20 transition-all duration-300 group"
              >
                <Icon icon={icon} width={22} className="text-green-dark shrink-0 group-hover:scale-110 transition-transform duration-200" />
                <div className="min-w-0">
                  <p className="text-xs text-green-700 tracking-widest uppercase mb-0.5">{label}</p>
                  <p className="text-green-400 text-sm truncate">{value}</p>
                </div>
                <Icon icon="pixelarticons:chevron-right" width={16} className="text-green-900 group-hover:text-green-600 ml-auto transition-colors" />
              </a>
            ))}
          </div>

          {/* ── Message form ── */}
          <div className="border border-green-900/50 p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="pixelarticons:terminal" width={16} className="text-green-dark" />
              <span className="text-xs text-green-600 tracking-widest uppercase">{t("contact_form_title")}</span>
            </div>

            <div>
              <label className="text-xs text-green-700 uppercase tracking-widest mb-1.5 block font-semibold">{t("contact_name_label")}</label>
              <input
                type="text"
                placeholder={t("contact_name_placeholder")}
                className="border border-green-800/60 focus:border-green-400 focus:shadow-[0_0_8px_rgba(74,222,128,0.2)] bg-black/40 text-green-300 placeholder-green-900/80 px-3 py-2.5 outline-none transition-all duration-300 w-full text-base"
              />
            </div>

            <div>
              <label className="text-xs text-green-700 uppercase tracking-widest mb-1.5 block font-semibold">{t("email")}</label>
              <input
                type="email"
                placeholder={t("contact_email_placeholder")}
                className="border border-green-800/60 focus:border-green-400 focus:shadow-[0_0_8px_rgba(74,222,128,0.2)] bg-black/40 text-green-300 placeholder-green-900/80 px-3 py-2.5 outline-none transition-all duration-300 w-full text-base"
              />
            </div>

            <div>
              <label className="text-xs text-green-700 uppercase tracking-widest mb-1.5 block font-semibold">{t("contact_message_label")}</label>
              <textarea
                rows={4}
                placeholder={t("contact_message_placeholder")}
                className="border border-green-800/60 focus:border-green-400 focus:shadow-[0_0_8px_rgba(74,222,128,0.2)] bg-black/40 text-green-300 placeholder-green-900/80 px-3 py-2.5 outline-none transition-all duration-300 w-full text-base resize-none"
              />
            </div>

            <button
              type="button"
              className="border border-green-500/80 py-3 text-green-400 bg-green-950/20 hover:bg-green-600 hover:text-black hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all duration-300 text-base uppercase tracking-widest font-bold flex items-center justify-center gap-2 w-full font-workbech"
            >
              <Icon icon="pixelarticons:send" width={18} />
              {t("contact_send")}
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="border-t border-green-900/40 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-green-900">
        <span className="font-workbech text-green-dark text-sm">TradeJourney</span>
        <span>© {new Date().getFullYear()} TradeJourney</span>
        <div className="flex gap-4">
          <a href="#contact" className="hover:text-green-600 transition">{t("contacts")}</a>
          <a href="#" className="hover:text-green-600 transition">Docs</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
