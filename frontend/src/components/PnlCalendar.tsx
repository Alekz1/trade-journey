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

  // Group trades by date and calculate daily PnL
  const dailyPnl = useMemo(() => {
    const pnlByDate = new Map<string, number>();

    trades.forEach(trade => {
      try {
        const date = parseISO(trade.timestamp);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (pnlByDate.has(dateKey)) {
          pnlByDate.set(dateKey, pnlByDate.get(dateKey)! + (trade.pnl ?? 0));
        } else {
          pnlByDate.set(dateKey, trade.pnl ?? 0);
        }
      } catch (error) {
        console.error("Error parsing trade date:", error);
      }
    });

    return pnlByDate;
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

  return (
    <div className="border border-green-900/60 bg-black p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg text-green-dark">{t("pnl_calendar")}</h3>
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
              className="text-xs border border-green-800 px-2 py-0.5 hover:bg-green-900/20 transition"
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
          const dayPnl = dailyPnl.get(dateKey) ?? 0;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              className={`h-16 p-1 rounded border text-xs flex flex-col justify-center items-center
                ${isCurrentMonth ? getPnlColor(dayPnl) : 'bg-green-950/30 border-green-900/30 text-green-800'}
                ${isToday ? 'ring-1 ring-green-500' : ''}`}
            >
              <div className="font-semibold">{format(day, 'd')}</div>
              {dayPnl !== 0 && (
                <div className={`text-[10px] ${getPnlTextColor(dayPnl)}`}>
                  {dayPnl > 0 ? '+' : ''}{dayPnl.toFixed(2)}
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