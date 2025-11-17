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
    labels.push(format(new Date(trade.timestamp), 'MMM d, HH:mm'));
    winrateData.push(parseFloat(winrate.toFixed(2)));
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Win Rate (%)',
        data: winrateData,
        borderColor: '#00920F', 
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
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
      y: {
        position: 'right',
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: number | string) => `${value}%`,
        },
      },
      x: {
        display: false,
      },
    },
  };

  return <Line data={data} options={options} />;
};