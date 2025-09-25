from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .database import engine, SessionLocal
from passlib.hash import bcrypt

print(bcrypt.hash("admin"))
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trade Journal API")

# Allow React frontend to access FastAPI
origins = [
    "http://localhost:5173",  # React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

@app.post("/trades/", response_model=schemas.Trade)
def add_trade(trade: schemas.TradeCreate, db: Session = Depends(get_db)):
    # за сега user_id е хардкоднат (например 1)
    return crud.create_trade(db=db, trade=trade, user_id=1)

@app.get("/trades/", response_model=list[schemas.Trade])
def list_trades(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_trades(db=db, user_id=1, skip=skip, limit=limit)
