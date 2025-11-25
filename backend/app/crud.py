from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from . import models, schemas
from decimal import Decimal

# -----------------------------
# User Helpers
# -----------------------------
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

# -----------------------------
# Trade CRUD
# -----------------------------
def create_trade(db: Session, trade: schemas.TradeCreate, user_id: str):
    entry_price = Decimal(trade.entry_price)
    quantity = Decimal(trade.quantity)
    timestamp = trade.timestamp or datetime.utcnow()

    # Create trade record (no root exit_price/fees anymore)
    db_trade = models.Trade(
        symbol=trade.symbol,
        side=trade.side,
        entry_price=entry_price,
        quantity=quantity,
        pnl=Decimal(0),
        timestamp=timestamp,
        owner_id=user_id,
    )
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)

    # Insert partial closes
    total_pnl = Decimal(0)
    total_closed = Decimal(0)
    for pc in trade.partial_closes:
        exit_price = Decimal(pc.exit_price)
        closed_qty = Decimal(pc.closed_quantity)
        fees = Decimal(pc.fees or 0)
        ts = pc.timestamp or datetime.utcnow()
        total_closed += closed_qty
        if total_closed > quantity:
            print(total_closed)
            print(quantity)
            raise ValueError("Closed quantity exceeds trade quantity")
        # PNL calculation per closure
        if trade.side.lower() == "buy":
            pnl = (exit_price - entry_price) * closed_qty - fees
        else:  # sell
            pnl = (entry_price - exit_price) * closed_qty - fees
        closure = models.TradeClosure(
            trade_id=db_trade.id,
            exit_price=exit_price,
            closed_quantity=closed_qty,
            fees=fees,
            pnl=pnl,
            timestamp=ts,
        )
        db.add(closure)
        total_pnl += pnl
    if total_closed < quantity:
            print(total_closed)
            print(quantity)
            raise ValueError("Closed quantity below trade quantity")
    # Update trade’s aggregated pnl
    db_trade.pnl = total_pnl
    db.commit()
    db.refresh(db_trade)

    # Update user summary
    update_user_trade_summary(db, user_id)

    return db_trade

def get_trades(
    db: Session,
    user_id: str,
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

def delete_trade(db: Session, trade_id: int, user_id: str):
    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id,
        models.Trade.owner_id == user_id
    ).first()
    if trade:
        db.delete(trade)
        db.commit()
        update_user_trade_summary(db, user_id)
        return True
    return False

# -----------------------------
# User Trade Summary
# -----------------------------
def get_user_trade_summary(db: Session, user_id: str):
    summary = db.query(models.UserTradeSummary).get(user_id)
    if not summary:
        total_pnl = db.query(
            func.coalesce(func.sum(models.Trade.pnl), 0)
        ).filter(models.Trade.owner_id == user_id).scalar()
        summary = models.UserTradeSummary(user_id=user_id, total_pnl=total_pnl)
        db.add(summary)
        db.commit()
    return summary

def update_user_trade_summary(db: Session, user_id: str):
    total_pnl = db.query(
        func.coalesce(func.sum(models.Trade.pnl), 0)
    ).filter(models.Trade.owner_id == user_id).scalar()

    total_trades = db.query(
        func.count(models.Trade.id)
    ).filter(models.Trade.owner_id == user_id).scalar()

    wins = db.query(func.count(models.Trade.id)) \
        .filter(models.Trade.owner_id == user_id, models.Trade.pnl > 0) \
        .scalar() or 0

    winrate = (wins / total_trades * 100.0) if total_trades else 0.0

    sells = db.query(func.count(models.Trade.id)) \
        .filter(models.Trade.owner_id == user_id, models.Trade.side.ilike("sell")) \
        .scalar()

    sellpercent = (sells / total_trades * 100.0) if total_trades else 0.0

    summary = db.query(models.UserTradeSummary).get(user_id)
    if summary:
        summary.total_pnl = total_pnl
        summary.winrate = winrate
        summary.total_trades = total_trades
        summary.sellpercent = sellpercent
    else:
        summary = models.UserTradeSummary(
            user_id=user_id,
            total_pnl=total_pnl,
            winrate=winrate,
            total_trades=total_trades,
            sellpercent=sellpercent,
        )
        db.add(summary)

    db.commit()
    return summary