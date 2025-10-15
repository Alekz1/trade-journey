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
