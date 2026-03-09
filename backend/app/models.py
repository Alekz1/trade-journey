from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, func, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    uid        = Column(String(128), primary_key=True, index=True)
    email      = Column(String(255), unique=True, index=True, nullable=False)
    name       = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    totalpnl   = Column(DECIMAL(20, 8), default=0)

    journals = relationship("Journal", back_populates="owner")
    trades   = relationship("Trade", back_populates="owner")
    summary  = relationship("UserTradeSummary", back_populates="user", uselist=False)


class Trade(Base):
    __tablename__ = "trades"

    id          = Column(Integer, primary_key=True, index=True)
    symbol      = Column(String(50), index=True)
    side        = Column(String(10))
    entry_price = Column(DECIMAL(20, 8))
    quantity    = Column(DECIMAL(20, 8))
    pnl         = Column(DECIMAL(20, 8))
    timestamp   = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    image_url   = Column(String(512), nullable=True)

    # New fields
    message     = Column(Text, nullable=True)           # free-text note on the trade
    tags        = Column(JSON, nullable=True)            # list of string tags, e.g. ["breakout","FOMO"]

    jid      = Column(Integer, ForeignKey("journals.id"), nullable=False)
    journal  = relationship("Journal", back_populates="trades")
    owner_id = Column(String(128), ForeignKey("users.uid"))
    owner    = relationship("User", back_populates="trades")

    partial_closes = relationship("TradeClosure", back_populates="trade", cascade="all, delete-orphan")


class TradeClosure(Base):
    __tablename__ = "trade_closures"

    id              = Column(Integer, primary_key=True, index=True)
    trade_id        = Column(Integer, ForeignKey("trades.id"), nullable=False)
    exit_price      = Column(DECIMAL(20, 8), nullable=False)
    closed_quantity = Column(DECIMAL(20, 8), nullable=False)
    fees            = Column(DECIMAL(20, 8), default=0)
    pnl             = Column(DECIMAL(20, 8))
    timestamp       = Column(DateTime, default=datetime.datetime.utcnow)

    trade = relationship("Trade", back_populates="partial_closes")


class UserTradeSummary(Base):
    __tablename__ = "user_trade_summary"

    user_id      = Column(String(128), ForeignKey("users.uid"), primary_key=True)
    total_pnl    = Column(DECIMAL(20, 8), default=0)
    winrate      = Column(DECIMAL(5, 2), default=0)
    total_trades = Column(Integer, default=0)
    sellpercent  = Column(DECIMAL(5, 2), default=0)

    user = relationship("User", back_populates="summary")


class Journal(Base):
    __tablename__ = "journals"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String(255), nullable=False)
    content  = Column(String(2048), nullable=True)
    owner_id = Column(String(128), ForeignKey("users.uid"), nullable=False)

    owner    = relationship("User", back_populates="journals")
    trades   = relationship("Trade", back_populates="journal", cascade="all, delete-orphan")
    jsummary = relationship("JournalTradeSummary", back_populates="journal", uselist=False)


class JournalTradeSummary(Base):
    __tablename__ = "journal_trade_summary"

    id           = Column(Integer, primary_key=True, index=True)
    journal_id   = Column(Integer, ForeignKey("journals.id"), nullable=False)
    total_pnl    = Column(DECIMAL(20, 8), default=0)
    winrate      = Column(DECIMAL(5, 2), default=0)
    total_trades = Column(Integer, default=0)
    sellpercent  = Column(DECIMAL(5, 2), default=0)

    journal = relationship("Journal", back_populates="jsummary")
