"""
App Settings Helper
─────────────────
Usage anywhere in the backend:

    from app.core.settings import fnGetSetting

    # Get system default
    tax = await fnGetSetting(pool, "default_tax_percent")  # "18"

    # Get user-specific (falls back to system default)
    tax = await fnGetSetting(pool, "default_tax_percent", userId=5)  # "12" if overridden, else "18"
"""


async def fnGetSetting(objPool, strKey: str, intUserId: int = None, strDefault: str = None) -> str:
    """
    Get a setting value.
    1. Check tbl_user_settings (if userId provided)
    2. Fallback to tbl_settings (system default)
    3. Fallback to strDefault
    """
    async with objPool.acquire() as conn:
        # Check user override first
        if intUserId:
            rstUser = await conn.fetchrow(
                "SELECT vchr_value FROM tbl_user_settings WHERE fk_bint_user_id = $1 AND vchr_key = $2",
                intUserId, strKey
            )
            if rstUser and rstUser['vchr_value'] is not None:
                return rstUser['vchr_value']

        # Fallback to system default
        rstSystem = await conn.fetchrow(
            "SELECT vchr_value FROM tbl_settings WHERE vchr_key = $1",
            strKey
        )
        if rstSystem and rstSystem['vchr_value'] is not None:
            return rstSystem['vchr_value']

    return strDefault


async def fnGetSettingBool(objPool, strKey: str, intUserId: int = None, blnDefault: bool = False) -> bool:
    """Get a boolean setting"""
    val = await fnGetSetting(objPool, strKey, intUserId, str(blnDefault).lower())
    return val.lower() in ("true", "1", "yes")


async def fnGetSettingInt(objPool, strKey: str, intUserId: int = None, intDefault: int = 0) -> int:
    """Get an integer setting"""
    val = await fnGetSetting(objPool, strKey, intUserId, str(intDefault))
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return intDefault
