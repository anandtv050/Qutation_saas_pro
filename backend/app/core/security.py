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
    x_user_id: Annotated[Optional[str], Header(alias="x-user-id")] = None
) -> int:
    """
    Dependency to get current user from JWT token and/or x-user-id header.

    Logic:
    1. If both provided: JWT user_id must match x-user-id (mismatch = error)
    2. If only JWT: use JWT user_id
    3. If only x-user-id: use x-user-id (for testing/development)
    4. If neither: 401 error

    Returns: intUserId (int)
    Raises: HTTPException 401/400 if authentication fails
    """

    intJwtUserId = None
    intHeaderUserId = None

    # Extract user_id from JWT token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        payload = fnDecodeAccessToken(token)

        if payload and "user_id" in payload:
            intJwtUserId = int(payload["user_id"])
        else:
            # Token invalid or expired
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )

    # Extract user_id from x-user-id header
    if x_user_id:
        try:
            intHeaderUserId = int(x_user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid x-user-id header"
            )

    # Both provided - must match
    if intJwtUserId is not None and intHeaderUserId is not None:
        if intJwtUserId != intHeaderUserId:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User ID mismatch: token user_id ({intJwtUserId}) != x-user-id ({intHeaderUserId})"
            )
        return intJwtUserId

    # Only JWT provided
    if intJwtUserId is not None:
        return intJwtUserId

    # Only x-user-id provided (fallback for testing)
    if intHeaderUserId is not None:
        return intHeaderUserId

    # No authentication provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"}
    )


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


# TODO: Future - Module permission check (commented for now)
# async def fnCheckModulePermission(
#     intUserId: int,
#     strModuleName: str,
#     insPool: Pool
# ) -> bool:
#     """
#     Check if user has permission to access a specific module.
#     Will be implemented later with tbl_user_permission table.
#     """
#     # For now, all authenticated users have access to all modules
#     return True
