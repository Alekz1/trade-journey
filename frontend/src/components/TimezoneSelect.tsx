import React from "react";

interface TimezoneSelectorProps {
  selectedTz: string;
  onChange: (tz: string) => void;
}

const timezones = [
  "Local Timezone",
  "Europe/Sofia",
  "America/New_York",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "America/Los_Angeles",
];

/** Returns a short, readable label for each timezone value. */
const tzLabel = (tz: string): string => {
  if (tz === "Local Timezone") return "⏱ Local";
  // "America/New_York" → "New York"
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  return city;
};

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  selectedTz,
  onChange,
}) => (
  <select
    value={selectedTz}
    onChange={(e) => onChange(e.target.value)}
    title="Timezone"
    className="
      border border-green-600/60 text-green-600 bg-black
      px-2 py-1.5 text-sm
      focus:outline-none focus:ring-1 focus:ring-green-500
      /* Full width inside the mobile overflow drawer; constrained in header */
      w-full sm:w-auto sm:max-w-[160px] md:max-w-none
    "
  >
    {timezones.map((tz) => (
      <option key={tz} value={tz}>
        {tzLabel(tz)}
      </option>
    ))}
  </select>
);
