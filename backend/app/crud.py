from sqlalchemy.orm import Session
from . import models, schemas
from passlib.hash import bcrypt
from decimal import Decimal

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pw = bcrypt.hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_pw)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

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
    db.refresh(db_trade)
    return db_trade

def get_trades(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Trade).filter(models.Trade.owner_id == user_id).offset(skip).limit(limit).all()
