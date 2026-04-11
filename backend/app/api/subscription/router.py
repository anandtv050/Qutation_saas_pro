from fastapi import APIRouter, HTTPException, status, Depends
from asyncpg import Pool
import asyncpg

from app.api.subscription.schema import (
    MdlCreateOrderRequest,
    MdlCreateOrderResponse,
    MdlVerifyPaymentRequest,
    MdlSubscriptionStatus,
    MdlAdminActivateRequest,
    MdlAdminSuspendRequest,
    MdlAdminRecordPaymentRequest,
)
from app.api.subscription.service import ClsSubscriptionService
from app.core.dependency import fnGetContext, MdlDepndencyContext
from app.core.database import ClsDatabasepool
from app.core.security import fnGetAdminUser
from app.core.logger import getLogger

logger = getLogger()

router = APIRouter(prefix="/subscription", tags=["Subscription"])


@router.get("/status")
async def fnGetSubscriptionStatus(objContext: MdlDepndencyContext = Depends(fnGetContext)):
    """Get current user's subscription status"""
    try:
        insService = ClsSubscriptionService(objContext.objPool, objContext.intUserId)
        dctStatus = await insService.fnGetStatus()

        if not dctStatus:
            return {"strStatus": "none", "strMessage": "No subscription found"}

        return dctStatus

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription status error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subscription status"
        )


@router.post("/create-order", response_model=MdlCreateOrderResponse)
async def fnCreateOrder(
    mdlRequest: MdlCreateOrderRequest,
    objContext: MdlDepndencyContext = Depends(fnGetContext)
):
    """Create Razorpay order for subscription payment"""
    try:
        insService = ClsSubscriptionService(objContext.objPool, objContext.intUserId)
        return await insService.fnCreateOrder(mdlRequest.intPlanId)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create order error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment order"
        )


@router.post("/verify-payment")
async def fnVerifyPayment(
    mdlRequest: MdlVerifyPaymentRequest,
    objContext: MdlDepndencyContext = Depends(fnGetContext)
):
    """Verify Razorpay payment and activate subscription"""
    try:
        insService = ClsSubscriptionService(objContext.objPool, objContext.intUserId)
        return await insService.fnVerifyPayment(
            mdlRequest.strRazorpayPaymentId,
            mdlRequest.strRazorpayOrderId,
            mdlRequest.strRazorpaySignature,
            mdlRequest.intPlanId,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment verification failed"
        )


# =====================================================
# ADMIN ENDPOINTS
# =====================================================

async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


@router.get("/admin/list")
async def fnAdminGetAllSubscriptions(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: Get all users with subscription status"""
    insService = ClsSubscriptionService(insPool, intUserId)
    return await insService.fnAdminGetAllSubscriptions()


@router.post("/admin/activate")
async def fnAdminActivate(
    mdlRequest: MdlAdminActivateRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: Activate or extend a user's subscription"""
    insService = ClsSubscriptionService(insPool, intUserId)
    return await insService.fnAdminActivate(
        mdlRequest.intTargetUserId,
        mdlRequest.intPlanId,
        mdlRequest.intDays
    )


@router.post("/admin/suspend")
async def fnAdminSuspend(
    mdlRequest: MdlAdminSuspendRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: Suspend a user's subscription"""
    insService = ClsSubscriptionService(insPool, intUserId)
    return await insService.fnAdminSuspend(mdlRequest.intTargetUserId)


@router.post("/admin/record-payment")
async def fnAdminRecordPayment(
    mdlRequest: MdlAdminRecordPaymentRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: Record manual payment and activate subscription"""
    insService = ClsSubscriptionService(insPool, intUserId)
    return await insService.fnAdminRecordPayment(
        mdlRequest.intTargetUserId,
        mdlRequest.intPlanId,
        mdlRequest.dblAmount,
        mdlRequest.strPaymentMethod,
        mdlRequest.strReference,
        mdlRequest.strNotes,
        mdlRequest.intDays
    )


@router.get("/admin/payments")
async def fnAdminGetPayments(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: Get all payment history"""
    insService = ClsSubscriptionService(insPool, intUserId)
    return await insService.fnAdminGetPayments()
