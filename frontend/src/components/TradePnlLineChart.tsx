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

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

export type Trade = {
  timestamp: string;
  pnl: number;
};

interface TradeLineChartProps {
  trades: Trade[];
}

export const TradeLineChart: React.FC<TradeLineChartProps> = ({ trades }) => {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let cumulative = 0;
  const labels: string[] = [];
  const pnlData: number[] = [];

  sortedTrades.forEach((trade) => {
    cumulative += trade.pnl;
    labels.push(format(new Date(trade.timestamp), 'MMM d'));
    pnlData.push(parseFloat(cumulative.toFixed(2)));
  });

  const isPositive = cumulative >= 0;
  const lineColor = isPositive ? '#00920F' : '#dc2626';
  const fillColor = isPositive ? 'rgba(0,146,15,0.1)' : 'rgba(220,38,38,0.1)';

  const data = {
    labels,
    datasets: [
      {
        label: '',
        data: pnlData,
        borderColor: lineColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 1.5,
      },
    ],
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
          label: (ctx) => ` $${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(2) : '0.00'}`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        display: true,
        beginAtZero: false,
        grid: { color: 'rgba(0,146,15,0.08)' },
        ticks: {
          color: '#00920F',
          font: { size: 10 },
          callback: (value) => `$${Number(value).toFixed(0)}`,
          maxTicksLimit: 6,
        },
        border: { display: false },
      },
    },
    animation: { duration: 300 },
  };

  if (!sortedTrades.length) {
    return (
      <div className="flex items-center justify-center h-full text-green-700 text-sm opacity-40">
        no data
      </div>
    );
  }

  return <Line data={data} options={options} />;
};