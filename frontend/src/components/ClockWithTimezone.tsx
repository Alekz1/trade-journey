import React, { useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

interface ClockWithTimezoneProps {
  timezone: string;
  format?: string;
}

export const ClockWithTimezone: React.FC<ClockWithTimezoneProps> = ({
  timezone,
  format = 'MMM d, HH:mm:ss',
}) => {
  const resolvedTz =
    timezone === 'Local Timezone'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : timezone;

  const [currentTime, setCurrentTime] = useState<string>(
    formatInTimeZone(new Date(), resolvedTz, format)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatInTimeZone(new Date(), resolvedTz, format));
    }, 1000);
    return () => clearInterval(interval);
  }, [resolvedTz, format]);

  return (
    <div className="flex items-center text-green-700 tabular-nums whitespace-nowrap">
      {/* Full format on md+, short HH:mm on small */}
      <span className="hidden md:inline text-sm">{currentTime}</span>
      <span className="md:hidden text-xs">
        {formatInTimeZone(new Date(), resolvedTz, 'HH:mm')}
      </span>
    </div>
  );
};