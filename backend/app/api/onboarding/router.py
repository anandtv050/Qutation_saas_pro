from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.onboarding.schema import MdlFinishRequest, MdlOnboardingState, MdlProfileRequest, MdlTradeRequest
from app.api.onboarding.service import ClsOnboardingService
from app.core.database import ClsDatabasepool
from app.core.logger import getLogger
from app.core.security import fnGetCurrentUser

logger = getLogger()

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


async def fnGetService(intUserId: int = Depends(fnGetCurrentUser)) -> ClsOnboardingService:
    objPool = await ClsDatabasepool().fnGetPool()
    return ClsOnboardingService(objPool, intUserId)


def fnFail(strWhere: str, e: Exception) -> HTTPException:
    logger.error(f"Onboarding {strWhere} error: {str(e)}", exc_info=True)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Something went wrong. Please try again.",
    )


@router.post("/state", response_model=MdlOnboardingState)
async def fnGetState(insService: ClsOnboardingService = Depends(fnGetService)):
    """Wizard prefill + trade chips + dashboard checklist flags."""
    try:
        return await insService.fnGetState()
    except HTTPException:
        raise
    except Exception as e:
        raise fnFail("state", e)


@router.post("/profile")
async def fnSaveProfile(mdlRequest: MdlProfileRequest, insService: ClsOnboardingService = Depends(fnGetService)):
    """Step 1: business name (required) and phone."""
    try:
        return await insService.fnSaveProfile(mdlRequest)
    except HTTPException:
        raise
    except Exception as e:
        raise fnFail("profile", e)


@router.post("/trade")
async def fnSelectTrade(mdlRequest: MdlTradeRequest, insService: ClsOnboardingService = Depends(fnGetService)):
    """Step 2: pick a trade; seeds the catalogue (idempotent)."""
    try:
        return await insService.fnSelectTrade(mdlRequest.strTrade)
    except HTTPException:
        raise
    except Exception as e:
        raise fnFail("trade", e)


@router.post("/logo")
async def fnUploadLogo(objFile: UploadFile = File(...), insService: ClsOnboardingService = Depends(fnGetService)):
    """Step 3: logo upload (PNG/JPG/WEBP, max 2 MB, resized)."""
    try:
        return await insService.fnUploadLogo(objFile)
    except HTTPException:
        raise
    except Exception as e:
        raise fnFail("logo", e)


@router.post("/finish")
async def fnFinish(
    mdlRequest: MdlFinishRequest | None = None,
    insService: ClsOnboardingService = Depends(fnGetService),
):
    """Create the draft sample quotation (once), mark onboarding done, alert the owner.
    With blnSkipSample the sample quotation is not created (the user already saved a real one)."""
    try:
        return await insService.fnFinish(bool(mdlRequest and mdlRequest.blnSkipSample))
    except HTTPException:
        raise
    except Exception as e:
        raise fnFail("finish", e)
