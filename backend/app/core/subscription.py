from datetime import date
from fastapi import HTTPException, status


async def fnCheckSubscription(objPool, intUserId: int) -> dict:
    """
    Check if user has an active subscription.
    Returns subscription info if active.
    Raises HTTP 402 if expired.
    Skips check for admin user (user_id=1).
    """
    # Admin bypass
    if intUserId == 1:
        return {"strStatus": "active", "strPlanName": "admin"}

    # Check if user is active
    async with objPool.acquire() as conn:
        rstUser = await conn.fetchrow(
            "SELECT bln_is_active FROM tbl_user WHERE pk_bint_user_id = $1",
            intUserId
        )
        if rstUser and not rstUser.get('bln_is_active', True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support."
            )

    async with objPool.acquire() as conn:
        rstSub = await conn.fetchrow(
            """SELECT s.vchr_status, s.dat_end_date, s.fk_bint_plan_id,
                      p.vchr_plan_name
               FROM tbl_subscription s
               JOIN tbl_subscription_plan p ON s.fk_bint_plan_id = p.pk_bint_plan_id
               WHERE s.fk_bint_user_id = $1
               ORDER BY s.pk_bint_subscription_id DESC
               LIMIT 1""",
            intUserId
        )

    if not rstSub:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No subscription found. Please subscribe to continue."
        )

    strStatus = rstSub['vchr_status']
    intDaysRemaining = (rstSub['dat_end_date'] - date.today()).days

    # Auto-expire
    if intDaysRemaining < 0 and strStatus in ('trial', 'active'):
        strStatus = 'expired'
        async with objPool.acquire() as conn:
            await conn.execute(
                "UPDATE tbl_subscription SET vchr_status = 'expired' WHERE fk_bint_user_id = $1 AND vchr_status IN ('trial', 'active')",
                intUserId
            )

    if strStatus in ('expired', 'cancelled'):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your subscription has expired. Please renew to continue."
        )

    if strStatus == 'suspended':
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your account has been suspended. Please contact support."
        )

    return {
        "strStatus": strStatus,
        "strPlanName": rstSub['vchr_plan_name'],
        "intDaysRemaining": max(intDaysRemaining, 0),
    }
