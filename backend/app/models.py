from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base
import datetime

# -----------------------------
# User Model
# -----------------------------
class User(Base):
    __tablename__ = "users"

    uid = Column(String(128), primary_key=True, index=True)  # Firebase UID
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    totalpnl = Column(DECIMAL(20, 8), default=0)

    trades = relationship("Trade", back_populates="owner")
    summary = relationship("UserTradeSummary", back_populates="user", uselist=False)

# -----------------------------
# Trade Model
# -----------------------------
class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)

    symbol = Column(String(50), index=True)   # e.g. "AAPL", "BTCUSDT"
    side = Column(String(10))                 # "buy" / "sell"

    entry_price = Column(DECIMAL(20, 8))
    quantity = Column(DECIMAL(20, 8))

    pnl = Column(DECIMAL(20, 8))  # aggregated profit/loss across closures

    timestamp = Column(DateTime, default=datetime.datetime.now(datetime.UTC))

    image_url = Column(String(512), nullable=True)

    owner_id = Column(String(128), ForeignKey("users.uid"))
    owner = relationship("User", back_populates="trades")

    # Relationship to closures
    partial_closes = relationship("TradeClosure", back_populates="trade", cascade="all, delete-orphan")
    

# -----------------------------
# Trade Closure Model
# -----------------------------
class TradeClosure(Base):
    __tablename__ = "trade_closures"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False)

    exit_price = Column(DECIMAL(20, 8), nullable=False)
    closed_quantity = Column(DECIMAL(20, 8), nullable=False)
    fees = Column(DECIMAL(20, 8), default=0)
    pnl = Column(DECIMAL(20, 8))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    trade = relationship("Trade", back_populates="partial_closes")

# -----------------------------
# User Trade Summary
# -----------------------------
class UserTradeSummary(Base):
    __tablename__ = "user_trade_summary"

    user_id = Column(String(128), ForeignKey("users.uid"), primary_key=True)
    total_pnl = Column(DECIMAL(20, 8), default=0)
    winrate = Column(DECIMAL(5, 2), default=0)
    total_trades = Column(Integer, default=0)
    sellpercent = Column(DECIMAL(5, 2), default=0)

    user = relationship("User", back_populates="summary")