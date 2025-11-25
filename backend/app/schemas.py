from pydantic import BaseModel
from typing import Optional, List
import datetime

# -----------------------------
# Partial Close Model
# -----------------------------
class PartialClose(BaseModel):
    exit_price: float
    closed_quantity: float
    fees: Optional[float] = 0.0
    timestamp: Optional[datetime.datetime] = None
    pnl: Optional[float] = None

    class Config:
        orm_mode = True

# -----------------------------
# Trade Models
# -----------------------------
class TradeBase(BaseModel):
    symbol: str
    side: str
    entry_price: float
    quantity: float
    pnl: Optional[float] = None
    timestamp: Optional[datetime.datetime] = None
    partial_closes: List[PartialClose]
    image_url: Optional[str]

class TradeCreate(TradeBase):
    """Model used when creating a new trade"""
    pass

class Trade(TradeBase):
    """Model returned from DB/API"""
    id: int

    class Config:
        orm_mode = True

class TradeDelete(BaseModel):
    trade_id: int
    user_id: int

# -----------------------------
# User Models
# -----------------------------
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    uid: int

    class Config:
        orm_mode = True

# -----------------------------
# User Trade Summary
# -----------------------------
class UserTradeSummary(BaseModel):
    user_id: str
    total_pnl: float
    winrate: float
    total_trades: int
    sellpercent: float

    class Config:
        orm_mode = True