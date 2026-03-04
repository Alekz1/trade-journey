import { formatInTimeZone } from 'date-fns-tz';

interface PartialClose {
  exit_price:      number;
  closed_quantity: number;
  fees:            number | null;
  pctimestamp:       string | null;
  pnl:             number | null;
}

export type Trade = {
  id?: number;
  symbol: string;
  side: string;
  timestamp: string;
  pnl: number;
  entry_price: number;
  quantity: number;
  partial_closes: PartialClose[];
  image_url?: string | null;
};

export interface FTrade {
  symbol: string;
  side: "buy" | "sell";
  entry_price: number;
  quantity: number;
  pnl: number | null;
  timestamp: string | null;
  partial_closes: {
    exit_price: number;
    closed_quantity: number;
    fees: number | null;
    timestamp: string | null;
    pnl: number | null;
  }[];
  file: File | null;
}



/**
 * Format an ISO-like timestamp that is always meant to be UTC 
 * into the given timezone.
 */
export function formatDate(
  isoString: string | Date | null | undefined, 
  targetTz: string = 'UTC', 
  fmt: string = 'yyyy-MM-dd HH:mm:ss xxx'
): string | null {
  if (!isoString) return null;

  let effectiveTz = targetTz;
  if (effectiveTz === 'Local Timezone') {
    effectiveTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  let date: Date;

  if (isoString instanceof Date) {
    date = isoString;
  } else {
    const s = String(isoString).trim();

    // Check for existing timezone designators (Z or ±HH:mm)
    const hasTz = /[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(s);
    const forced = hasTz ? s : s.replace(' ', 'T') + 'Z'; 
    date = new Date(forced);
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input: ' + String(isoString));
  }

  return formatInTimeZone(date, effectiveTz, fmt);
}