from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import oci
import uuid

from app import models, database  # your existing imports

app = APIRouter()

# OCI config (use ~/.oci/config or environment variables)
config = oci.config.from_file("../.oci/config", "DEFAULT")
object_storage = oci.object_storage.ObjectStorageClient(config)

# Replace with your tenancy details
NAMESPACE = object_storage.get_namespace().data
BUCKET_NAME = "trade-journey"

@app.post("/trades/{trade_id}/upload-image")
async def upload_trade_image(trade_id: int, file: UploadFile = File(...), db: Session = database.get_db()):
    try:
        # Generate unique filename
        filename = f"{uuid.uuid4()}_{file.filename}"

        # Upload to OCI bucket
        object_storage.put_object(
            NAMESPACE,
            BUCKET_NAME,
            filename,
            file.file
        )

        # Construct object URL (pre-authenticated if needed)
        image_url = f"https://objectstorage.{config['region']}.oraclecloud.com/n/{NAMESPACE}/b/{BUCKET_NAME}/o/{filename}"

        # Update trade record in DB
        trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        trade.image_url = image_url
        db.commit()
        db.refresh(trade)

        return {"trade_id": trade_id, "image_url": image_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))