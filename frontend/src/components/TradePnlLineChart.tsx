import React from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export type Trade = {
  timestamp: string; // ISO string like "2025-11-01T14:30:00Z"
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
    labels.push(format(new Date(trade.timestamp), 'MMM d, HH:mm')); // changed from trade.date
    pnlData.push(parseFloat(cumulative.toFixed(2)));
  });

  const data = {
    labels,
    datasets: [
      {
        label: '',
        data: pnlData,
        borderColor: '#00920F',
        backgroundColor: 'rgba(34,197,94,0.2)',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
        x: {
            display: false,
        },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number | string) => `$${value}`,
        },
      },
    },
  };

  return <Line data={data} options={options} />;
};
