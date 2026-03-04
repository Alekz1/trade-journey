import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

const API_URL = import.meta.env.VITE_API_URL;

/* ══════════════════════════════════════════════════════════════════════
   Password validation rules
══════════════════════════════════════════════════════════════════════ */
const RULES = [
  { id: "len",     label: "At least 8 characters",          test: (p) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter (A–Z)",      test: (p) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter (a–z)",      test: (p) => /[a-z]/.test(p) },
  { id: "digit",   label: "One number (0–9)",                test: (p) => /\d/.test(p) },
  { id: "special", label: "One special character (!@#$…)",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── shared input style ─────────────────────────────────────────────── */
const inputCls = (hasError) =>
  `w-full bg-black border ${
    hasError ? "border-red-700" : "border-green-900/70 focus:border-green-600"
  } text-green-400 placeholder-green-900 px-3 py-2.5 text-sm outline-none transition-colors duration-150 font-jersey15`;

/* ─── field wrapper ──────────────────────────────────────────────────── */
const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-green-800 tracking-widest uppercase">{label}</label>
    {children}
    {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   LOGIN TAB
══════════════════════════════════════════════════════════════════════ */
const LoginForm = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token  = await result.user.getIdToken();
      await onSuccess(token);
    } catch (err) {
      setError(friendlyFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <Field label={t("email")}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="trader@example.com"
          className={inputCls(false)}
          autoComplete="email"
        />
      </Field>

      <Field label={t("password")}>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`${inputCls(false)} pr-10`}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-800 hover:text-green-600 transition"
            tabIndex={-1}
          >
            <Icon icon={showPw ? "pixelarticons:eye-closed" : "pixelarticons:eye"} width={16} />
          </button>
        </div>
      </Field>

      {error && (
        <div className="border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs text-red-500">
          ✗ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-green-600 border border-green-dark text-black font-workbech text-base hover:bg-green-600 hover:border-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Icon icon="pixelarticons:refresh" className="animate-spin" width={14} />
            {t("login")}…
          </span>
        ) : t("login")}
      </button>
    </form>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   REGISTER TAB
══════════════════════════════════════════════════════════════════════ */
const RegisterForm = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [touched,  setTouched]  = useState({ email: false, password: false, confirm: false });
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  /* Live rule checks */
  const ruleResults = RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const allRulesPass = ruleResults.every((r) => r.ok);
  const emailValid   = emailRegex.test(email);
  const confirmMatch = password === confirm && confirm !== "";
  const formValid    = emailValid && allRulesPass && confirmMatch;

  /* Field-level errors (shown only after blur) */
  const emailErr   = touched.email    && !emailValid   ? "Enter a valid email address." : "";
  const confirmErr = touched.confirm  && !confirmMatch ? "Passwords do not match." : "";

  const blur = (field) => setTouched((p) => ({ ...p, [field]: true }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!formValid) return;
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const token  = await result.user.getIdToken();
      await onSuccess(token);
    } catch (err) {
      setError(friendlyFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="flex flex-col gap-4">
      {/* Email */}
      <Field label={t("email")} error={emailErr}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => blur("email")}
          placeholder="trader@example.com"
          className={inputCls(!!emailErr)}
          autoComplete="email"
        />
      </Field>

      {/* Password */}
      <Field label={t("password")}>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); blur("password"); }}
            placeholder="••••••••"
            className={`${inputCls(!allRulesPass && touched.password)} pr-10`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-800 hover:text-green-600 transition"
            tabIndex={-1}
          >
            <Icon icon={showPw ? "pixelarticons:eye-closed" : "pixelarticons:eye"} width={16} />
          </button>
        </div>

        {/* Password strength checklist — show as soon as user starts typing */}
        {(touched.password || password) && (
          <div className="border border-green-900/40 bg-green-950/10 p-3 mt-1 flex flex-col gap-1">
            {ruleResults.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <Icon
                  icon={r.ok ? "pixelarticons:check" : "pixelarticons:close"}
                  width={12}
                  className={r.ok ? "text-green-dark shrink-0" : "text-green-900 shrink-0"}
                />
                <span className={r.ok ? "text-green-600" : "text-green-900"}>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </Field>

      {/* Confirm password */}
      <Field label="Confirm password" error={confirmErr}>
        <div className="relative">
          <input
            type={showCf ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => blur("confirm")}
            placeholder="••••••••"
            className={`${inputCls(!!confirmErr)} pr-10`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowCf((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-800 hover:text-green-600 transition"
            tabIndex={-1}
          >
            <Icon icon={showCf ? "pixelarticons:eye-closed" : "pixelarticons:eye"} width={16} />
          </button>
          {/* Match indicator */}
          {confirm && (
            <Icon
              icon={confirmMatch ? "pixelarticons:check" : "pixelarticons:close"}
              width={14}
              className={`absolute right-8 top-1/2 -translate-y-1/2 ${
                confirmMatch ? "text-green-dark" : "text-red-700"
              }`}
            />
          )}
        </div>
      </Field>

      {/* Server error */}
      {error && (
        <div className="border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs text-red-500">
          ✗ {error}
        </div>
      )}

      {/* Submit — disabled until form is valid */}
      <button
        type="submit"
        disabled={!formValid || loading}
        className="w-full py-2.5 bg-green-600 border border-green-dark text-black font-workbech text-base hover:bg-green-600 hover:border-green-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Icon icon="pixelarticons:refresh" className="animate-spin" width={14} />
            {t("signup")}…
          </span>
        ) : t("signup")}
      </button>
    </form>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN AuthPage
══════════════════════════════════════════════════════════════════════ */
function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read initial tab from ?tab=register in URL (set by LandingPage "Sign up" button)
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError,   setGoogleError]   = useState("");

  /* Redirect already-logged-in users */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          await sendTokenToBackend(token);
        } catch (_) {
          // ignore — user might already have a valid session
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const sendTokenToBackend = async (token) => {
    const response = await fetch(`${API_URL}/auth/firebase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error("Backend auth failed");
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    navigate("/home", { replace: true });
  };

  const handleGoogleLogin = async () => {
    setGoogleError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token  = await result.user.getIdToken();
      await sendTokenToBackend(token);
    } catch (err) {
      setGoogleError(friendlyFirebaseError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-2.5 text-sm font-workbech transition-all duration-150 border-b-2 ${
        activeTab === id
          ? "border-green-dark text-green-dark bg-green-950/30"
          : "border-transparent text-green-800 hover:text-green-600 hover:bg-green-950/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black font-jersey15 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">

      {/* ── Scanline ── */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)",
        }}
      />

      {/* ── Corner decorations ── */}
      <div className="fixed top-0 left-0 w-32 h-32 border-r border-b border-green-900/20 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-32 h-32 border-l border-t border-green-900/20 pointer-events-none" />

      {/* ── Logo ── */}
      <button
        onClick={() => navigate("/")}
        className="mb-8 font-workbech text-2xl text-green-dark hover:text-green-500 transition-colors"
      >
        TradeJourney
      </button>

      {/* ── Card ── */}
      <div className="w-full max-w-sm border border-green-900/60 bg-black/90">

        {/* Tab switcher */}
        <div className="flex border-b border-green-900/60">
          {tabBtn("login",    t("login"))}
          {tabBtn("register", t("signup"))}
        </div>

        {/* Tab body */}
        <div className="p-6 sm:p-8">

          {activeTab === "login"
            ? <LoginForm    onSuccess={sendTokenToBackend} />
            : <RegisterForm onSuccess={sendTokenToBackend} />
          }

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-green-900/40" />
            <span className="text-xs text-green-900 tracking-widest">OR</span>
            <div className="flex-1 h-px bg-green-900/40" />
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-green-700/50 text-green-600 bg-black hover:border-green-500 hover:text-green-400 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 488 512" fill="currentColor" aria-hidden="true">
                <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
              </svg>
            )}
            {t("google_login")}
          </button>

          {googleError && (
            <p className="mt-2 text-xs text-red-500 text-center">✗ {googleError}</p>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-green-900/40 px-6 py-3 text-center text-xs text-green-900">
          {activeTab === "login" ? (
            <>
              {t("signup")}?{" "}
              <button
                onClick={() => setActiveTab("register")}
                className="text-green-700 hover:text-green-500 underline transition-colors"
              >
                {t("signup")}
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setActiveTab("login")}
                className="text-green-700 hover:text-green-500 underline transition-colors"
              >
                {t("login")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Back to landing ── */}
      <button
        onClick={() => navigate("/")}
        className="mt-6 text-xs text-green-900 hover:text-green-700 transition-colors flex items-center gap-1"
      >
        <Icon icon="pixelarticons:arrow-left" width={12} />
        Back to home
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Firebase error → human-readable message
══════════════════════════════════════════════════════════════════════ */
function friendlyFirebaseError(code) {
  const map = {
    "auth/invalid-email":            "Invalid email address.",
    "auth/user-not-found":           "No account found with this email.",
    "auth/wrong-password":           "Incorrect password.",
    "auth/email-already-in-use":     "An account with this email already exists.",
    "auth/weak-password":            "Password is too weak.",
    "auth/too-many-requests":        "Too many attempts. Please wait a moment.",
    "auth/network-request-failed":   "Network error. Check your connection.",
    "auth/popup-closed-by-user":     "Sign-in popup was closed.",
    "auth/cancelled-popup-request":  "Another popup is already open.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export default AuthPage;