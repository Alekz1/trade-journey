import React from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import {
  ScriptableLineSegmentContext,
  ChartData,
  ChartDataset
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

export type Trade = {
  timestamp: string;
  pnl: number;
};

interface WinrateLineChartProps {
  trades: Trade[];
}

export const WinrateLineChart: React.FC<WinrateLineChartProps> = ({ trades }) => {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let wins = 0;
  const labels: string[] = [];
  const winrateData: number[] = [];

  sorted.forEach((trade, index) => {
    if (trade.pnl > 0) wins++;
    const winrate = (wins / (index + 1)) * 100;
    labels.push(format(new Date(trade.timestamp), 'MMM d'));
    winrateData.push(parseFloat(winrate.toFixed(2)));
  });

  const lastWinrate = winrateData[winrateData.length - 1] ?? 0;
  const lineColor = lastWinrate >= 50 ? '#00920F' : '#f59e0b';
  const fillColor = lastWinrate >= 50 ? 'rgba(0,146,15,0.1)' : 'rgba(245,158,11,0.1)';
  const filteredWinrateData = winrateData.map(v => (v === 0 ? null : v));

  type LineSegmentCtx = {
    p0: { parsed: { y: number } };
    p1: { parsed: { y: number } };
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Win Rate',
        data: winrateData,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 1.5,

        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) => {
            const y = ctx.p1.parsed.y ?? 0;

            if (y < 50) return '#dc2626';        // red
            if (y < 55) return '#facc15';        // yellow
            return '#16a34a';                    // green
          },

          backgroundColor: (ctx: ScriptableLineSegmentContext) => {
            const y = ctx.p1.parsed.y ?? 0;

            if (y < 50) return 'rgba(220,38,38,0.1)';
            if (y < 55) return 'rgba(250,204,21,0.1)';
            return 'rgba(22,163,74,0.1)';
          }
        }

      }
    ]
  };


  const options: ChartOptions<'line'> = {
    responsive: true,
    // FIX: must be false so the chart respects the container's explicit height
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#000',
        borderColor: '#00920F',
        borderWidth: 1,
        titleColor: '#00920F',
        bodyColor: '#86efac',
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) : '0.0'}%`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        position: 'right',
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(0,146,15,0.08)' },
        ticks: {
          color: '#00920F',
          font: { size: 10 },
          callback: (value) => `${value}%`,
          maxTicksLimit: 6,
        },
        border: { display: false },
      },
    },
    animation: { duration: 300 },
  }; 

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-full text-green-700 text-sm opacity-40">
        no data
      </div>
    );
  }

  return <Line data={data} options={options} />;
};