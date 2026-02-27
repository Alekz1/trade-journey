import React from 'react';
import { Icon } from '@iconify/react';

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
    // FIX: removed flex-col wrapper that was breaking height alignment in header
    <select
      value={selectedTz}
      onChange={(e) => onChange(e.target.value)}
      className="border border-green-600/60 text-green-600 bg-black px-2 py-1.5 text-sm
                 focus:outline-none focus:ring-1 focus:ring-green-500 rounded
                 max-w-[90px] sm:max-w-[140px] md:max-w-none"
      title="Timezone"
    >
      {timezones.map((tz) => (
        <option key={tz} value={tz}>
          {/* Shorten display names for mobile */}
          {tz === 'Local Timezone' ? '⏱ Local' : tz}
        </option>
      ))}
    </select>
  );
};