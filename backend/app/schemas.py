from pydantic import BaseModel
from typing import Optional
import datetime

class TradeBase(BaseModel):
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    quantity: float
    fees: Optional[float] = 0.0
    timestamp: Optional[datetime.datetime] = None

class TradeCreate(TradeBase):
    pass

class Trade(TradeBase):
    id: int
    pnl: float
    timestamp: datetime.datetime

    class Config:
        orm_mode = True


class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    uid: int

    class Config:
        orm_mode = True

class UserTradeSummary(BaseModel):
    user_id: str
    total_pnl: float
    winrate: float
    total_trades: int

    class Config:
        orm_mode = True
class TradeDelete(BaseModel):
    trade_id: int
    user_id: int