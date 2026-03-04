import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

interface WinrateProps {
  /** Raw win-rate value 0–100 (may arrive as string due to Decimal serialisation) */
  winrate: number | string;
  /** Optional: previous value to compute a trend arrow */
  previousWinrate?: number | string;
}

const Winrate: React.FC<WinrateProps> = ({ winrate, previousWinrate }) => {
  const { t } = useTranslation();

  // ── Normalise — same fix as TradePnL: toFixed() returns a string,
  //    so comparison against number 0 always fails in the original ─────────
  const value   = parseFloat(String(winrate ?? 0));
  const prevVal = previousWinrate !== undefined ? parseFloat(String(previousWinrate)) : null;

  // ── Colour bands ─────────────────────────────────────────────────────────
  //    ≥ 60 %  → green  (good)
  //    40–59 % → amber  (neutral)
  //    < 40 %  → red    (poor)
  const valueCls =
    value >= 60 ? "text-green-500" :
    value >= 40 ? "text-yellow-500" :
    value >  0  ? "text-red-500"   :
                  "text-green-900";

  // Trend
  const trend =
    prevVal !== null && !isNaN(prevVal)
      ? value > prevVal ? "up" : value < prevVal ? "down" : "flat"
      : null;

  const trendIcon =
    trend === "up"   ? "pixelarticons:arrow-up"   :
    trend === "down" ? "pixelarticons:arrow-down" :
                       "pixelarticons:dash";

  const trendCls =
    trend === "up"   ? "text-green-500" :
    trend === "down" ? "text-red-500"   :
                       "text-green-900";

  // Quality label
  const qualityLabel =
    value >= 60 ? "GOOD" :
    value >= 40 ? "NEUTRAL" :
    value >  0  ? "NEEDS WORK" :
                  "—";

  const qualityCls =
    value >= 60 ? "text-green-800 border-green-900/40" :
    value >= 40 ? "text-yellow-800 border-yellow-900/40" :
    value >  0  ? "text-red-900 border-red-900/40" :
                  "text-green-950 border-green-950";

  return (
    <div className="p-4">
      {/* Label row */}
      <div className="flex items-center gap-1.5 mb-1">
        <Icon icon="pixelarticons:chart-area-line" width={16} className="text-green-dark" />
        <h2 className="text-xs text-green-800 uppercase tracking-widest">{t("winrate")}</h2>
      </div>

      {/* Value row */}
      <div className="flex items-end gap-2">
        <p className={`text-2xl font-bold font-workbech tabular-nums ${valueCls}`}>
          {value.toFixed(1)}%
        </p>

        {/* Trend indicator */}
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs mb-1 ${trendCls}`}>
            <Icon icon={trendIcon} width={12} />
          </span>
        )}

        {/* Quality badge */}
        {value > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 border mb-1 tracking-widest ${qualityCls}`}>
            {qualityLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default Winrate;
