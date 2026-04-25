import json
from datetime import date
from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.core.logger import getLogger


def _fnParseFeatures(val):
    """asyncpg returns JSONB as string by default; parse to list for Pydantic."""
    if val is None:
        return []
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return []
    return val
from app.api.plan.schema import (
    MdlCreatePlanRequest,
    MdlUpdatePlanRequest,
    MdlPlanInfo,
    MdlPlanModule,
    MdlPlanListResponse,
    MdlPlanResponse,
)


class ClsPlanService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId
        self.logger = getLogger()

    async def _fnGetModulesForPlans(self, lstPlanIds: list) -> dict:
        """Fetch module permissions for multiple plans, returns {plan_id: [MdlPlanModule, ...]}"""
        if not lstPlanIds:
            return {}

        async with self.insPool.acquire() as conn:
            rstModules = await conn.fetch(
                """SELECT pm.fk_bint_plan_id,
                          pm.fk_bint_module_id,
                          pm.int_create,
                          pm.int_read,
                          pm.int_update,
                          pm.int_delete,
                          pm.int_print,
                          pm.vchr_quota_period,
                          m.vchr_display_name,
                          m.vchr_module_key,
                          m.vchr_icon
                   FROM tbl_plan_module pm
                   JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
                   WHERE pm.fk_bint_plan_id = ANY($1::bigint[])
                   ORDER BY m.int_sort_order""",
                lstPlanIds
            )

        dctModules = {}
        for row in rstModules:
            intPlanId = row['fk_bint_plan_id']
            if intPlanId not in dctModules:
                dctModules[intPlanId] = []
            dctModules[intPlanId].append(MdlPlanModule(
                intModuleId=row['fk_bint_module_id'],
                strModuleKey=row['vchr_module_key'],
                strDisplayName=row['vchr_display_name'],
                strIcon=row['vchr_icon'],
                intCreate=row['int_create'],
                intRead=row['int_read'],
                intUpdate=row['int_update'],
                intDelete=row['int_delete'],
                intPrint=row['int_print'],
                strQuotaPeriod=row['vchr_quota_period'],
            ))

        return dctModules

    async def _fnSaveModules(self, conn, intPlanId: int, lstModules: list):
        """Delete old module perms and insert new ones for a plan"""
        await conn.execute(
            "DELETE FROM tbl_plan_module WHERE fk_bint_plan_id = $1",
            intPlanId
        )
        for mod in lstModules:
            await conn.execute(
                """INSERT INTO tbl_plan_module
                   (fk_bint_plan_id, fk_bint_module_id, int_create, int_read, int_update, int_delete, int_print, vchr_quota_period)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                intPlanId,
                mod.intModuleId,
                mod.intCreate,
                mod.intRead,
                mod.intUpdate,
                mod.intDelete,
                mod.intPrint,
                mod.strQuotaPeriod,
            )

    async def fnGetActivePublicPlans(self):
        """Get active, public, paid plans with module permissions.
        Used by the in-app Subscribe/Upgrade page (logged-in users).
        Returns a plain dict to keep the public response stable.
        """
        async with self.insPool.acquire() as conn:
            rstPlans = await conn.fetch(
                """SELECT pk_bint_plan_id, vchr_plan_name, vchr_display_name,
                          txt_description, dbl_price_monthly, dbl_price_yearly,
                          vchr_currency, vchr_offer_label,
                          dbl_offer_price_monthly, dbl_offer_price_yearly,
                          bln_offer_active, dat_offer_valid_until,
                          int_trial_days, int_grace_period_days,
                          jsonb_features_display, int_sort_order
                   FROM tbl_subscription_plan
                   WHERE bln_active = true AND bln_is_public = true AND dbl_price_yearly > 0
                   ORDER BY int_sort_order, dbl_price_yearly"""
            )

            lstPlanIds = [row['pk_bint_plan_id'] for row in rstPlans]
            rstModules = await conn.fetch(
                """SELECT pm.fk_bint_plan_id, pm.int_create, pm.int_read, pm.int_update,
                          pm.int_delete, pm.int_print, pm.vchr_quota_period,
                          m.vchr_display_name, m.vchr_module_key, m.vchr_icon
                   FROM tbl_plan_module pm
                   JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
                   WHERE pm.fk_bint_plan_id = ANY($1::bigint[])
                   ORDER BY m.int_sort_order""",
                lstPlanIds
            ) if lstPlanIds else []

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
                "strQuotaPeriod": row['vchr_quota_period'],
            })

        today = date.today()
        lstOut = []
        for row in rstPlans:
            blnOfferValid = bool(row['bln_offer_active']) and (
                row['dat_offer_valid_until'] is None or row['dat_offer_valid_until'] >= today
            )
            lstOut.append({
                "intPlanId": row['pk_bint_plan_id'],
                "strPlanName": row['vchr_plan_name'],
                "strDisplayName": row['vchr_display_name'],
                "strDescription": row['txt_description'],
                "dblPriceMonthly": float(row['dbl_price_monthly']),
                "dblPriceYearly": float(row['dbl_price_yearly']),
                "strCurrency": row['vchr_currency'],
                "strOfferLabel": row['vchr_offer_label'],
                "dblOfferPriceMonthly": float(row['dbl_offer_price_monthly']) if row['dbl_offer_price_monthly'] is not None else None,
                "dblOfferPriceYearly": float(row['dbl_offer_price_yearly']) if row['dbl_offer_price_yearly'] is not None else None,
                "blnOfferActive": blnOfferValid,
                "datOfferValidUntil": str(row['dat_offer_valid_until']) if row['dat_offer_valid_until'] else None,
                "intTrialDays": row['int_trial_days'],
                "intGracePeriodDays": row['int_grace_period_days'],
                "jsonbFeaturesDisplay": _fnParseFeatures(row['jsonb_features_display']),
                "lstModules": dctModules.get(row['pk_bint_plan_id'], []),
            })

        return {"lstPlans": lstOut}

    async def fnGetAllPlans(self):
        """Get all subscription plans with subscriber counts and module permissions"""
        strQuery = """
            SELECT p.*,
                   COALESCE(sub.cnt, 0) AS int_subscriber_count
            FROM tbl_subscription_plan p
            LEFT JOIN (
                SELECT fk_bint_plan_id, COUNT(*) AS cnt
                FROM tbl_user
                WHERE vchr_plan_status IN ('trial', 'active')
                  AND fk_bint_plan_id IS NOT NULL
                GROUP BY fk_bint_plan_id
            ) sub ON sub.fk_bint_plan_id = p.pk_bint_plan_id
            ORDER BY p.int_sort_order, p.pk_bint_plan_id
        """

        async with self.insPool.acquire() as conn:
            rstPlans = await conn.fetch(strQuery)

        if not rstPlans:
            return MdlPlanListResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No plans found",
                lstPlans=[]
            )

        lstPlanIds = [row['pk_bint_plan_id'] for row in rstPlans]
        dctModules = await self._fnGetModulesForPlans(lstPlanIds)

        lstPlans = [
            MdlPlanInfo(
                intPlanId=row['pk_bint_plan_id'],
                strPlanName=row['vchr_plan_name'],
                strDisplayName=row['vchr_display_name'],
                strDescription=row['txt_description'],
                dblPriceMonthly=float(row['dbl_price_monthly']),
                dblPriceYearly=float(row['dbl_price_yearly']),
                strCurrency=row['vchr_currency'],
                strOfferLabel=row['vchr_offer_label'],
                dblOfferPriceMonthly=float(row['dbl_offer_price_monthly']) if row['dbl_offer_price_monthly'] is not None else None,
                dblOfferPriceYearly=float(row['dbl_offer_price_yearly']) if row['dbl_offer_price_yearly'] is not None else None,
                blnOfferActive=row['bln_offer_active'],
                datOfferValidUntil=row['dat_offer_valid_until'],
                intTrialDays=row['int_trial_days'],
                intGracePeriodDays=row['int_grace_period_days'],
                jsonbFeaturesDisplay=_fnParseFeatures(row['jsonb_features_display']),
                intSortOrder=row['int_sort_order'],
                blnIsPublic=row['bln_is_public'],
                blnActive=row['bln_active'],
                intSubscriberCount=row['int_subscriber_count'],
                lstModules=dctModules.get(row['pk_bint_plan_id'], [])
            )
            for row in rstPlans
        ]

        return MdlPlanListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstPlans)} plans",
            lstPlans=lstPlans
        )

    async def fnCreatePlan(self, mdlRequest: MdlCreatePlanRequest):
        """Create new subscription plan with module permissions"""
        self.logger.info(f"Creating plan: {mdlRequest.strPlanName}")

        async with self.insPool.acquire() as conn:
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_plan_id FROM tbl_subscription_plan WHERE vchr_plan_name = $1",
                mdlRequest.strPlanName
            )
            if rstExisting:
                return MdlPlanResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage=f"Plan name '{mdlRequest.strPlanName}' already exists",
                    data=None
                )

            rstNew = await conn.fetchrow(
                """INSERT INTO tbl_subscription_plan (
                    vchr_plan_name, vchr_display_name, txt_description,
                    dbl_price_monthly, dbl_price_yearly, vchr_currency,
                    vchr_offer_label, dbl_offer_price_monthly, dbl_offer_price_yearly,
                    bln_offer_active, dat_offer_valid_until,
                    int_trial_days, int_grace_period_days, jsonb_features_display,
                    int_sort_order, bln_is_public, bln_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17)
                RETURNING pk_bint_plan_id""",
                mdlRequest.strPlanName,
                mdlRequest.strDisplayName,
                mdlRequest.strDescription,
                mdlRequest.dblPriceMonthly,
                mdlRequest.dblPriceYearly,
                mdlRequest.strCurrency,
                mdlRequest.strOfferLabel,
                mdlRequest.dblOfferPriceMonthly,
                mdlRequest.dblOfferPriceYearly,
                mdlRequest.blnOfferActive,
                mdlRequest.datOfferValidUntil,
                mdlRequest.intTrialDays,
                mdlRequest.intGracePeriodDays,
                json.dumps(mdlRequest.jsonbFeaturesDisplay or []),
                mdlRequest.intSortOrder,
                mdlRequest.blnIsPublic,
                mdlRequest.blnActive
            )

            intNewPlanId = rstNew['pk_bint_plan_id']

            if mdlRequest.lstModules:
                await self._fnSaveModules(conn, intNewPlanId, mdlRequest.lstModules)

            self.logger.info(f"Plan created: ID={intNewPlanId} with {len(mdlRequest.lstModules)} modules")

            dctModules = await self._fnGetModulesForPlans([intNewPlanId])

            return MdlPlanResponse(
                intStatus=ResponseStatus.SUCCESS,
                strStatus=ResponseStatus.SUCCESS_STR,
                intStatusCode=ResponseStatus.HTTP_OK,
                strMessage="Plan created successfully",
                data=MdlPlanInfo(
                    intPlanId=intNewPlanId,
                    strPlanName=mdlRequest.strPlanName,
                    strDisplayName=mdlRequest.strDisplayName,
                    strDescription=mdlRequest.strDescription,
                    dblPriceMonthly=mdlRequest.dblPriceMonthly,
                    dblPriceYearly=mdlRequest.dblPriceYearly,
                    strCurrency=mdlRequest.strCurrency,
                    strOfferLabel=mdlRequest.strOfferLabel,
                    dblOfferPriceMonthly=mdlRequest.dblOfferPriceMonthly,
                    dblOfferPriceYearly=mdlRequest.dblOfferPriceYearly,
                    blnOfferActive=mdlRequest.blnOfferActive,
                    datOfferValidUntil=mdlRequest.datOfferValidUntil,
                    intTrialDays=mdlRequest.intTrialDays,
                    intGracePeriodDays=mdlRequest.intGracePeriodDays,
                    jsonbFeaturesDisplay=mdlRequest.jsonbFeaturesDisplay or [],
                    intSortOrder=mdlRequest.intSortOrder,
                    blnIsPublic=mdlRequest.blnIsPublic,
                    blnActive=mdlRequest.blnActive,
                    intSubscriberCount=0,
                    lstModules=dctModules.get(intNewPlanId, [])
                )
            )

    async def fnUpdatePlan(self, mdlRequest: MdlUpdatePlanRequest):
        """Update existing subscription plan and module permissions"""
        self.logger.info(f"Updating plan: ID={mdlRequest.intPlanId}")

        lstSets = []
        lstParams = []
        intIdx = 1

        dctFieldMap = {
            "strDisplayName": ("vchr_display_name", mdlRequest.strDisplayName),
            "strDescription": ("txt_description", mdlRequest.strDescription),
            "dblPriceMonthly": ("dbl_price_monthly", mdlRequest.dblPriceMonthly),
            "dblPriceYearly": ("dbl_price_yearly", mdlRequest.dblPriceYearly),
            "strCurrency": ("vchr_currency", mdlRequest.strCurrency),
            "strOfferLabel": ("vchr_offer_label", mdlRequest.strOfferLabel),
            "dblOfferPriceMonthly": ("dbl_offer_price_monthly", mdlRequest.dblOfferPriceMonthly),
            "dblOfferPriceYearly": ("dbl_offer_price_yearly", mdlRequest.dblOfferPriceYearly),
            "blnOfferActive": ("bln_offer_active", mdlRequest.blnOfferActive),
            "datOfferValidUntil": ("dat_offer_valid_until", mdlRequest.datOfferValidUntil),
            "intTrialDays": ("int_trial_days", mdlRequest.intTrialDays),
            "intGracePeriodDays": ("int_grace_period_days", mdlRequest.intGracePeriodDays),
            "intSortOrder": ("int_sort_order", mdlRequest.intSortOrder),
            "blnIsPublic": ("bln_is_public", mdlRequest.blnIsPublic),
            "blnActive": ("bln_active", mdlRequest.blnActive),
        }

        for strField, (strCol, val) in dctFieldMap.items():
            if val is not None:
                lstSets.append(f"{strCol} = ${intIdx}")
                lstParams.append(val)
                intIdx += 1

        # Handle jsonbFeaturesDisplay separately (needs JSON serialization)
        if mdlRequest.jsonbFeaturesDisplay is not None:
            lstSets.append(f"jsonb_features_display = ${intIdx}::jsonb")
            lstParams.append(json.dumps(mdlRequest.jsonbFeaturesDisplay))
            intIdx += 1

        async with self.insPool.acquire() as conn:
            if lstSets:
                lstParams.append(mdlRequest.intPlanId)
                strQuery = f"UPDATE tbl_subscription_plan SET {', '.join(lstSets)} WHERE pk_bint_plan_id = ${intIdx} RETURNING *"
                rstUpdated = await conn.fetchrow(strQuery, *lstParams)
                if not rstUpdated:
                    return MdlPlanResponse(
                        intStatus=ResponseStatus.NO_DATA,
                        strStatus=ResponseStatus.NO_DATA_STR,
                        intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                        strMessage="Plan not found",
                        data=None
                    )
            else:
                rstUpdated = await conn.fetchrow(
                    "SELECT * FROM tbl_subscription_plan WHERE pk_bint_plan_id = $1",
                    mdlRequest.intPlanId
                )
                if not rstUpdated:
                    return MdlPlanResponse(
                        intStatus=ResponseStatus.NO_DATA,
                        strStatus=ResponseStatus.NO_DATA_STR,
                        intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                        strMessage="Plan not found",
                        data=None
                    )

            if mdlRequest.lstModules is not None:
                await self._fnSaveModules(conn, mdlRequest.intPlanId, mdlRequest.lstModules)

        dctModules = await self._fnGetModulesForPlans([mdlRequest.intPlanId])

        self.logger.info(f"Plan updated: ID={mdlRequest.intPlanId}")
        return MdlPlanResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Plan updated successfully",
            data=MdlPlanInfo(
                intPlanId=rstUpdated['pk_bint_plan_id'],
                strPlanName=rstUpdated['vchr_plan_name'],
                strDisplayName=rstUpdated['vchr_display_name'],
                strDescription=rstUpdated['txt_description'],
                dblPriceMonthly=float(rstUpdated['dbl_price_monthly']),
                dblPriceYearly=float(rstUpdated['dbl_price_yearly']),
                strCurrency=rstUpdated['vchr_currency'],
                strOfferLabel=rstUpdated['vchr_offer_label'],
                dblOfferPriceMonthly=float(rstUpdated['dbl_offer_price_monthly']) if rstUpdated['dbl_offer_price_monthly'] is not None else None,
                dblOfferPriceYearly=float(rstUpdated['dbl_offer_price_yearly']) if rstUpdated['dbl_offer_price_yearly'] is not None else None,
                blnOfferActive=rstUpdated['bln_offer_active'],
                datOfferValidUntil=rstUpdated['dat_offer_valid_until'],
                intTrialDays=rstUpdated['int_trial_days'],
                intGracePeriodDays=rstUpdated['int_grace_period_days'],
                jsonbFeaturesDisplay=_fnParseFeatures(rstUpdated['jsonb_features_display']),
                intSortOrder=rstUpdated['int_sort_order'],
                blnIsPublic=rstUpdated['bln_is_public'],
                blnActive=rstUpdated['bln_active'],
                lstModules=dctModules.get(mdlRequest.intPlanId, [])
            )
        )

    async def fnDeletePlan(self, intPlanId: int):
        """Delete a plan (only if no active subscribers)"""
        self.logger.info(f"Deleting plan: ID={intPlanId}")

        async with self.insPool.acquire() as conn:
            rstCount = await conn.fetchrow(
                "SELECT COUNT(*) AS cnt FROM tbl_user WHERE fk_bint_plan_id = $1 AND vchr_plan_status IN ('trial', 'active')",
                intPlanId
            )
            if rstCount and rstCount['cnt'] > 0:
                return MdlPlanResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage=f"Cannot delete plan with {rstCount['cnt']} active subscribers. Deactivate it instead.",
                    data=None
                )

            # CASCADE deletes tbl_plan_module rows
            rstDeleted = await conn.fetchrow(
                "DELETE FROM tbl_subscription_plan WHERE pk_bint_plan_id = $1 RETURNING pk_bint_plan_id",
                intPlanId
            )

        if not rstDeleted:
            return MdlPlanResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Plan not found",
                data=None
            )

        self.logger.info(f"Plan deleted: ID={intPlanId}")
        return MdlPlanResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Plan deleted",
            data=None
        )
