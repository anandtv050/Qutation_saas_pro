import os
from typing import Optional, Dict, Annotated
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Header, HTTPException, status, Depends
from passlib.context import CryptContext

# Hardcoded for now (later use config.py)
JWT_SECRET_KEY = "QUTATION_SAAS_SECURE_VISION_25"
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Admin user ID (always pk_bint_user_id = 1)
ADMIN_USER_ID = 1

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def fnHashPassword(strPassword: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(strPassword)


def fnVerifyPassword(strPlainPassword: str, strHashedPassword: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(strPlainPassword, strHashedPassword)


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


async def fnGetCurrentUser(
    authorization: Annotated[Optional[str], Header(description="Bearer token")] = None,
) -> int:
    """
    Dependency to get current user from JWT token.

    Returns: intUserId (int)
    Raises: HTTPException 401 if authentication fails
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization.replace("Bearer ", "")
    payload = fnDecodeAccessToken(token)

    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return int(payload["user_id"])


async def fnGetAdminUser(
    intUserId: int = Depends(fnGetCurrentUser)
) -> int:
    """
    Dependency to ensure current user is admin (user_id = 1).
    Use this for admin-only endpoints like user creation.

    Returns: intUserId (int) if admin
    Raises: HTTPException 403 if not admin
    """
    if intUserId != ADMIN_USER_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return intUserId


async def fnCheckModulePermission(intUserId: int, strModuleKey: str, insPool) -> bool:
    """
    Check if user has permission to access a specific module.
    Admin (user_id=1) always has access.
    If no permission row exists for the user, access is GRANTED (default allow).
    Only blocked if explicitly set to bln_enabled = false.
    """
    if intUserId == ADMIN_USER_ID:
        return True

    async with insPool.acquire() as conn:
        rstPerm = await conn.fetchrow(
            """SELECT p.bln_enabled
               FROM tbl_user_module_permission p
               JOIN tbl_module m ON p.fk_bint_module_id = m.pk_bint_module_id
               WHERE p.fk_bint_user_id = $1 AND m.vchr_module_key = $2""",
            intUserId, strModuleKey
        )

    # If no permission row exists, default to ALLOWED
    if rstPerm is None:
        return True

    return rstPerm['bln_enabled']
