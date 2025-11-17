interface DualProgressBarProps {
  leftPercent?: number;       // Optional: % for left side
  rightPercent?: number;      // Optional: % for right side
  reverse?: boolean;          // Optional: flip color order
  leftColor?: string;         // Tailwind class, default: 'bg-blue-500'
  rightColor?: string;        // Tailwind class, default: 'bg-amber-500'
}

export const DualProgressBar = ({
  leftPercent,
  rightPercent,
  reverse = false,
  leftColor = 'bg-blue-500',
  rightColor = 'bg-amber-500',
}: DualProgressBarProps) => {
  const left = leftPercent ?? (rightPercent !== undefined ? 100 - rightPercent : 50);
  const right = 100 - left;

  const leftClass = reverse ? rightColor : leftColor;
  const rightClass = reverse ? leftColor : rightColor;

  return (
    <div className="w-full h-4 bg-gray-200 rounded overflow-hidden">
      <div className="flex h-full">
        <div className={`${leftClass}`} style={{ width: `${left}%` }} />
        <div className={`${rightClass}`} style={{ width: `${right}%` }} />
      </div>
    </div>
  );
};