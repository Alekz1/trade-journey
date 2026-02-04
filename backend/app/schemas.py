from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, List
import datetime

# -----------------------------
# Base config for Decimal
# -----------------------------
class DecimalBase(BaseModel):
    class Config:
        orm_mode = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }

# -----------------------------
# Partial Close Model
# -----------------------------
class PartialClose(DecimalBase):
    exit_price: Decimal
    closed_quantity: Decimal
    fees: Optional[Decimal] = Decimal("0")
    pnl: Optional[Decimal] = None
    timestamp: Optional[datetime.datetime] = None

# -----------------------------
# Trade Models
# -----------------------------
class TradeBase(DecimalBase):
    symbol: str
    side: str
    entry_price: Decimal
    quantity: Decimal
    pnl: Optional[Decimal] = None
    timestamp: Optional[datetime.datetime] = None
    partial_closes: List[PartialClose] = []
    image_url: Optional[str] = None

class TradeCreate(TradeBase):
    pass

class Trade(TradeBase):
    id: int

# -----------------------------
# User Models
# -----------------------------
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    uid: str

    class Config:
        orm_mode = True

# -----------------------------
# User Trade Summary
# -----------------------------
class UserTradeSummary(DecimalBase):
    user_id: str
    total_pnl: Decimal
    winrate: Decimal
    total_trades: int
    sellpercent: Decimal
    class Config:
        orm_mode = True