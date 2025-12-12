from typing import Optional ,Dict
from datetime import datetime, timedelta
from jose import jwt, JWTError

# Hardcoded for now (later use config.py)
JWT_SECRET_KEY = "QUTATION_SAAS_SECURE_VISION_25"
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60

def fnCreateAccesToken(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy() 
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)   
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def fnDecodeAccessToken(token: str) -> Optional[Dict]:
    """Decode JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
