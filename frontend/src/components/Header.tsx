import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

import JournalSelector, { Journal } from "./JournalSelector";
import { TimezoneSelector } from "./TimezoneSelect";
import { LanguageSelector } from "./LanguageSelector";
import LoginSignupButton from "./LoginSignupButton";
import LogoutButton from "./LogoutButton";
import {ClockWithTimezone} from "./ClockWithTimezone"; // adjust import path as needed

interface HeaderProps {
  isLoggedIn: boolean;
  selectedJournal: Journal | null;
  selectedTz: string;
  handleJournalChange: (journal: Journal) => void;
  handleTimezoneChange: (tz: string) => void;
  setIsJournalsLoaded: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  selectedJournal,
  selectedTz,
  handleJournalChange,
  handleTimezoneChange,
  setIsJournalsLoaded,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close the overflow menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  // Close overflow menu on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [isLoggedIn]);

  return (
    <header className="fixed top-0 inset-x-0 h-14 sm:h-16 border-b border-green-900/60 z-50 bg-black flex items-center justify-between px-3 sm:px-4 gap-2">

      {/* ── Logo ─────────────────────────────────────────────── */}
      <p
        className="text-xl sm:text-4xl text-green-dark font-workbech px-1 cursor-pointer shrink-0 leading-none"
        onClick={() => navigate("/")}
      >
        TradeJourney
      </p>

      {/* ── Right-side controls ──────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">

        {/* New Trade — icon-only on xs, icon+text on sm+ */}
        <button
          onClick={() => navigate("/trades")}
          title={t("new_trade")}
          className="flex items-center gap-1.5 border border-green-600/60 px-2 sm:px-4 py-1.5
                     text-sm bg-green-500 text-black hover:bg-green-600 hover:text-gray-300 transition shrink-0"
        >
          <Icon icon="pixelarticons:plus-box" width={16} className="shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{t("new_trade")}</span>
        </button>

        {/* Journal selector — visible when logged in */}
        {isLoggedIn && (
          <JournalSelector
            selectedJournalId={selectedJournal?.id ?? null}
            onJournalChange={handleJournalChange}
            onLoaded={() => setTimeout(() => setIsJournalsLoaded(true), 10)}
          />
        )}

        {/* Clock — hidden on mobile, visible sm+ */}
        <div className="hidden md:block shrink-0">
          <ClockWithTimezone timezone={selectedTz} />
        </div>

        {/* Timezone + Language — visible on sm+, hidden on xs (moved to overflow menu) */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <TimezoneSelector selectedTz={selectedTz} onChange={handleTimezoneChange} />
          <LanguageSelector />
        </div>

        {/* Auth button — always visible */}
        <div className="shrink-0">
          {!isLoggedIn ? <LoginSignupButton /> : <LogoutButton />}
        </div>

        {/* ── Overflow menu trigger (mobile only) ─────────────── */}
        <div ref={moreRef} className="relative sm:hidden shrink-0">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex items-center justify-center w-8 h-8 border transition
              ${moreOpen
                ? "border-green-600 text-green-400 bg-green-950/30"
                : "border-green-900/60 text-green-600 hover:border-green-600/70"
              }`}
            aria-label="More options"
            aria-expanded={moreOpen}
          >
            <Icon icon={moreOpen ? "pixelarticons:close" : "pixelarticons:menu"} width={16} />
          </button>

          {moreOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] w-56 border border-green-900/60
                         bg-black shadow-2xl shadow-black/80 z-[99999] p-3 flex flex-col gap-3"
            >
              {/* Clock in drawer */}
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Icon icon="pixelarticons:clock" width={14} className="shrink-0" />
                <ClockWithTimezone timezone={selectedTz} />
              </div>

              {/* Timezone */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-green-800">
                  {t("timezone") ?? "Timezone"}
                </span>
                <TimezoneSelector
                  selectedTz={selectedTz}
                  onChange={(tz) => {
                    handleTimezoneChange(tz);
                    setMoreOpen(false);
                  }}
                />
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-green-800">
                  {t("language") ?? "Language"}
                </span>
                <LanguageSelector />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;