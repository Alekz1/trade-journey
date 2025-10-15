from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from . import database, models, crud
from .auth import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = crud.get_user_by_uid(db, uid=uid)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
