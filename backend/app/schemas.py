from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, List
import datetime


class DecimalBase(BaseModel):
    class Config:
        orm_mode = True
        json_encoders = {Decimal: lambda v: float(v)}


# ── Journal ────────────────────────────────────────────────────────────────

class JournalCreate(BaseModel):
    name:    str
    content: Optional[str] = None

    class Config:
        orm_mode = True


class Journal(BaseModel):
    id:       int
    name:     str
    content:  Optional[str] = None
    owner_id: str

    class Config:
        orm_mode = True


class JournalTradeSummary(DecimalBase):
    journal_id:   int
    total_pnl:    Decimal
    winrate:      Decimal
    total_trades: int
    sellpercent:  Decimal

    class Config:
        orm_mode = True


# ── Partial Close ──────────────────────────────────────────────────────────

class PartialClose(DecimalBase):
    exit_price:      Decimal
    closed_quantity: Decimal
    fees:            Optional[Decimal] = Decimal("0")
    pnl:             Optional[Decimal] = None
    timestamp:       Optional[datetime.datetime] = None


# ── Trade ──────────────────────────────────────────────────────────────────

class TradeBase(DecimalBase):
    symbol:         str
    side:           str
    entry_price:    Decimal
    quantity:       Decimal
    pnl:            Optional[Decimal] = None
    timestamp:      Optional[datetime.datetime] = None
    partial_closes: List[PartialClose] = []
    image_url:      Optional[str] = None
    jid:            int
    message:        Optional[str] = None          # trade note
    tags:           Optional[List[str]] = None    # e.g. ["breakout", "scalp"]


class TradeCreate(TradeBase):
    pass


class Trade(TradeBase):
    id: int


# ── User ───────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    uid: str

    class Config:
        orm_mode = True


class UserTradeSummary(DecimalBase):
    user_id:      str
    total_pnl:    Decimal
    winrate:      Decimal
    total_trades: int
    sellpercent:  Decimal

    class Config:
        orm_mode = True
