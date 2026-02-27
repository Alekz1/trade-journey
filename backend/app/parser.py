"""
TradingView CSV Parsers
========================
Two parsers for TradingView paper/live trading exports:

  parse_order_history_csv(source)   - Order History export
  parse_balance_history_csv(source) - Balance History export (recommended)
  detect_and_parse(source)          - Auto-detects which file type was uploaded

Both accept either raw CSV text (str) or a file path (str ending in .csv).
Both return List[TradeRecord] — plain dicts compatible with bulk_import_trades().

Requires: pandas, pydantic
"""

from __future__ import annotations

import io
import re
from collections import defaultdict, deque
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

import pandas as pd

try:
    from pydantic import BaseModel, field_validator, model_validator

    class PartialCloseRecord(BaseModel):
        exit_price: Decimal
        closed_quantity: Decimal
        fees: Decimal = Decimal("0")
        pnl: Decimal
        timestamp: str  # ISO string; DB layer converts to datetime

        model_config = {"arbitrary_types_allowed": True}

    class TradeRecord(BaseModel):
        symbol: str
        side: str                     # "Long" | "Short"
        entry_price: Decimal
        quantity: Decimal
        timestamp: str                # ISO string
        partial_closes: List[PartialCloseRecord] = []

        model_config = {"arbitrary_types_allowed": True}

        @field_validator("side")
        @classmethod
        def validate_side(cls, v: str) -> str:
            if v not in ("Long", "Short"):
                raise ValueError(f"side must be 'Long' or 'Short', got {v!r}")
            return v

        def to_dict(self) -> dict:
            """Return plain dict for bulk_import_trades()."""
            return {
                "symbol": self.symbol,
                "side": self.side,
                "entry_price": self.entry_price,
                "quantity": self.quantity,
                "timestamp": pd.to_datetime(self.timestamp).to_pydatetime(),
                "partial_closes": [
                    {
                        "exit_price":      pc.exit_price,
                        "closed_quantity": pc.closed_quantity,
                        "fees":            pc.fees,
                        "pnl":             pc.pnl,
                        "timestamp":       pd.to_datetime(pc.timestamp).to_pydatetime(),
                    }
                    for pc in self.partial_closes
                ],
            }

except ImportError:
    # Pydantic not installed — fall back to dataclasses (same interface)
    from dataclasses import dataclass, field as dc_field
    import datetime

    @dataclass
    class PartialCloseRecord:
        exit_price: Decimal
        closed_quantity: Decimal
        pnl: Decimal
        fees: Decimal = Decimal("0")
        timestamp: str = ""

    @dataclass
    class TradeRecord:
        symbol: str
        side: str
        entry_price: Decimal
        quantity: Decimal
        timestamp: str
        partial_closes: list = dc_field(default_factory=list)

        def to_dict(self) -> dict:
            return {
                "symbol": self.symbol,
                "side": self.side,
                "entry_price": self.entry_price,
                "quantity": self.quantity,
                "timestamp": pd.to_datetime(self.timestamp).to_pydatetime(),
                "partial_closes": [
                    {
                        "exit_price":      pc.exit_price,
                        "closed_quantity": pc.closed_quantity,
                        "fees":            pc.fees,
                        "pnl":             pc.pnl,
                        "timestamp":       pd.to_datetime(pc.timestamp).to_pydatetime(),
                    }
                    for pc in self.partial_closes
                ],
            }


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

_COMM_RE = re.compile(r"[^\d.\-].*$")


def _to_d(v) -> Decimal:
    return Decimal(str(round(float(v), 8)))


def _parse_commission(raw) -> Decimal:
    s = str(raw or "").strip()
    if not s or s.lower() == "nan":
        return Decimal("0")
    s = _COMM_RE.sub("", s)
    try:
        return Decimal(s)
    except Exception:
        return Decimal("0")


def _open_source(source: str):
    """Return a file-like for either raw text or a file path."""
    if "\n" in source or not source.strip().endswith(".csv"):
        return io.StringIO(source)
    return open(source, newline="", encoding="utf-8-sig")


def _df_to_list(df: pd.DataFrame) -> List[dict]:
    return df.to_dict("records")


# ──────────────────────────────────────────────────────────────────────────────
# CSV type detection
# ──────────────────────────────────────────────────────────────────────────────

def detect_csv_type(source: str) -> str:
    """
    Return 'order' or 'balance' by inspecting the header row.
    Raises ValueError if the file cannot be identified.
    """
    with _open_source(source) as f:
        header = f.readline().strip().lower()

    if "order id" in header or "fill price" in header:
        return "order"
    if "balance before" in header or "realized p" in header:
        return "balance"
    raise ValueError(
        "Cannot determine CSV type. Expected TradingView Order History "
        "or Balance History export."
    )


# ──────────────────────────────────────────────────────────────────────────────
# Auto-detect entry point
# ──────────────────────────────────────────────────────────────────────────────

def detect_and_parse(source: str) -> List[dict]:
    """
    Auto-detect the CSV type and run the appropriate parser.
    Returns list of plain dicts ready for bulk_import_trades().
    """
    csv_type = detect_csv_type(source)
    if csv_type == "order":
        trades = parse_order_history_csv(source)
    else:
        trades = parse_balance_history_csv(source)
    return [t.to_dict() for t in trades]


# ──────────────────────────────────────────────────────────────────────────────
# Parser 1 — Balance History  (recommended, source of truth)
# ──────────────────────────────────────────────────────────────────────────────

_BAL_ACTION_RE = re.compile(
    r"Close (long|short) position for symbol (\S+) at price ([\d.]+) "
    r"for ([\d.]+) units\. Position AVG Price was ([\d.]+)",
    re.IGNORECASE,
)


def parse_balance_history_csv(source: str) -> List[TradeRecord]:
    """
    Parse a TradingView Balance History CSV.

    Each row in the balance history corresponds to one fully-realized P&L event.
    The action text explicitly states 'Close long/short position', giving us:
      - direction (Long / Short)
      - exact exit price
      - position average entry price (may span multiple fill orders)
      - quantity closed
      - realized P&L (TradingView's own calculation)

    Returns List[TradeRecord] sorted oldest → newest.

    Notes
    -----
    * Multi-symbol files are handled correctly.
    * Fees are not present in the balance CSV; pnl is taken directly from
      TradingView's 'Realized P&L (value)' column, which already nets fees.
    """
    with _open_source(source) as f:
        df = pd.read_csv(f, encoding="utf-8-sig")

    df.columns = df.columns.str.strip()
    pnl_col = next(c for c in df.columns if "P" in c and "value" in c.lower())

    df["_ts"] = pd.to_datetime(df["Time"], errors="coerce")
    df[pnl_col] = pd.to_numeric(df[pnl_col], errors="coerce")
    df = df.dropna(subset=["_ts", pnl_col]).copy()

    # Balance history is newest-first; reverse to oldest-first
    df = df.iloc[::-1].reset_index(drop=True)

    trades: List[TradeRecord] = []
    for _, row in df.iterrows():
        m = _BAL_ACTION_RE.search(str(row["Action"]))
        if not m:
            continue

        direction, symbol, close_price, qty, avg_price = m.groups()
        side = "Long" if direction.lower() == "long" else "Short"
        pnl_val = _to_d(row[pnl_col])
        ts = str(row["_ts"])

        pc = PartialCloseRecord(
            exit_price=_to_d(close_price),
            closed_quantity=_to_d(qty),
            fees=Decimal("0"),
            pnl=pnl_val,
            timestamp=ts,
        )
        trade = TradeRecord(
            symbol=symbol,
            side=side,
            entry_price=_to_d(avg_price),
            quantity=_to_d(qty),
            timestamp=ts,
            partial_closes=[pc],
        )
        trades.append(trade)

    return trades


# ──────────────────────────────────────────────────────────────────────────────
# Parser 2 — Order History  (FIFO matching with Order ID tie-breaking)
# ──────────────────────────────────────────────────────────────────────────────

def parse_order_history_csv(source: str) -> List[TradeRecord]:
    """
    Parse a TradingView Order History CSV using FIFO lot matching.

    Key fixes applied vs. the naïve approach:
    1. Sort by (Placing Time, Order ID) — lower Order ID was placed first,
       correctly resolving bracket/OCO orders that share the same timestamp.
    2. Open positions with no matching close in the export window are silently
       excluded from the output (parser only returns fully-closed trades).
    3. Partial closes: each closing order can reduce multiple open lots;
       each consumed lot becomes a PartialCloseRecord on the originating trade.

    ⚠  Limitation: if the export does NOT start from the account's very first
    trade, some early close orders will have no matching open in the file.
    Those orphaned closes will be treated as new position opens (wrong side).
    To avoid this, either:
      a) Export the complete order history from account inception.
      b) Remove the first few close orders that predate the export window.
      c) Use the Balance History parser instead (always correct).

    Returns List[TradeRecord] sorted by entry timestamp, oldest → newest.
    """
    with _open_source(source) as f:
        df = pd.read_csv(f, encoding="utf-8-sig")

    df.columns = df.columns.str.strip()

    # Keep only filled orders
    df = df[df["Status"].str.strip().str.lower() == "filled"].copy()

    df["Fill Price"] = pd.to_numeric(df["Fill Price"], errors="coerce")
    df["Qty"]        = pd.to_numeric(df["Qty"],        errors="coerce")
    df["Order ID"]   = pd.to_numeric(df["Order ID"],   errors="coerce")
    df["Placing Time"] = pd.to_datetime(df["Placing Time"], errors="coerce")
    df = df.dropna(subset=["Fill Price", "Qty", "Placing Time"])

    # ── Fix 1: sort by (timestamp, Order ID) ──────────────────────────────────
    # Same-second bracket orders: lower Order ID = placed first = the ENTRY.
    df = df.sort_values(["Placing Time", "Order ID"]).reset_index(drop=True)

    # ── FIFO matching ──────────────────────────────────────────────────────────
    lot_queues: dict = defaultdict(deque)
    trade_map:  dict = {}
    net_pos:    dict = defaultdict(Decimal)
    _tid = 0

    def _open_lot(symbol, side, fill, qty, comm, ts):
        nonlocal _tid
        _tid += 1
        trade_map[_tid] = {
            "symbol":         symbol,
            "side":           "Long" if side == "buy" else "Short",
            "entry_price":    _to_d(fill),
            "quantity":       _to_d(qty),
            "timestamp":      str(ts),
            "partial_closes": [],
        }
        lot_queues[symbol].append({
            "trade_id":       _tid,
            "side":           side,
            "entry_price":    _to_d(fill),
            "qty_remaining":  _to_d(qty),
            "comm_remaining": _to_d(comm),
        })

    def _close_queue(symbol, close_side, fill, qty_to_close, comm, ts):
        qty_left = _to_d(qty_to_close)
        fp       = _to_d(fill)
        comm_d   = _to_d(comm)
        qtc_d    = _to_d(qty_to_close)
        queue    = lot_queues[symbol]

        while qty_left > Decimal("0.0001") and queue:
            lot    = queue[0]
            closed = min(lot["qty_remaining"], qty_left)
            frac   = closed / lot["qty_remaining"]

            lot_fee = (lot["comm_remaining"] * frac).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            cls_fee = (comm_d * (closed / qtc_d)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            raw = (
                (fp - lot["entry_price"]) * closed
                if lot["side"] == "buy"
                else (lot["entry_price"] - fp) * closed
            )

            trade_map[lot["trade_id"]]["partial_closes"].append({
                "exit_price":      fp,
                "closed_quantity": closed,
                "fees":            lot_fee + cls_fee,
                "pnl":             raw - lot_fee - cls_fee,
                "timestamp":       str(ts),
            })

            lot["qty_remaining"]  -= closed
            lot["comm_remaining"] -= lot_fee
            qty_left              -= closed

            if lot["qty_remaining"] <= Decimal("0.0001"):
                queue.popleft()

        # Reversal: remaining qty opens a new position in the opposite direction
        if qty_left > Decimal("0.0001"):
            rev_comm = comm_d * qty_left / qtc_d
            _open_lot(symbol, close_side, float(fp), float(qty_left), float(rev_comm), ts)
            net_pos[symbol] += qty_left if close_side == "buy" else -qty_left

    for _, row in df.iterrows():
        symbol = str(row["Symbol"]).strip()
        side   = str(row["Side"]).strip().lower()
        qty    = float(row["Qty"])
        fill   = float(row["Fill Price"])
        ts     = row["Placing Time"]
        comm   = float(_parse_commission(row.get("Commission")))

        cur    = net_pos[symbol]
        signed = _to_d(qty) if side == "buy" else -_to_d(qty)

        if cur == Decimal("0"):
            _open_lot(symbol, side, fill, qty, comm, ts)
        elif (cur > 0 and side == "buy") or (cur < 0 and side == "sell"):
            # Adding to existing position
            _open_lot(symbol, side, fill, qty, comm, ts)
        else:
            # Closing (partially or fully)
            closing_qty = min(qty, float(abs(cur)))
            remainder   = qty - closing_qty
            _close_queue(symbol, side, fill, closing_qty, comm, ts)
            if remainder > 0.0001:
                _open_lot(symbol, side, fill, remainder, comm * remainder / qty, ts)

        net_pos[symbol] += signed

    # ── Collect only fully-closed trades ──────────────────────────────────────
    trades: List[TradeRecord] = []
    for t in trade_map.values():
        if not t["partial_closes"]:
            continue
        total_closed = sum(pc["closed_quantity"] for pc in t["partial_closes"])
        if abs(total_closed - t["quantity"]) > Decimal("0.01"):
            continue  # genuinely still open — skip

        partial_close_models = [
            PartialCloseRecord(
                exit_price=pc["exit_price"],
                closed_quantity=pc["closed_quantity"],
                fees=pc["fees"],
                pnl=pc["pnl"],
                timestamp=pc["timestamp"],
            )
            for pc in t["partial_closes"]
        ]

        trades.append(
            TradeRecord(
                symbol=t["symbol"],
                side=t["side"],
                entry_price=t["entry_price"],
                quantity=t["quantity"],
                timestamp=t["timestamp"],
                partial_closes=partial_close_models,
            )
        )

    trades.sort(key=lambda tr: tr.timestamp)
    return trades


# ──────────────────────────────────────────────────────────────────────────────
# CLI demo
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python tv_parsers.py <csv_file> [--order|--balance]")
        sys.exit(1)

    path = sys.argv[1]
    force = sys.argv[2] if len(sys.argv) > 2 else None

    if force == "--order":
        trades = parse_order_history_csv(path)
        label  = "Order History"
    elif force == "--balance":
        trades = parse_balance_history_csv(path)
        label  = "Balance History"
    else:
        detected = detect_csv_type(path)
        trades   = (parse_order_history_csv if detected == "order" else parse_balance_history_csv)(path)
        label    = f"Auto-detected: {detected}"

    total_pnl = sum(
        sum(pc.pnl for pc in t.partial_closes) for t in trades
    )
    longs  = sum(1 for t in trades if t.side == "Long")
    shorts = sum(1 for t in trades if t.side == "Short")

    print(f"\n[{label}]  {len(trades)} trades  |  {longs}L / {shorts}S  |  P&L: {float(total_pnl):+.2f}")
    print("=" * 72)
    for t in trades:
        pnl = sum(pc.pnl for pc in t.partial_closes)
        print(
            f"  {t.timestamp[:16]}  {t.symbol:<18} {t.side:<5}  "
            f"entry={float(t.entry_price):.2f}  qty={float(t.quantity)}  "
            f"closes={len(t.partial_closes)}  pnl={float(pnl):+.2f}"
        )