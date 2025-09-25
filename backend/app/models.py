from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)   # length required
    hashed_password = Column(String(255), nullable=False)

    trades = relationship("Trade", back_populates="owner")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)

    symbol = Column(String(50), index=True)   # specify length
    side = Column(String(10))                 # "buy" / "sell"

    entry_price = Column(DECIMAL(20, 8))
    exit_price = Column(DECIMAL(20, 8))
    quantity = Column(DECIMAL(20, 8))
    fees = Column(DECIMAL(20, 8), default=0)

    pnl = Column(DECIMAL(20, 8))  # profit/loss

    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="trades")
