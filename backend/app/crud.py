from datetime import datetime
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from . import models, schemas
from decimal import Decimal


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_long(side: str) -> bool:
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
    if not user.journals or len(user.journals) == 0:
        default_journal = models.Journal(name="Default", content="", owner_id=uid)
        db.add(default_journal)
        db.commit()
        db.refresh(default_journal)
    return user


# -----------------------------
# Journal CRUD
# -----------------------------

def get_user_journals(db: Session, user_id: str) -> list:
    return (
        db.query(models.Journal)
        .filter(models.Journal.owner_id == user_id)
        .order_by(models.Journal.id)
        .all()
    )


def get_journal(db: Session, journal_id: int, user_id: str):
    return (
        db.query(models.Journal)
        .filter(models.Journal.id == journal_id, models.Journal.owner_id == user_id)
        .first()
    )


def create_journal(db: Session, journal: schemas.JournalCreate, user_id: str):
    db_journal = models.Journal(name=journal.name, content=journal.content, owner_id=user_id)
    db.add(db_journal)
    db.commit()
    db.refresh(db_journal)
    return db_journal


def delete_journal(db: Session, journal_id: int, user_id: str) -> bool:
    count = (
        db.query(func.count(models.Journal.id))
        .filter(models.Journal.owner_id == user_id)
        .scalar()
    )
    if count <= 1:
        raise ValueError("Cannot delete the last journal. Create another one first.")
    journal = get_journal(db, journal_id, user_id)
    if not journal:
        return False
    db.delete(journal)
    db.commit()
    update_user_trade_summary(db, user_id)
    return True


# -----------------------------
# Trade CRUD
# -----------------------------

def create_trade(db: Session, trade: schemas.TradeCreate, user_id: str):
    journal = get_journal(db, trade.jid, user_id)
    if not journal:
        raise ValueError(f"Journal {trade.jid} not found or access denied")

    entry_price = Decimal(str(trade.entry_price))
    quantity    = Decimal(str(trade.quantity))
    timestamp   = trade.timestamp or datetime.utcnow()

    db_trade = models.Trade(
        symbol=trade.symbol, side=trade.side,
        entry_price=entry_price, quantity=quantity,
        pnl=Decimal(0), timestamp=timestamp,
        image_url=trade.image_url, owner_id=user_id, jid=trade.jid,
        message=trade.message,  # new: free-text note
        tags=trade.tags,        # new: list of tag strings (stored as JSON)
    )
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)

    total_pnl = Decimal(0)
    total_closed = Decimal(0)
    for pc in trade.partial_closes:
        exit_price = Decimal(str(pc.exit_price))
        closed_qty = Decimal(str(pc.closed_quantity))
        fees       = Decimal(str(pc.fees or 0))
        ts         = pc.timestamp or datetime.utcnow()
        total_closed += closed_qty

        if total_closed > quantity + Decimal("0.0001"):
            raise ValueError(f"Closed quantity {total_closed} exceeds trade quantity {quantity}")

        pnl = ((exit_price - entry_price) if _is_long(trade.side) else (entry_price - exit_price)) * closed_qty - fees
        db.add(models.TradeClosure(
            trade_id=db_trade.id, exit_price=exit_price,
            closed_quantity=closed_qty, fees=fees, pnl=pnl, timestamp=ts,
        ))
        total_pnl += pnl

    if total_closed < quantity - Decimal("0.0001"):
        raise ValueError(f"Closed quantity {total_closed} below trade quantity {quantity}")

    db_trade.pnl = total_pnl
    db.commit()
    db.refresh(db_trade)
    update_user_trade_summary(db, user_id)
    update_journal_trade_summary(db, trade.jid)
    return db_trade


def get_trades(
    db: Session, user_id: str,
    symbol: str = None, side: str = None,
    date_from: datetime = None, date_to: datetime = None,
    limit: int = 100,
):
    """All trades for user across all journals (used for global charts)."""
    q = db.query(models.Trade).filter(models.Trade.owner_id == user_id)
    if symbol:    q = q.filter(models.Trade.symbol.ilike(f"%{symbol}%"))
    if side:      q = q.filter(models.Trade.side.ilike(side))
    if date_from: q = q.filter(models.Trade.timestamp >= date_from)
    if date_to:   q = q.filter(models.Trade.timestamp <= date_to)
    return q.order_by(models.Trade.timestamp.desc()).limit(limit).all()


def get_trades_by_journal(
    db: Session, user_id: str, journal_id: int,
    symbol: str = None, side: str = None,
    date_from: datetime = None, date_to: datetime = None,
    limit: int = 100,
):
    journal = get_journal(db, journal_id, user_id)
    if not journal:
        raise ValueError("Journal not found or access denied")
    q = db.query(models.Trade).filter(models.Trade.jid == journal_id)
    if symbol:    q = q.filter(models.Trade.symbol.ilike(f"%{symbol}%"))
    if side:      q = q.filter(models.Trade.side.ilike(side))
    if date_from: q = q.filter(models.Trade.timestamp >= date_from)
    if date_to:   q = q.filter(models.Trade.timestamp <= date_to)
    return q.order_by(models.Trade.timestamp.desc()).limit(limit).all()


def delete_trade(db: Session, trade_id: int, user_id: str):
    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id, models.Trade.owner_id == user_id,
    ).first()
    if trade:
        journal_id = trade.jid
        db.delete(trade)
        db.commit()
        update_user_trade_summary(db, user_id)
        update_journal_trade_summary(db, journal_id)
        return True
    return False


# -----------------------------
# Bulk CSV Import  (with duplicate detection)
# -----------------------------

def _make_fingerprint(symbol: str, side: str, entry_price, quantity, timestamp) -> tuple:
    """
    Deterministic identity key for a trade row used to detect duplicates.

    - entry_price / quantity are rounded to 8 dp to absorb float <-> Decimal noise
      that naturally occurs between the CSV parser and the DB round-trip.
    - timestamp is truncated to the second because TradingView exports carry no
      sub-second precision, so microseconds from DB storage would cause false misses.
    """
    ep = round(float(entry_price), 8)
    qt = round(float(quantity),    8)
    ts = timestamp.replace(microsecond=0) if hasattr(timestamp, "replace") else timestamp
    return (symbol.upper(), side.lower(), ep, qt, ts)


def bulk_import_trades(
    db: Session,
    trades_list: list,
    user_id: str,
    journal_id: int,
) -> dict:
    """
    Insert trades produced by the CSV parsers, skipping exact duplicates.

    Duplicate detection strategy
    ----------------------------
    One single query fetches all existing (symbol, side, entry_price, quantity,
    timestamp) tuples for the target (user, journal) and hashes them into a set —
    O(existing) lookup cost, not O(existing × incoming).

    A trade from the CSV is skipped when its fingerprint matches:
      • anything already in the DB for this journal, OR
      • anything already inserted earlier in this same batch
        (handles re-uploading the same file twice without refreshing).

    Returns
    -------
    {"imported": int, "skipped": int}
    """
    journal = get_journal(db, journal_id, user_id)
    if not journal:
        raise ValueError(f"Journal {journal_id} not found or access denied")

    # Fetch fingerprints of all trades already in this journal
    existing_rows = (
        db.query(
            models.Trade.symbol,
            models.Trade.side,
            models.Trade.entry_price,
            models.Trade.quantity,
            models.Trade.timestamp,
        )
        .filter(
            models.Trade.owner_id == user_id,
            models.Trade.jid == journal_id,
        )
        .all()
    )
    existing_fps: set = {
        _make_fingerprint(r.symbol, r.side, r.entry_price, r.quantity, r.timestamp)
        for r in existing_rows
    }

    imported  = 0
    skipped   = 0
    batch_fps: set = set()  # dedup within the incoming batch itself

    for t in trades_list:
        entry_price = Decimal(str(t["entry_price"]))
        quantity    = Decimal(str(t["quantity"]))
        side        = t["side"].lower()
        ts          = t["timestamp"]  # already a datetime from the parser

        fp = _make_fingerprint(t["symbol"], side, entry_price, quantity, ts)

        if fp in existing_fps or fp in batch_fps:
            skipped += 1
            continue

        batch_fps.add(fp)

        db_trade = models.Trade(
            symbol=t["symbol"], side=side,
            entry_price=entry_price, quantity=quantity,
            pnl=Decimal("0"), timestamp=ts,
            owner_id=user_id, image_url=None, jid=journal_id,
            message=None, tags=None,
        )
        db.add(db_trade)
        db.flush()  # get id before commit

        total_pnl = Decimal("0")
        for pc in t["partial_closes"]:
            pnl = Decimal(str(pc["pnl"]))
            db.add(models.TradeClosure(
                trade_id=db_trade.id,
                exit_price=Decimal(str(pc["exit_price"])),
                closed_quantity=Decimal(str(pc["closed_quantity"])),
                fees=Decimal(str(pc["fees"])),
                pnl=pnl, timestamp=pc["timestamp"],
            ))
            total_pnl += pnl

        db_trade.pnl = total_pnl
        imported += 1

    db.commit()

    if imported > 0:
        update_user_trade_summary(db, user_id)
        update_journal_trade_summary(db, journal_id)

    return {"imported": imported, "skipped": skipped}


# -----------------------------
# User Trade Summary
# -----------------------------

def get_user_trade_summary(db: Session, user_id: str):
    summary = db.query(models.UserTradeSummary).get(user_id)
    if not summary:
        summary = models.UserTradeSummary(
            user_id=user_id, total_pnl=Decimal(0),
            winrate=Decimal(0), total_trades=0, sellpercent=Decimal(0),
        )
        db.add(summary)
        db.commit()
        update_user_trade_summary(db, user_id)
        db.refresh(summary)
    return summary


def update_user_trade_summary(db: Session, user_id: str):
    total_pnl    = db.query(func.coalesce(func.sum(models.Trade.pnl), 0)).filter(models.Trade.owner_id == user_id).scalar()
    total_trades = db.query(func.count(models.Trade.id)).filter(models.Trade.owner_id == user_id).scalar()
    wins         = db.query(func.count(models.Trade.id)).filter(models.Trade.owner_id == user_id, models.Trade.pnl > 0).scalar() or 0
    winrate      = (wins / total_trades * 100.0) if total_trades else 0.0

    shorts = db.query(func.count(models.Trade.id)).filter(
        models.Trade.owner_id == user_id,
        or_(models.Trade.side.ilike("short"), models.Trade.side.ilike("sell")),
    ).scalar() or 0
    sellpercent = (shorts / total_trades * 100.0) if total_trades else 0.0

    summary = db.query(models.UserTradeSummary).get(user_id)
    if summary:
        summary.total_pnl = total_pnl; summary.winrate = winrate
        summary.total_trades = total_trades; summary.sellpercent = sellpercent
    else:
        summary = models.UserTradeSummary(
            user_id=user_id, total_pnl=total_pnl, winrate=winrate,
            total_trades=total_trades, sellpercent=sellpercent,
        )
        db.add(summary)
    db.commit()
    return summary


# -----------------------------
# Journal Trade Summary
# -----------------------------

def get_journal_trade_summary(db: Session, journal_id: int, user_id: str):
    journal = get_journal(db, journal_id, user_id)
    if not journal:
        raise ValueError("Journal not found or access denied")

    summary = (
        db.query(models.JournalTradeSummary)
        .filter(models.JournalTradeSummary.journal_id == journal_id)
        .first()
    )
    if not summary:
        summary = models.JournalTradeSummary(
            journal_id=journal_id, total_pnl=Decimal(0),
            winrate=Decimal(0), total_trades=0, sellpercent=Decimal(0),
        )
        db.add(summary)
        db.commit()
        summary = update_journal_trade_summary(db, journal_id)
    return summary


def update_journal_trade_summary(db: Session, journal_id: int):
    total_pnl    = db.query(func.coalesce(func.sum(models.Trade.pnl), 0)).filter(models.Trade.jid == journal_id).scalar()
    total_trades = db.query(func.count(models.Trade.id)).filter(models.Trade.jid == journal_id).scalar()
    wins         = db.query(func.count(models.Trade.id)).filter(models.Trade.jid == journal_id, models.Trade.pnl > 0).scalar() or 0
    winrate      = (wins / total_trades * 100.0) if total_trades else 0.0

    shorts = db.query(func.count(models.Trade.id)).filter(
        models.Trade.jid == journal_id,
        or_(models.Trade.side.ilike("short"), models.Trade.side.ilike("sell")),
    ).scalar() or 0
    sellpercent = (shorts / total_trades * 100.0) if total_trades else 0.0

    summary = (
        db.query(models.JournalTradeSummary)
        .filter(models.JournalTradeSummary.journal_id == journal_id)
        .first()
    )
    if summary:
        summary.total_pnl = total_pnl; summary.winrate = winrate
        summary.total_trades = total_trades; summary.sellpercent = sellpercent
    else:
        summary = models.JournalTradeSummary(
            journal_id=journal_id, total_pnl=total_pnl, winrate=winrate,
            total_trades=total_trades, sellpercent=sellpercent,
        )
        db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary