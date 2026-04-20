import React, { useMemo } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { Trade } from "../services/utils";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface AveragePnlChartProps {
  trades: Trade[];
}

const AveragePnlChart: React.FC<AveragePnlChartProps> = ({ trades }) => {
  const { t } = useTranslation();

    const { winningTrades, losingTrades, avgProfit, avgLoss, winRate, profitLossRatio } = useMemo(() => {
    const winning = trades.filter(t => (t.pnl ?? 0) > 0);
    const losing = trades.filter(t => (t.pnl ?? 0) < 0);

    const totalWinningPnl = winning.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const totalLosingPnl = losing.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

    const calculatedAvgProfit = winning.length > 0 ? totalWinningPnl / winning.length : 0;
    const calculatedAvgLoss = losing.length > 0 ? totalLosingPnl / losing.length : 0;
    const calculatedProfitLossRatio = calculatedAvgLoss !== 0 
      ? Math.abs(calculatedAvgProfit / calculatedAvgLoss)
      : calculatedAvgProfit > 0 ? Infinity : 0;

    return {
      winningTrades: winning.length,
      losingTrades: losing.length,
      avgProfit: calculatedAvgProfit,
      avgLoss: calculatedAvgLoss,
      winRate: trades.length > 0 ? (winning.length / trades.length) * 100 : 0,
      profitLossRatio: calculatedProfitLossRatio
    };
  }, [trades]);

  const chartData = {
    labels: [t("winning_trades"), t("losing_trades")],
    datasets: [
      {
        data: [winningTrades, losingTrades],
        backgroundColor: [
          "rgba(34, 197, 94, 0.7)",  // bg-green-500 with opacity (Tailwind green-500)
          "rgba(220, 38, 38, 0.7)"   // bg-red-600 with opacity (Tailwind red-600)
        ],
        borderColor: [
          "#22c55e",    // bg-green-500 (Tailwind green-500)
          "#dc2626"     // bg-red-600 (Tailwind red-600)
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#16a34a", // green-600
          font: {
            size: 12,
            family: "'Jersey15', sans-serif"
          },
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: '#000',
        borderColor: '#22c55e',
        borderWidth: 1,
        titleColor: '#22c55e',
        bodyColor: '#86efac',
        callbacks: {
          label: function(context: any) {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (trades.length === 0) {
    return (
      <div className="border border-green-900/60 bg-black p-4 flex flex-col h-full">
        <h3 className="text-lg text-green-dark mb-4">{t("trade_performance")}</h3>
        <div className="flex-1 flex items-center justify-center text-green-700 text-sm opacity-40">
          {t("no_trades")}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-900/60 bg-black p-4 flex flex-col h-full">
      <h3 className="text-lg text-green-dark mb-4">{t("trade_performance")}</h3>

            <div className="flex-1 min-h-[220px] mb-6 relative">
        <Pie data={chartData} options={chartOptions} />
      </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
        {/* Average Profit */}
        <div className="text-center p-2">
          <div className="text-sm text-green-300 mb-2 font-medium">{t("avg_profit_per_trade")}</div>
          <div className={`text-2xl font-bold ${avgProfit > 0 ? 'text-green-400' : 'text-green-500'}`}>
            {avgProfit > 0 ? '+' : ''}{avgProfit.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            ({winningTrades} {t("winning_trades")})
          </div>
        </div>

        {/* Profit/Loss Ratio */}
        <div className="text-center p-2">
          <div className="text-sm text-green-300 mb-2 font-medium">{t("avg_profit_loss_ratio")}</div>
          <div className={`text-2xl font-bold ${profitLossRatio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
            {profitLossRatio === Infinity ? '∞' : profitLossRatio.toFixed(2)}:1
          </div>
        </div>

        {/* Average Loss */}
        <div className="text-center p-2">
          <div className="text-sm text-green-300 mb-2 font-medium">{t("avg_loss_per_trade")}</div>
          <div className={`text-2xl font-bold ${avgLoss < 0 ? 'text-red-400' : 'text-green-500'}`}>
            {avgLoss.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            ({losingTrades} {t("losing_trades")})
          </div>
        </div>
      </div>
    </div>
  );
};

export default AveragePnlChart;