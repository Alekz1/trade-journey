import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Trade } from "../services/utils";
import { Icon } from "@iconify/react";

interface PerformanceDashboardProps {
  trades: Trade[];
  timeframe?: 'weekly' | 'monthly' | 'yearly' | 'all';
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ trades, timeframe = 'all' }) => {
  const { t } = useTranslation();

  const { metrics, timePeriods } = useMemo(() => {
    // Filter trades by timeframe
    const now = new Date();
    let filteredTrades = [...trades];

    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredTrades = trades.filter(trade => new Date(trade.timestamp) >= oneWeekAgo);
    } else if (timeframe === 'monthly') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredTrades = trades.filter(trade => new Date(trade.timestamp) >= oneMonthAgo);
    } else if (timeframe === 'yearly') {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filteredTrades = trades.filter(trade => new Date(trade.timestamp) >= oneYearAgo);
    }

    // Calculate metrics
    const winningTrades = filteredTrades.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = filteredTrades.filter(t => (t.pnl ?? 0) < 0);

    const totalPnl = filteredTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const avgPnl = filteredTrades.length > 0 ? totalPnl / filteredTrades.length : 0;

    const totalWinningPnl = winningTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const totalLosingPnl = losingTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

    const avgProfit = winningTrades.length > 0 ? totalWinningPnl / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosingPnl / losingTrades.length : 0;

    const winRate = filteredTrades.length > 0 ? (winningTrades.length / filteredTrades.length) * 100 : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgProfit / avgLoss) : avgProfit > 0 ? Infinity : 0;

    // Calculate metrics by time period for comparison
    const periods = ['current', 'previous'] as const;
    const timePeriods = periods.map(period => {
      const periodStart = period === 'current'
        ? (timeframe === 'weekly' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : timeframe === 'monthly' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000))
        : (timeframe === 'weekly' ? new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          : timeframe === 'monthly' ? new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000));

      const periodEnd = period === 'current' ? now : periodStart;

      const periodTrades = trades.filter(trade => {
        const tradeDate = new Date(trade.timestamp);
        return tradeDate >= periodStart && tradeDate <= periodEnd;
      });

      const periodWinning = periodTrades.filter(t => (t.pnl ?? 0) > 0);
      const periodPnl = periodTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

      return {
        period,
        pnl: periodPnl,
        winRate: periodTrades.length > 0 ? (periodWinning.length / periodTrades.length) * 100 : 0,
        tradeCount: periodTrades.length
      };
    });

    return {
      metrics: {
        totalTrades: filteredTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        totalPnl,
        avgPnl,
        avgProfit,
        avgLoss,
        winRate,
        profitFactor,
        maxWin: Math.max(...filteredTrades.map(t => t.pnl ?? 0), 0),
        maxLoss: Math.min(...filteredTrades.map(t => t.pnl ?? 0), 0)
      },
      timePeriods
    };
  }, [trades, timeframe]);

  const getTimeframeLabel = () => {
    switch(timeframe) {
      case 'weekly': return t('last_7_days');
      case 'monthly': return t('last_30_days');
      case 'yearly': return t('last_year');
      default: return t('all_time');
    }
  };

  return (
    <div className="border border-green-900/60 bg-black p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl text-green-dark font-semibold">{t("performance_dashboard")}</h3>
        <div className="flex gap-2 text-sm">
          {['weekly', 'monthly', 'yearly', 'all'].map(tf => (
            <button
              key={tf}
              onClick={() => timeframe = tf}
              className={`px-3 py-1 rounded transition ${timeframe === tf ? 'bg-green-800 text-white' : 'text-green-400 hover:bg-green-900'}`}
            >
              {tf === 'weekly' ? t('weekly') : tf === 'monthly' ? t('monthly') : tf === 'yearly' ? t('yearly') : t('all_time')}
            </button>
          ))}
        </div>
      </div>

      {/* Time Period Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {timePeriods.map((period, index) => (
          <div key={period.period} className="border border-green-900/40 p-3 rounded">
            <div className="text-xs text-green-600 mb-1">
              {period.period === 'current' ? getTimeframeLabel() : t('previous_period')}
            </div>
            <div className={`text-lg font-bold ${period.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {period.pnl >= 0 ? '+' : ''}{period.pnl.toFixed(2)}
            </div>
            <div className="text-xs text-green-500 mt-1">
              {period.winRate.toFixed(1)}% • {period.tradeCount} {t(period.tradeCount === 1 ? 'trade' : 'trades')}
            </div>
          </div>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 border border-green-900/40 rounded">
          <div className="text-xs text-green-600 mb-2">{t("total_trades")}</div>
          <div className="text-xl font-bold text-green-400">{metrics.totalTrades}</div>
        </div>
        <div className="text-center p-3 border border-green-900/40 rounded">
          <div className="text-xs text-green-600 mb-2">{t("winrate")}</div>
          <div className="text-xl font-bold text-green-400">{metrics.winRate.toFixed(1)}%</div>
        </div>
        <div className="text-center p-3 border border-green-900/40 rounded">
          <div className="text-xs text-green-600 mb-2">{t("total_pnl")}</div>
          <div className={`text-xl font-bold ${metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.totalPnl >= 0 ? '+' : ''}{metrics.totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="text-center p-3 border border-green-900/40 rounded">
          <div className="text-xs text-green-600 mb-2">{t("profit_factor")}</div>
          <div className={`text-xl font-bold ${metrics.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}:1
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="border border-green-900/40 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">{t("avg_pnl_per_trade")}</div>
          <div className={`font-bold ${metrics.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.avgPnl >= 0 ? '+' : ''}{metrics.avgPnl.toFixed(2)}
          </div>
        </div>
        <div className="border border-green-900/40 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">{t("avg_profit_per_trade")}</div>
          <div className="font-bold text-green-400">
            +{metrics.avgProfit.toFixed(2)}
          </div>
        </div>
        <div className="border border-green-900/40 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">{t("avg_loss_per_trade")}</div>
          <div className="font-bold text-red-400">
            {metrics.avgLoss.toFixed(2)}
          </div>
        </div>
        <div className="border border-green-900/40 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">{t("largest_win")}</div>
          <div className="font-bold text-green-400">
            +{metrics.maxWin.toFixed(2)}
          </div>
        </div>
        <div className="border border-green-900/40 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">{t("largest_loss")}</div>
          <div className="font-bold text-red-400">
            {metrics.maxLoss.toFixed(2)}
          </div>
        </div>
        <div className="border border-green-900/40 p-3 rounded md:col-span-2">
          <div className="text-xs text-green-600 mb-1">{t("winning_vs_losing")}</div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-400">{metrics.winningTrades} {t("winning_trades")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-400">{metrics.losingTrades} {t("losing_trades")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;