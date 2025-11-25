import pytest
from decimal import Decimal
from datetime import datetime, UTC
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import from your app package
from app import models, crud, schemas
from app.database import Base

# -----------------------------
# Test DB Setup
# -----------------------------
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

# -----------------------------
# Helper: compute expected PnL
# -----------------------------
def compute_expected_pnl(entry_price, side, partial_closes):
    total = Decimal(0)
    for pc in partial_closes:
        exit_price = Decimal(pc["exit_price"])
        qty = Decimal(pc["closed_quantity"])
        fees = Decimal(pc.get("fees") or 0)
        if side.lower() == "buy":
            pnl = (exit_price - entry_price) * qty - fees
        else:
            pnl = (entry_price - exit_price) * qty - fees
        total += pnl
    return total

# -----------------------------
# Tests
# -----------------------------
def test_get_or_create_user(db):
    user = crud.get_or_create_user(db, uid="u123", email="test@example.com", name="Alex")
    assert user.uid == "u123"
    assert user.email == "test@example.com"

def test_create_trade_with_multiple_closures_buy(db):
    user = crud.get_or_create_user(db, uid="u1", email="buy@example.com")
    partials = [
        {"exit_price": "150.98765432", "closed_quantity": "4", "fees": "0.50", "timestamp": None, "pnl": None},
        {"exit_price": "140.00000001", "closed_quantity": "6", "fees": "1.25", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="AAPL",
        side="buy",
        entry_price=Decimal("145.12345678"),
        quantity=Decimal("10"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    trade = crud.create_trade(db, trade_data, user_id=user.uid)

    expected = compute_expected_pnl(Decimal("145.12345678"), "buy", partials)
    assert round(trade.pnl, 7) == round(expected, 7)
    assert len(trade.partial_closes) == 2

def test_create_trade_with_less_closed_qnty(db):
    user = crud.get_or_create_user(db, uid="u1", email="buy@example.com")
    partials = [
        {"exit_price": "150.98765432", "closed_quantity": "4", "fees": "0.50", "timestamp": None, "pnl": None},
        {"exit_price": "140.00000001", "closed_quantity": "6", "fees": "1.25", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="AAPL",
        side="buy",
        entry_price=Decimal("145.12345678"),
        quantity=Decimal("11"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    with pytest.raises(ValueError):
        crud.create_trade(db, trade_data, user_id=user.uid)

    

def test_create_trade_with_multiple_closures_sell(db):
    user = crud.get_or_create_user(db, uid="u2", email="sell@example.com")
    partials = [
        {"exit_price": "34000.98765432", "closed_quantity": "1.0", "fees": "15.75", "timestamp": None, "pnl": None},
        {"exit_price": "36000.00000001", "closed_quantity": "1.5", "fees": "20.25", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="BTCUSDT",
        side="sell",
        entry_price=Decimal("35000.12345678"),
        quantity=Decimal("2.5"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    trade = crud.create_trade(db, trade_data, user_id=user.uid)

    expected = compute_expected_pnl(Decimal("35000.12345678"), "sell", partials)
    assert round(trade.pnl, 7) == round(expected, 7)
    assert len(trade.partial_closes) == 2

def test_get_trades_with_filters(db):
    user = crud.get_or_create_user(db, uid="u3", email="filter@example.com")
    partials = [
        {"exit_price": "2600.98765432", "closed_quantity": "1", "fees": "5.00", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="ETHUSDT",
        side="buy",
        entry_price=Decimal("2500.12345678"),
        quantity=Decimal("1"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    crud.create_trade(db, trade_data, user_id=user.uid)

    trades = crud.get_trades(db, user_id=user.uid, symbol="ETH", side="buy")
    assert len(trades) == 1
    assert trades[0].symbol == "ETHUSDT"

def test_delete_trade(db):
    user = crud.get_or_create_user(db, uid="u4", email="delete@example.com")
    partials = [
        {"exit_price": "710.98765432", "closed_quantity": "2", "fees": "1.00", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="TSLA",
        side="buy",
        entry_price=Decimal("700.12345678"),
        quantity=Decimal("2"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    trade = crud.create_trade(db, trade_data, user_id=user.uid)

    success = crud.delete_trade(db, trade_id=trade.id, user_id=user.uid)
    assert success is True
    trades = crud.get_trades(db, user_id=user.uid)
    assert len(trades) == 0

def test_user_trade_summary(db):
    user = crud.get_or_create_user(db, uid="u5", email="summary@example.com")
    partials = [
        {"exit_price": "310.98765432", "closed_quantity": "5", "fees": "2.50", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="MSFT",
        side="buy",
        entry_price=Decimal("300.12345678"),
        quantity=Decimal("5"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    crud.create_trade(db, trade_data, user_id=user.uid)

    summary = crud.get_user_trade_summary(db, user_id=user.uid)
    assert summary.total_pnl > 0
    assert summary.total_trades == 1
    assert summary.winrate == 100.0

def test_invalid_closure_quantity(db):
    user = crud.get_or_create_user(db, uid="u6", email="invalid@example.com")
    partials = [
        {"exit_price": "510.98765432", "closed_quantity": "6", "fees": "1.00", "timestamp": None, "pnl": None},
    ]
    trade_data = schemas.TradeCreate(
        symbol="NFLX",
        side="buy",
        entry_price=Decimal("500.12345678"),
        quantity=Decimal("5"),
        timestamp=datetime.now(UTC),
        partial_closes=partials
    )
    with pytest.raises(ValueError):
        crud.create_trade(db, trade_data, user_id=user.uid)
