import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from . import models, crud, database
from .database import engine, SessionLocal
import os
from dotenv import load_dotenv
import os

router = APIRouter()
credjson="app/firebase-service-account.json"

# Firebase init
cred = credentials.Certificate(credjson)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY")  # use env variable in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

class TokenData(BaseModel):
    token: str


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



@router.post("/auth/firebase")
async def verify_firebase_token(data: TokenData, db: Session = Depends(database.get_db)):
    try:
        decoded_token = firebase_auth.verify_id_token(data.token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name")

        # Ensure user exists in local DB
        user = crud.get_or_create_user(db, uid=uid, email=email, name=name)
        
        # Issue local JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.uid, "email": user.email}, 
            expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Firebase token"+ str(e))

@router.post("/auth/refresh")
async def refresh_access_token(data: TokenData, db: Session = Depends(database.get_db)):
    try:
        # Re-verify Firebase ID token
        decoded_token = firebase_auth.verify_id_token(data.token, check_revoked=True)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name")

        # Ensure user exists in local DB
        user = crud.get_or_create_user(db, uid=uid, email=email, name=name)

        # Issue fresh local JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.uid, "email": user.email},
            expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Firebase token"+ str(e))

