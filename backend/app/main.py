from datetime import datetime
import json
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi import UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .auth import router
from typing import List, Optional
from .dependencies import get_current_user
from . import models, schemas, crud
from .database import engine, SessionLocal
from passlib.hash import bcrypt
import oci, uuid

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trade Journal API")
app.include_router(router)

# OCI config (use ~/.oci/config or environment variables)
config = oci.config.from_file("./.oci/config", "DEFAULT")
object_storage = oci.object_storage.ObjectStorageClient(config)

# Replace with your tenancy details
NAMESPACE = object_storage.get_namespace().data
BUCKET_NAME = "trade-journey"

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

# -----------------------------
# User Endpoints
# -----------------------------
@app.post("/users/", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, user=user)

# -----------------------------
# Trade Endpoints
# -----------------------------
@app.post("/trades/", response_model=schemas.Trade)
async def add_trade_with_image(
    symbol: str = Form(...),
    side: str = Form(...),
    entry_price: float = Form(...),
    quantity: float = Form(...),
    timestamp: str = Form(None),
    partial_closes: str = Form("[]"),   # comes in as JSON string
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    try:
        image_url = None
        if file:
            filename = f"{uuid.uuid4()}_{file.filename}"
            object_storage.put_object(NAMESPACE, BUCKET_NAME, filename, file.file)
            image_url = (
                f"https://objectstorage.{config['region']}.oraclecloud.com"
                f"/n/{NAMESPACE}/b/{BUCKET_NAME}/o/{filename}"
            )

        closes: List[schemas.PartialClose] = []
        if partial_closes:
            closes = [schemas.PartialClose(**pc) for pc in json.loads(partial_closes)]

        trade_data = schemas.TradeCreate(
            symbol=symbol,
            side=side,
            entry_price=entry_price,
            quantity=quantity,
            timestamp=timestamp,
            partial_closes=closes,
            image_url=image_url
        )
        return crud.create_trade(db=db, trade=trade_data, user_id=user.uid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

@app.delete("/delete/trade/{trade_id}/")
def delete_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    success = crud.delete_trade(db=db, trade_id=trade_id, user_id=user.uid)
    if not success:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"detail": success}

# -----------------------------
# Stats Endpoints
# -----------------------------
@app.get("/users/me/stats/", response_model=schemas.UserTradeSummary)
def get_user_pnl(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.get_user_trade_summary(db=db, user_id=user.uid)

@app.get("/users/me/stats/refresh/", response_model=schemas.UserTradeSummary)
def refresh_user_pnl(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.update_user_trade_summary(db=db, user_id=user.uid)