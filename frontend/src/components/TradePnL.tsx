import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface TradePnLProps {
  /** Raw numeric P&L from the server (may arrive as string due to Decimal serialisation) */
  userPnl: number | string;
  /** Optional: previous value to compute a trend arrow */
  previousPnl?: number | string;
}

const TradePnL: React.FC<TradePnLProps> = ({ userPnl, previousPnl }) => {
  const { t } = useTranslation();

  // ── Normalise to number — fixes the original bug where toFixed() returned a
  //    string and `=== 0` never matched ─────────────────────────────────────
  const value   = parseFloat(String(userPnl ?? 0));
  const prevVal = previousPnl !== undefined ? parseFloat(String(previousPnl)) : null;

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero     = !isPositive && !isNegative;

  const valueCls = isPositive
    ? "text-green-500"
    : isNegative
    ? "text-red-500"
    : "text-green-900";

  // Trend vs previous snapshot
  const trend =
    prevVal !== null && !isNaN(prevVal)
      ? value > prevVal
        ? "up"
        : value < prevVal
        ? "down"
        : "flat"
      : null;

  const trendIcon =
    trend === "up"   ? "pixelarticons:arrow-up"   :
    trend === "down" ? "pixelarticons:arrow-down" :
                       "pixelarticons:dash";

  const trendCls =
    trend === "up"   ? "text-green-500" :
    trend === "down" ? "text-red-500"   :
                       "text-green-900";

  return (
    <div className="p-4">
      {/* Label row */}
      <div className="flex items-center gap-1.5 mb-1">
        <Icon icon="pixelarticons:chart-line" width={16} className="text-green-dark" />
        <h2 className="text-xs text-green-800 uppercase tracking-widest">{t("pnlsum")}</h2>
      </div>

      {/* Value row */}
      <div className="flex items-end gap-2">
        <p className={`text-2xl font-bold font-workbech tabular-nums ${valueCls}`}>
          {isPositive ? "+" : ""}{value.toFixed(2)}$
        </p>

        {/* Trend indicator */}
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs mb-1 ${trendCls}`}>
            <Icon icon={trendIcon} width={12} />
          </span>
        )}
      </div>
    </div>
  );
};

export default TradePnL;
