from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from . import models, schemas
from passlib.hash import bcrypt
from decimal import Decimal


def get_user_by_uid(db: Session, uid: str):
    return db.query(models.User).filter(models.User.uid == uid).first()

def get_or_create_user(db: Session, uid: str, email: str, name: str | None = None):
    user = get_user_by_uid(db, uid)
    if not user:
        user = models.User(uid=uid, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def create_trade(db: Session, trade: schemas.TradeCreate, user_id: int):
    # Convert numeric inputs to Decimal for precise calculation
    entry_price = Decimal(trade.entry_price)
    exit_price = Decimal(trade.exit_price)
    quantity = Decimal(trade.quantity)
    fees = Decimal(trade.fees or 0)

    # PNL calculation
    if trade.side == "buy":
        pnl = (exit_price - entry_price) * quantity - fees
    elif trade.side == "sell":
        pnl = (entry_price - exit_price) * quantity - fees
    db_trade = models.Trade(
        symbol=trade.symbol,
        side=trade.side,
        entry_price=entry_price,
        exit_price=exit_price,
        quantity=quantity,
        fees=fees,
        pnl=pnl,
        owner_id=user_id
    )
    db.add(db_trade)
    db.commit()
    update_user_trade_summary(db, user_id)
    db.refresh(db_trade)
    return db_trade

def get_trades(
    db: Session,
    user_id: int,
    symbol: str = None,
    side: str = None,
    date_from: datetime = None,
    date_to: datetime = None,
    limit: int = 100,
):
    query = db.query(models.Trade).filter(models.Trade.owner_id == user_id)

    if symbol:
        query = query.filter(models.Trade.symbol.ilike(f"%{symbol}%"))

    if side:
        query = query.filter(models.Trade.side.ilike(side))

    if date_from:
        query = query.filter(models.Trade.timestamp >= date_from)

    if date_to:
        query = query.filter(models.Trade.timestamp <= date_to)

    return query.order_by(models.Trade.timestamp.desc()).limit(limit).all()

def get_user_trade_summary(db: Session, user_id: int):
    summary = db.query(models.UserTradeSummary).get(user_id)
    if not summary:
        total_pnl = db.query(
            func.coalesce(func.sum(models.Trade.pnl), 0)
        ).filter(models.Trade.owner_id == user_id).scalar()
        summary = models.UserTradeSummary(user_id=user_id, total_pnl=total_pnl)
        db.add(summary)
        db.commit()
    return summary

def update_user_trade_summary(db: Session, user_id: int):
    total_pnl = db.query(
        func.coalesce(func.sum(models.Trade.pnl), 0)
    ).filter(models.Trade.owner_id == user_id).scalar()

    summary = db.query(models.UserTradeSummary).get(user_id)
    if summary:
        summary.total_pnl = total_pnl
    else:
        summary = models.UserTradeSummary(user_id=user_id, total_pnl=total_pnl)
        db.add(summary)

    db.commit()
    return summary  