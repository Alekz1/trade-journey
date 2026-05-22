import React, { useState, useMemo } from "react";
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addMonths, subMonths,
  isSameMonth, isSameDay, parseISO,
} from "date-fns";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { Trade } from "../services/utils";

interface PnlCalendarProps {
  trades: Trade[];
  selectedTz: string;
}

const PnlCalendar: React.FC<PnlCalendarProps> = ({ trades, selectedTz }) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const monthSelectorRef = React.useRef<HTMLDivElement>(null);

  // ── Aggregate trades by date ─────────────────────────────────────────────
  const dailyPnl = useMemo(() => {
    const pnlByDate = new Map<string, number>();
    const tradeCountByDate = new Map<string, number>();

    trades.forEach((trade) => {
      try {
        const date = parseISO(trade.timestamp);
        const key = format(date, "yyyy-MM-dd");
        pnlByDate.set(key, (pnlByDate.get(key) ?? 0) + (trade.pnl ?? 0));
        tradeCountByDate.set(key, (tradeCountByDate.get(key) ?? 0) + 1);
      } catch {
        // skip malformed timestamps
      }
    });

    return { pnlByDate, tradeCountByDate };
  }, [trades]);

  // ── Calendar grid ────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // ── Monthly total ────────────────────────────────────────────────────────
  const monthlyPnl = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return trades.reduce((total, trade) => {
      try {
        const d = parseISO(trade.timestamp);
        return d >= monthStart && d <= monthEnd ? total + (trade.pnl ?? 0) : total;
      } catch {
        return total;
      }
    }, 0);
  }, [trades, currentMonth]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getPnlColor = (pnl: number) =>
    pnl > 0
      ? "bg-green-600/20 border-green-500 text-green-400"
      : pnl < 0
      ? "bg-red-600/20 border-red-500 text-red-400"
      : "bg-green-900/20 border-green-800 text-green-600";

  const getPnlTextColor = (pnl: number) =>
    pnl > 0 ? "text-green-400" : pnl < 0 ? "text-red-400" : "text-green-600";

  // ── Month-selector close-on-outside-click ────────────────────────────────
  React.useEffect(() => {
    if (!showMonthSelector) return;
    const handler = (e: MouseEvent) => {
      if (!monthSelectorRef.current?.contains(e.target as Node)) {
        setShowMonthSelector(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMonthSelector]);

  const handleMonthSelect = (month: number) => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(month);
      return d;
    });
    setShowMonthSelector(false);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value);
    if (!isNaN(year)) {
      setCurrentMonth((prev) => {
        const d = new Date(prev);
        d.setFullYear(year);
        return d;
      });
    }
  };

  const handleYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value);
    if (isNaN(year) || year < 2000 || year > 2100) {
      e.target.value = currentMonth.getFullYear().toString();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="border border-green-900/60 bg-black p-2 sm:p-4">

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3 sm:mb-4">

        {/* Left: title + month/year picker + nav */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h3 className="text-base sm:text-lg text-green-dark whitespace-nowrap">
            {t("pnl_calendar")}
          </h3>

          {/* Month/year button + popover */}
          <div className="relative" ref={monthSelectorRef}>
            <button
              onClick={() => setShowMonthSelector((v) => !v)}
              className="text-sm sm:text-md text-green-400 font-medium hover:text-green-300 transition flex items-center gap-1"
            >
              {t(format(currentMonth, "MMMM"))} {format(currentMonth, "yyyy")}
              <Icon icon="pixelarticons:chevron-down" width={12} className="opacity-60" />
            </button>

            {showMonthSelector && (
              <div className="absolute z-20 mt-2 w-60 sm:w-64 bg-black border border-green-800 shadow-lg p-3">
                <div className="flex justify-center mb-3">
                  <input
                    type="number"
                    defaultValue={currentMonth.getFullYear()}
                    onChange={handleYearChange}
                    onBlur={handleYearBlur}
                    className="w-24 bg-green-900/50 border border-green-700 px-3 py-1.5
                               text-center text-sm focus:outline-none focus:border-green-500"
                    min="2000"
                    max="2100"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-sm">
                  {[
                    "January","February","March","April","May","June",
                    "July","August","September","October","November","December",
                  ].map((month, i) => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(i)}
                      className={`px-1 py-1.5 transition hover:bg-green-900
                        ${currentMonth.getMonth() === i
                          ? "bg-green-800 text-white"
                          : "text-green-300 hover:text-white"}`}
                    >
                      {t(month)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next / Today */}
          <div className="flex items-center gap-0.5 sm:gap-1 text-sm">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="text-green-600 hover:text-green-300 transition p-1"
              title={t("previous_month")}
            >
              <Icon icon="pixelarticons:chevron-left" width={16} />
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="text-green-600 hover:text-green-300 transition p-1"
              title={t("next_month")}
            >
              <Icon icon="pixelarticons:chevron-right" width={16} />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs border border-green-800 px-2 py-0.5 hover:bg-green-600/20 transition"
            >
              {t("today")}
            </button>
          </div>
        </div>

        {/* Right: monthly P&L total */}
        <div className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${monthlyPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {t("monthly_pnl")}: {monthlyPnl >= 0 ? "+" : ""}{monthlyPnl.toFixed(2)}
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center mb-1 sm:mb-2">
        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
          <div key={d} className="text-[9px] sm:text-xs text-green-700 py-0.5 sm:p-1 uppercase tracking-wide">
            {/* Full name on sm+, first letter only on xs */}
            <span className="hidden sm:inline">{t(d)}</span>
            <span className="sm:hidden">{t(d).charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPnl = dailyPnl.pnlByDate.get(key) ?? 0;
          const count = dailyPnl.tradeCountByDate.get(key) ?? 0;
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={`
                /* Mobile: compact square; sm+: taller with more info */
                h-10 sm:h-16
                p-0.5 sm:p-1
                border flex flex-col items-center justify-center
                text-[10px] sm:text-[12px]
                ${inMonth ? getPnlColor(dayPnl) : "bg-green-950/30 border-green-900/30 text-green-800"}
                ${isToday ? "ring-1 ring-green-300/80" : ""}
              `}
            >
              {/* Date number */}
              <div className="font-semibold leading-none">{format(day, "d")}</div>

              {/* P&L amount — hidden on mobile for zero or when not in month */}
              {dayPnl !== 0 && inMonth && (
                <div className={`leading-none mt-0.5 font-medium ${getPnlTextColor(dayPnl)}
                  /* On mobile show abbreviated value; full on sm+ */
                  text-[8px] sm:text-[11px]`}
                >
                  {dayPnl >= 0 ? "+" : "-"}
                  <span className="sm:hidden">{Math.abs(dayPnl) >= 1000
                    ? `${(Math.abs(dayPnl) / 1000).toFixed(1)}k`
                    : Math.abs(dayPnl).toFixed(0)}
                  </span>
                  <span className="hidden sm:inline">{Math.abs(dayPnl).toFixed(2)}</span>
                </div>
              )}

              {/* Trade count — hidden on mobile entirely */}
              {count > 0 && inMonth && (
                <div className="hidden sm:block text-[11px] text-green-600 leading-none mt-0.5">
                  {count} {t(count === 1 ? "trade" : "trades")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 sm:mt-3 flex justify-end text-[10px] sm:text-xs text-green-700">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-600/20 border border-green-500" />
            <span>{t("profit")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-600/20 border border-red-500" />
            <span>{t("loss")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-900/20 border border-green-800" />
            <span>{t("no_trades")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PnlCalendar;
