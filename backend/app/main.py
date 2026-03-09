from datetime import datetime
import json
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi import UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .parser import detect_and_parse, parse_balance_history_csv, parse_order_history_csv
from .auth import router
from typing import List, Optional
from .dependencies import get_current_user
from . import models, schemas, crud
from .database import engine, SessionLocal
import oci, uuid

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trade Journal API")
app.include_router(router)

config = oci.config.from_file("./.oci/config", "DEFAULT")
object_storage = oci.object_storage.ObjectStorageClient(config)
NAMESPACE   = object_storage.get_namespace().data
BUCKET_NAME = "trade-journey"

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


# =============================================================================
# Journal Endpoints
# =============================================================================

@app.get("/journals/", response_model=list[schemas.Journal])
def list_journals(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.get_user_journals(db=db, user_id=user.uid)


@app.post("/journals/", response_model=schemas.Journal, status_code=201)
def create_journal(
    journal: schemas.JournalCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.create_journal(db=db, journal=journal, user_id=user.uid)


@app.delete("/journals/{journal_id}/")
def delete_journal(
    journal_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        success = crud.delete_journal(db=db, journal_id=journal_id, user_id=user.uid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not success:
        raise HTTPException(status_code=404, detail="Journal not found")
    return {"detail": "deleted"}


@app.get("/journals/{journal_id}/stats/", response_model=schemas.JournalTradeSummary)
def get_journal_stats(
    journal_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.get_journal_trade_summary(db=db, journal_id=journal_id, user_id=user.uid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/journals/{journal_id}/stats/refresh/", response_model=schemas.JournalTradeSummary)
def refresh_journal_stats(
    journal_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not crud.get_journal(db, journal_id, user.uid):
        raise HTTPException(status_code=404, detail="Journal not found")
    return crud.update_journal_trade_summary(db=db, journal_id=journal_id)


# =============================================================================
# User Endpoints
# =============================================================================

@app.post("/users/", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, user=user)


# =============================================================================
# Trade Endpoints
# =============================================================================

@app.post("/trades/", response_model=schemas.Trade)
async def add_trade_with_image(
    symbol:         str         = Form(...),
    side:           str         = Form(...),
    entry_price:    float       = Form(...),
    quantity:       float       = Form(...),
    jid:            int         = Form(...),
    timestamp:      str         = Form(None),
    partial_closes: str         = Form("[]"),
    message:        str         = Form(None),          # optional trade note
    tags:           str         = Form("[]"),           # JSON array of strings
    file:           UploadFile  = File(None),
    db:             Session     = Depends(get_db),
    user:           models.User = Depends(get_current_user),
):
    try:
        image_url = None
        if file:
            filename = f"{uuid.uuid4()}_{file.filename}"
            object_storage.put_object(NAMESPACE, BUCKET_NAME, filename, file.file)
            image_url = filename

        closes: List[schemas.PartialClose] = [
            schemas.PartialClose(**pc) for pc in json.loads(partial_closes)
        ]

        parsed_tags: Optional[List[str]] = json.loads(tags) if tags else None
        if parsed_tags == []:
            parsed_tags = None

        trade_data = schemas.TradeCreate(
            symbol=symbol, side=side,
            entry_price=entry_price, quantity=quantity,
            timestamp=timestamp, partial_closes=closes,
            image_url=image_url, jid=jid,
            message=message or None,
            tags=parsed_tags,
        )
        return crud.create_trade(db=db, trade=trade_data, user_id=user.uid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/trades/import-csv")
async def import_csv(
    file:       UploadFile  = File(...),
    csv_type:   str         = Form("auto"),
    journal_id: int         = Form(...),
    db:         Session     = Depends(get_db),
    user:       models.User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    try:
        csv_text = (await file.read()).decode("utf-8-sig")
        if csv_type == "balance":
            trades_data = [t.to_dict() for t in parse_balance_history_csv(csv_text)]
            parser_used = "Balance History"
        elif csv_type == "order":
            trades_data = [t.to_dict() for t in parse_order_history_csv(csv_text)]
            parser_used = "Order History"
        else:
            trades_data = detect_and_parse(csv_text)
            parser_used = "auto-detected"

        if not trades_data:
            return {"message": "No fully-closed trades found in file", "imported": 0, "skipped": 0}

        result   = crud.bulk_import_trades(db, trades_data, user.uid, journal_id)
        imported = result["imported"]
        skipped  = result["skipped"]

        msg = f"Imported {imported} trade{'s' if imported != 1 else ''}"
        if skipped:
            msg += f", skipped {skipped} duplicate{'s' if skipped != 1 else ''}"
        msg += f" ({parser_used})"

        return {"message": msg, "imported": imported, "skipped": skipped}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Import Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/trades/", response_model=list[schemas.Trade])
def list_trades(
    db:         Session           = Depends(get_db),
    user:       models.User       = Depends(get_current_user),
    journal_id: Optional[int]     = Query(None),
    symbol:     Optional[str]     = Query(None),
    side:       Optional[str]     = Query(None),
    date_from:  Optional[datetime] = Query(None),
    date_to:    Optional[datetime] = Query(None),
    limit:      int               = Query(100, gt=0),
):
    if journal_id is not None:
        try:
            return crud.get_trades_by_journal(
                db=db, user_id=user.uid, journal_id=journal_id,
                symbol=symbol, side=side,
                date_from=date_from, date_to=date_to, limit=limit,
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    return crud.get_trades(
        db=db, user_id=user.uid,
        symbol=symbol, side=side,
        date_from=date_from, date_to=date_to, limit=limit,
    )


@app.delete("/delete/trade/{trade_id}/")
def delete_trade(
    trade_id: int,
    db:   Session     = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    success = crud.delete_trade(db=db, trade_id=trade_id, user_id=user.uid)
    if not success:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"detail": success}


# =============================================================================
# Stats Endpoints
# =============================================================================

@app.get("/users/me/stats/", response_model=schemas.UserTradeSummary)
def get_user_pnl(
    db:   Session     = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.get_user_trade_summary(db=db, user_id=user.uid)


@app.get("/users/me/stats/refresh/", response_model=schemas.UserTradeSummary)
def refresh_user_pnl(
    db:   Session     = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.update_user_trade_summary(db=db, user_id=user.uid)


@app.get("/fetch-image/{image_name}")
def fetch_image(image_name: str):
    try:
        response = object_storage.get_object(
            namespace_name=NAMESPACE,
            bucket_name=BUCKET_NAME,
            object_name=image_name,
        )
        return StreamingResponse(
            response.data.raw,
            media_type=response.headers.get("Content-Type", "image/jpeg"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))