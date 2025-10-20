from datetime import datetime
from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .auth import router
from typing import Optional

from .dependencies import get_current_user
from . import models, schemas, crud
from .database import engine, SessionLocal
from passlib.hash import bcrypt

print(bcrypt.hash("admin"))
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trade Journal API")
app.include_router(router)

# Allow React frontend to access FastAPI
origins = [
    "http://localhost:5173",  # React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/users/", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, user=user)

# Add a new trade
@app.post("/trades/", response_model=schemas.Trade)
def add_trade(
    trade: schemas.TradeCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),  # get logged-in user
):
    return crud.create_trade(db=db, trade=trade, user_id=user.uid)  # use current user's UID

# List trades for current user (with filtering)
@app.get("/trades/", response_model=list[schemas.Trade])
def list_trades(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    symbol: Optional[str] = Query(None),
    side: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(100, gt=0),
):
    return crud.get_trades(
        db=db,
        user_id=user.uid,
        symbol=symbol,
        side=side,
        date_from=date_from,
        date_to=date_to,
        limit=limit
    )
@app.get("/users/me/pnl/", response_model=schemas.UserTradeSummary)
def get_user_pnl(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.get_user_trade_summary(db=db, user_id=user.uid)