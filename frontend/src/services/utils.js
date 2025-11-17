// npm: date-fns and date-fns-tz
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format an ISO-like timestamp that is always meant to be UTC (even if it lacks "Z")
 * into the given timezone.
 *
 * @param {string|Date} isoString - e.g. "2025-11-17T09:16:17" (always UTC)
 * @param {string} targetTz - IANA timezone, e.g. "Europe/Sofia" or "UTC"
 * @param {string} fmt - optional date-fns format string
 */
export function formatDate(isoString, targetTz = 'UTC', fmt = 'yyyy-MM-dd HH:mm:ss xxx') {
    if(targetTz == 'Local Timezone'){
        targetTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  if (!isoString) return null;

  // If a Date is passed, assume it's already the correct instant
  let date;
  if (isoString instanceof Date) {
    date = isoString;
  } else {
    const s = String(isoString).trim();

    // If string already contains a timezone designator (Z or ±HH or ±HH:MM) parse as-is
    const hasTz = /[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(s);
    const forced = hasTz ? s : s.replace(' ', 'T') + 'Z'; // append Z to force UTC
    date = new Date(forced);
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input: ' + isoString);
  }

  // formatInTimeZone will interpret `date` as the instant and display it in targetTz
  return formatInTimeZone(date, targetTz, fmt);
}
