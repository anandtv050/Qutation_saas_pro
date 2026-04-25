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

    # Check account status + plan from tbl_user (plan lives on user after B2B refactor)
    async with objPool.acquire() as conn:
        rstUser = await conn.fetchrow(
            """SELECT u.bln_is_active, u.vchr_plan_status, u.dat_plan_end_date,
                      u.fk_bint_plan_id, p.vchr_plan_name
               FROM tbl_user u
               LEFT JOIN tbl_subscription_plan p ON u.fk_bint_plan_id = p.pk_bint_plan_id
               WHERE u.pk_bint_user_id = $1""",
            intUserId
        )

    if not rstUser:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if not rstUser.get('bln_is_active', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    if rstUser['fk_bint_plan_id'] is None or rstUser['dat_plan_end_date'] is None:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No plan assigned. Please contact support."
        )

    strStatus = rstUser['vchr_plan_status']
    intDaysRemaining = (rstUser['dat_plan_end_date'] - date.today()).days

    # Live expiry check — no cron needed
    if intDaysRemaining < 0 and strStatus in ('trial', 'active'):
        strStatus = 'expired'

    if strStatus in ('expired', 'canceled'):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your subscription has expired. Please renew to continue."
        )

    if strStatus in ('paused', 'past_due'):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your account has been suspended. Please contact support."
        )

    return {
        "strStatus": strStatus,
        "strPlanName": rstUser['vchr_plan_name'],
        "intDaysRemaining": max(intDaysRemaining, 0),
    }
