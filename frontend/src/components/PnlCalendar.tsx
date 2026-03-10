import React, { useState, useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
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

  // Group trades by date and calculate daily PnL
  const dailyPnl = useMemo(() => {
    const pnlByDate = new Map<string, number>();
    const tradeCountByDate = new Map<string, number>();

    trades.forEach(trade => {
      try {
        const date = parseISO(trade.timestamp);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (pnlByDate.has(dateKey)) {
          pnlByDate.set(dateKey, pnlByDate.get(dateKey)! + (trade.pnl ?? 0));
          tradeCountByDate.set(dateKey, tradeCountByDate.get(dateKey)! + 1);
        } else {
          pnlByDate.set(dateKey, trade.pnl ?? 0);
          tradeCountByDate.set(dateKey, 1);
        }
      } catch (error) {
        console.error("Error parsing trade date:", error);
      }
    });

    return { pnlByDate, tradeCountByDate };
  }, [trades]);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday as first day
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Calculate total PnL for the current month
  const monthlyPnl = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    return trades.reduce((total, trade) => {
      try {
        const tradeDate = parseISO(trade.timestamp);
        if (tradeDate >= monthStart && tradeDate <= monthEnd) {
          return total + (trade.pnl ?? 0);
        }
        return total;
      } catch (error) {
        return total;
      }
    }, 0);
  }, [trades, currentMonth]);

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return "bg-green-600/20 border-green-500 text-green-400";
    if (pnl < 0) return "bg-red-600/20 border-red-500 text-red-400";
    return "bg-green-900/20 border-green-800 text-green-600";
  };

  const getPnlTextColor = (pnl: number) => {
    if (pnl > 0) return "text-green-400";
    if (pnl < 0) return "text-red-400";
    return "text-green-600";
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

    const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(month);
    setCurrentMonth(newDate);
    setShowMonthSelector(false);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value);
    if (!isNaN(year)) {
      const newDate = new Date(currentMonth);
      newDate.setFullYear(year);
      setCurrentMonth(newDate);
    }
  };

  const handleYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value);
    if (isNaN(year) || year < 2000 || year > 2100) {
      const newDate = new Date(currentMonth);
      e.target.value = newDate.getFullYear().toString();
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.month-selector') && !target.closest('.month-selector-trigger')) {
      setShowMonthSelector(false);
    }
  };

  React.useEffect(() => {
    if (showMonthSelector) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMonthSelector]);

  return (
    <div className="border border-green-900/60 bg-black p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg text-green-dark">{t("pnl_calendar")}</h3>
                    <div className="relative">
            <button
              onClick={() => setShowMonthSelector(!showMonthSelector)}
              className="text-md text-green-400 font-medium hover:text-green-300 transition flex items-center gap-1 month-selector-trigger"
            >
              {t(format(currentMonth, 'MMMM'))} {format(currentMonth, 'yyyy')}
              <Icon icon="pixelarticons:chevron-down" width={14} className="opacity-60" />
            </button>
                        {showMonthSelector && (
              <div className="absolute z-10 mt-2 w-64 bg-black border border-green-800 rounded-md shadow-lg p-3 month-selector">
                <div className="flex justify-center mb-3">
                  <input
                    type="number"
                    defaultValue={currentMonth.getFullYear()}
                    onChange={handleYearChange}
                    onBlur={handleYearBlur}
                    className="w-24 bg-green-900/50 border border-green-700 rounded px-3 py-1.5 text-center text-sm focus:outline-none focus:border-green-500"
                    min="2000"
                    max="2100"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(index)}
                      className={`px-2 py-1.5 rounded transition hover:bg-green-900 
                        ${currentMonth.getMonth() === index ? 'bg-green-800 text-white' : 'text-green-300 hover:text-white'}`}
                    >
                      {t(month)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={handlePrevMonth}
              className="text-green-600 hover:text-green-300 transition p-1"
              title={t("previous_month")}
            >
              <Icon icon="pixelarticons:chevron-left" width={18} />
            </button>
            <button
              onClick={handleNextMonth}
              className="text-green-600 hover:text-green-300 transition p-1"
              title={t("next_month")}
            >
              <Icon icon="pixelarticons:chevron-right" width={18} />
            </button>
            <button
              onClick={handleToday}
              className="text-sm border border-green-800 px-2 py-0.5 hover:bg-green-600/20 transition"
            >
              {t("today")}
            </button>
          </div>
        </div>
        <div className={`text-sm font-semibold ${monthlyPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {t("monthly_pnl")}: {monthlyPnl >= 0 ? '+' : ''}{monthlyPnl.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-xs text-green-700 p-1">{t(day.toLowerCase())}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayPnl = dailyPnl.pnlByDate.get(dateKey) ?? 0;
          const tradeCount = dailyPnl.tradeCountByDate.get(dateKey) ?? 0;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={dateKey}
              className={`h-16 p-1 rounded border text-[15px] flex flex-col justify-center items-center
                ${isCurrentMonth ? getPnlColor(dayPnl) : 'bg-green-950/30 border-green-900/30 text-green-800'}
                ${isToday ? 'ring-1 ring-green-300/80' : ''}`}
            >
              <div className="font-semibold">{format(day, 'd')}</div>
              {dayPnl !== 0 && (
                <div className={`text-[17px] font-medium ${getPnlTextColor(dayPnl)}`}>
                  {dayPnl >= 0 ? '+' : '-'}{Math.abs(dayPnl).toFixed(2)}
                </div>
              )}
              {tradeCount > 0 && (
                <div className="text-[14px] text-green-600">
                  {tradeCount} {t(tradeCount === 1 ? "trade" : "trades")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end text-xs text-green-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600/20 border border-green-500"></div>
            <span>{t("profit")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600/20 border border-red-500"></div>
            <span>{t("loss")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-900/20 border border-green-800"></div>
            <span>{t("no_trades")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PnlCalendar;