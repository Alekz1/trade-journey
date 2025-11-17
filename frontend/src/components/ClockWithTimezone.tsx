import React, { useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

interface ClockWithTimezoneProps {
  timezone: string;
  format?: string; // Optional format string
}

export const ClockWithTimezone: React.FC<ClockWithTimezoneProps> = ({
    timezone,
    format = 'MMM d, yyyy HH:mm:ss',
}) => {
    if (timezone === 'Local Timezone') {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    const [currentTime, setCurrentTime] = useState<string>(
        formatInTimeZone(new Date(), timezone, format)
    );

    useEffect(() => {
        const interval = setInterval(() => {
        setCurrentTime(formatInTimeZone(new Date(), timezone, format));
        }, 1000);

        return () => clearInterval(interval);
    }, [timezone, format]);

    return (
        <div className="text-green-700 text-xl h-full flex items-center mx-3">
        {currentTime} 
        </div>
    );
};