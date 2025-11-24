import React from 'react';

interface TimezoneSelectorProps {
  selectedTz: string;
  onChange: (tz: string) => void;
}

const timezones = [
  'Local Timezone',
  'Europe/Sofia',
  'America/New_York',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'America/Los_Angeles',
];

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ selectedTz, onChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <select
        id="timezone"
        value={selectedTz}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-3 py-2 text-green-600 border-green-600/60 bg-black shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 h-full"
      >
        {timezones.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
    </div>
  );
};