interface DualProgressBarProps {
  leftPercent?: number;
  rightPercent?: number;
  reverse?: boolean;
  leftColor?: string;
  rightColor?: string;
  height?: string;
}

export const DualProgressBar = ({
  leftPercent,
  rightPercent,
  reverse = false,
  leftColor = 'bg-blue-500',
  rightColor = 'bg-amber-500',
  height = 'h-3',
}: DualProgressBarProps) => {
  const left = leftPercent ?? (rightPercent !== undefined ? 100 - rightPercent : 50);
  const right = 100 - left;

  const leftClass = reverse ? rightColor : leftColor;
  const rightClass = reverse ? leftColor : rightColor;

  return (
    // FIX: bg-green-950/40 instead of bg-gray-200 so track is visible on dark theme
    <div className={`w-full ${height} bg-green-950/40 border border-green-900/40 rounded overflow-hidden`}>
      <div className="flex h-full">
        <div
          className={`${leftClass} transition-all duration-500`}
          style={{ width: `${left}%` }}
        />
        <div
          className={`${rightClass} transition-all duration-500`}
          style={{ width: `${right}%` }}
        />
      </div>
    </div>
  );
};