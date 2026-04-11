from fastapi import APIRouter, Depends
from asyncpg import Pool

from app.core.database import ClsDatabasepool
from app.core.security import fnGetAdminUser
from app.core.logger import getLogger
from app.api.plan.service import ClsPlanService
from app.api.plan.schema import (
    MdlCreatePlanRequest,
    MdlUpdatePlanRequest,
    MdlDeletePlanRequest,
    MdlPlanListResponse,
    MdlPlanResponse,
)

logger = getLogger()

router = APIRouter(prefix="/plan", tags=["Plan Management"])


async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


@router.post("/list", response_model=MdlPlanListResponse)
async def fnGetAllPlans(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get all subscription plans (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnGetAllPlans()


@router.get("/active")
async def fnGetActivePlans(
    insPool: Pool = Depends(fnGetPool),
    include_free: bool = False,
):
    """Get active plans with module permissions (public - for subscribe/landing page)"""
    if include_free:
        strFilter = "WHERE bln_active = true"
    else:
        strFilter = "WHERE bln_active = true AND dbl_price_yearly > 0"

    async with insPool.acquire() as conn:
        rstPlans = await conn.fetch(
            f"""SELECT pk_bint_plan_id, vchr_plan_name, vchr_display_name,
                      dbl_price_monthly, dbl_price_yearly,
                      int_max_quotations_per_month, int_max_users, bln_ai_enabled
               FROM tbl_subscription_plan
               {strFilter}
               ORDER BY dbl_price_yearly"""
        )

        # Fetch module permissions for all active plans
        lstPlanIds = [row['pk_bint_plan_id'] for row in rstPlans]
        rstModules = await conn.fetch(
            """SELECT pm.fk_bint_plan_id, pm.int_create, pm.int_read, pm.int_update,
                      pm.int_delete, pm.int_print, pm.int_monthly_limit, pm.int_daily_limit,
                      m.vchr_module_key, m.vchr_display_name, m.vchr_icon
               FROM tbl_plan_module pm
               JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
               WHERE pm.fk_bint_plan_id = ANY($1::bigint[])
               ORDER BY m.int_sort_order""",
            lstPlanIds
        ) if lstPlanIds else []

    # Group modules by plan
    dctModules = {}
    for row in rstModules:
        intPlanId = row['fk_bint_plan_id']
        if intPlanId not in dctModules:
            dctModules[intPlanId] = []
        dctModules[intPlanId].append({
            "strModuleKey": row['vchr_module_key'],
            "strDisplayName": row['vchr_display_name'],
            "strIcon": row['vchr_icon'],
            "intCreate": row['int_create'],
            "intRead": row['int_read'],
            "intUpdate": row['int_update'],
            "intDelete": row['int_delete'],
            "intPrint": row['int_print'],
            "intMonthlyLimit": row['int_monthly_limit'],
            "intDailyLimit": row['int_daily_limit'],
        })

    return {
        "lstPlans": [
            {
                "intPlanId": row['pk_bint_plan_id'],
                "strPlanName": row['vchr_plan_name'],
                "strDisplayName": row['vchr_display_name'],
                "dblPriceMonthly": float(row['dbl_price_monthly']),
                "dblPriceYearly": float(row['dbl_price_yearly']),
                "intMaxQuotationsPerMonth": row['int_max_quotations_per_month'],
                "intMaxUsers": row['int_max_users'],
                "blnAiEnabled": row['bln_ai_enabled'],
                "lstModules": dctModules.get(row['pk_bint_plan_id'], []),
            }
            for row in rstPlans
        ]
    }


@router.post("/add", response_model=MdlPlanResponse)
async def fnCreatePlan(
    mdlRequest: MdlCreatePlanRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Create new subscription plan (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnCreatePlan(mdlRequest)


@router.post("/update", response_model=MdlPlanResponse)
async def fnUpdatePlan(
    mdlRequest: MdlUpdatePlanRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Update subscription plan (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnUpdatePlan(mdlRequest)


@router.post("/delete", response_model=MdlPlanResponse)
async def fnDeletePlan(
    mdlRequest: MdlDeletePlanRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Delete subscription plan (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnDeletePlan(mdlRequest.intPlanId)
