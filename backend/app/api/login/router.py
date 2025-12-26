from fastapi import APIRouter,HTTPException,status
import asyncpg

from app.api.login.schema import MdlLoginRequest,MdlLoginResponse
from app.api.login.service import ClsLoginService
from app.core.database import ClsDatabasepool


router = APIRouter(prefix="/auth",tags=["Authentication"])
@router.post("/login",response_model=MdlLoginResponse)
async def fnLogin(mdlLoginRequest:MdlLoginRequest):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()
        
        insLoginService = ClsLoginService(pool)
        mdlLoginResponse = await insLoginService.fnLoginService(mdlLoginRequest)
        return mdlLoginResponse
    
    except HTTPException:
        # Re-raise HTTPException as-is (e.g., 401 for invalid credentials)
        raise
    except asyncpg.PostgresError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )