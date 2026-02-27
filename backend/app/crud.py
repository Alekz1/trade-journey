from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from . import models, schemas
from decimal import Decimal


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_long(side: str) -> bool:
    """Accept 'Long', 'long', 'buy', 'Buy' etc."""
    return side.lower() in ("long", "buy")


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
    entry_price = Decimal(str(trade.entry_price))
    quantity    = Decimal(str(trade.quantity))
    timestamp   = trade.timestamp or datetime.utcnow()

    db_trade = models.Trade(
        symbol=trade.symbol,
        side=trade.side,
        entry_price=entry_price,
        quantity=quantity,
        pnl=Decimal(0),
        timestamp=timestamp,
        image_url=trade.image_url,
        owner_id=user_id,
    )
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)

    total_pnl    = Decimal(0)
    total_closed = Decimal(0)
    for pc in trade.partial_closes:
        exit_price = Decimal(str(pc.exit_price))
        closed_qty = Decimal(str(pc.closed_quantity))
        fees       = Decimal(str(pc.fees or 0))
        ts         = pc.timestamp or datetime.utcnow()
        total_closed += closed_qty

        if total_closed > quantity + Decimal("0.0001"):
            raise ValueError(
                f"Closed quantity {total_closed} exceeds trade quantity {quantity}"
            )

        if _is_long(trade.side):
            pnl = (exit_price - entry_price) * closed_qty - fees
        else:
            pnl = (entry_price - exit_price) * closed_qty - fees

        db.add(models.TradeClosure(
            trade_id=db_trade.id,
            exit_price=exit_price,
            closed_quantity=closed_qty,
            fees=fees,
            pnl=pnl,
            timestamp=ts,
        ))
        total_pnl += pnl

    if total_closed < quantity - Decimal("0.0001"):
        raise ValueError(
            f"Closed quantity {total_closed} below trade quantity {quantity}"
        )

    db_trade.pnl = total_pnl
    db.commit()
    db.refresh(db_trade)
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
        models.Trade.owner_id == user_id,
    ).first()
    if trade:
        db.delete(trade)
        db.commit()
        update_user_trade_summary(db, user_id)
        return True
    return False


# -----------------------------
# Bulk CSV Import
# -----------------------------

def bulk_import_trades(db: Session, trades_list: list, user_id: str) -> int:
    """
    Insert trades produced by parse_tradingview_csv() into the database.

    Each element of trades_list is a plain dict with keys:
        symbol, side, entry_price, quantity, timestamp, partial_closes
    where partial_closes is a list of dicts:
        exit_price, closed_quantity, fees, pnl, timestamp

    PnL is taken directly from the parser (already computed) so there is
    no risk of drift between the parser and the DB calculation.
    """
    count = 0
    for t in trades_list:
        entry_price = Decimal(str(t["entry_price"]))
        quantity    = Decimal(str(t["quantity"]))
        side        = t["side"].lower()

        db_trade = models.Trade(
            symbol=t["symbol"],
            side=side,
            entry_price=entry_price,
            quantity=quantity,
            pnl=Decimal("0"),           # updated below
            timestamp=t["timestamp"],
            owner_id=user_id,
            image_url=None,
        )
        db.add(db_trade)
        db.flush()  # get db_trade.id without committing

        total_pnl = Decimal("0")
        for pc in t["partial_closes"]:
            pnl = Decimal(str(pc["pnl"]))
            db.add(models.TradeClosure(
                trade_id=db_trade.id,
                exit_price=Decimal(str(pc["exit_price"])),
                closed_quantity=Decimal(str(pc["closed_quantity"])),
                fees=Decimal(str(pc["fees"])),
                pnl=pnl,
                timestamp=pc["timestamp"],
            ))
            total_pnl += pnl

        db_trade.pnl = total_pnl
        count += 1

    db.commit()
    update_user_trade_summary(db, user_id)
    return count


# -----------------------------
# User Trade Summary
# -----------------------------

def get_user_trade_summary(db: Session, user_id: str):
    summary = db.query(models.UserTradeSummary).get(user_id)
    if not summary:
        summary = models.UserTradeSummary(
            user_id=user_id,
            total_pnl=Decimal(0),
            winrate=Decimal(0),
            total_trades=0,
            sellpercent=Decimal(0),
        )
        db.add(summary)
        db.commit()
        update_user_trade_summary(db, user_id)
        db.refresh(summary)
    return summary


def update_user_trade_summary(db: Session, user_id: str):
    total_pnl = db.query(
        func.coalesce(func.sum(models.Trade.pnl), 0)
    ).filter(models.Trade.owner_id == user_id).scalar()

    total_trades = db.query(
        func.count(models.Trade.id)
    ).filter(models.Trade.owner_id == user_id).scalar()

    wins = db.query(func.count(models.Trade.id)).filter(
        models.Trade.owner_id == user_id,
        models.Trade.pnl > 0,
    ).scalar() or 0

    winrate = (wins / total_trades * 100.0) if total_trades else 0.0

    # Count Short trades (previously counted "sell" — now aligned with Long/Short)
    shorts = db.query(func.count(models.Trade.id)).filter(
        models.Trade.owner_id == user_id,
        models.Trade.side.ilike("short"),
    ).scalar() or 0

    sellpercent = (shorts / total_trades * 100.0) if total_trades else 0.0

    summary = db.query(models.UserTradeSummary).get(user_id)
    if summary:
        summary.total_pnl    = total_pnl
        summary.winrate      = winrate
        summary.total_trades = total_trades
        summary.sellpercent  = sellpercent
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