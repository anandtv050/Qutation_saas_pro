from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.core.logger import getLogger
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
                """SELECT pm.fk_bint_plan_id, pm.fk_bint_module_id,
                          pm.int_create, pm.int_read, pm.int_update, pm.int_delete, pm.int_print,
                          pm.int_monthly_limit, pm.int_daily_limit,
                          m.vchr_module_key, m.vchr_display_name, m.vchr_icon
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
                intMonthlyLimit=row['int_monthly_limit'],
                intDailyLimit=row['int_daily_limit'],
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
                   (fk_bint_plan_id, fk_bint_module_id, int_create, int_read, int_update, int_delete, int_print, int_monthly_limit, int_daily_limit)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                intPlanId,
                mod.intModuleId,
                mod.intCreate,
                mod.intRead,
                mod.intUpdate,
                mod.intDelete,
                mod.intPrint,
                mod.intMonthlyLimit,
                mod.intDailyLimit,
            )

    async def fnGetAllPlans(self):
        """Get all subscription plans with subscriber counts and module permissions"""
        strQuery = """
            SELECT p.*,
                   COALESCE(sub.cnt, 0) AS int_subscriber_count
            FROM tbl_subscription_plan p
            LEFT JOIN (
                SELECT fk_bint_plan_id, COUNT(*) AS cnt
                FROM tbl_subscription
                WHERE vchr_status IN ('trial', 'active')
                GROUP BY fk_bint_plan_id
            ) sub ON sub.fk_bint_plan_id = p.pk_bint_plan_id
            ORDER BY p.pk_bint_plan_id
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
                dblPriceMonthly=float(row['dbl_price_monthly']),
                dblPriceYearly=float(row['dbl_price_yearly']),
                intMaxQuotationsPerMonth=row['int_max_quotations_per_month'],
                intMaxUsers=row['int_max_users'],
                blnAiEnabled=row['bln_ai_enabled'],
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
                    vchr_plan_name, vchr_display_name, dbl_price_monthly, dbl_price_yearly,
                    int_max_quotations_per_month, int_max_users, bln_ai_enabled, bln_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING pk_bint_plan_id""",
                mdlRequest.strPlanName,
                mdlRequest.strDisplayName,
                mdlRequest.dblPriceMonthly,
                mdlRequest.dblPriceYearly,
                mdlRequest.intMaxQuotationsPerMonth or -1,
                mdlRequest.intMaxUsers or 1,
                mdlRequest.blnAiEnabled if mdlRequest.blnAiEnabled is not None else True,
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
                    dblPriceMonthly=mdlRequest.dblPriceMonthly,
                    dblPriceYearly=mdlRequest.dblPriceYearly,
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

        if mdlRequest.strDisplayName is not None:
            lstSets.append(f"vchr_display_name = ${intIdx}")
            lstParams.append(mdlRequest.strDisplayName)
            intIdx += 1
        if mdlRequest.dblPriceMonthly is not None:
            lstSets.append(f"dbl_price_monthly = ${intIdx}")
            lstParams.append(mdlRequest.dblPriceMonthly)
            intIdx += 1
        if mdlRequest.dblPriceYearly is not None:
            lstSets.append(f"dbl_price_yearly = ${intIdx}")
            lstParams.append(mdlRequest.dblPriceYearly)
            intIdx += 1
        if mdlRequest.intMaxQuotationsPerMonth is not None:
            lstSets.append(f"int_max_quotations_per_month = ${intIdx}")
            lstParams.append(mdlRequest.intMaxQuotationsPerMonth)
            intIdx += 1
        if mdlRequest.intMaxUsers is not None:
            lstSets.append(f"int_max_users = ${intIdx}")
            lstParams.append(mdlRequest.intMaxUsers)
            intIdx += 1
        if mdlRequest.blnAiEnabled is not None:
            lstSets.append(f"bln_ai_enabled = ${intIdx}")
            lstParams.append(mdlRequest.blnAiEnabled)
            intIdx += 1
        if mdlRequest.blnActive is not None:
            lstSets.append(f"bln_active = ${intIdx}")
            lstParams.append(mdlRequest.blnActive)
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
                dblPriceMonthly=float(rstUpdated['dbl_price_monthly']),
                dblPriceYearly=float(rstUpdated['dbl_price_yearly']),
                intMaxQuotationsPerMonth=rstUpdated['int_max_quotations_per_month'],
                intMaxUsers=rstUpdated['int_max_users'],
                blnAiEnabled=rstUpdated['bln_ai_enabled'],
                blnActive=rstUpdated['bln_active'],
                lstModules=dctModules.get(mdlRequest.intPlanId, [])
            )
        )

    async def fnDeletePlan(self, intPlanId: int):
        """Delete a plan (only if no active subscribers)"""
        self.logger.info(f"Deleting plan: ID={intPlanId}")

        async with self.insPool.acquire() as conn:
            rstCount = await conn.fetchrow(
                "SELECT COUNT(*) AS cnt FROM tbl_subscription WHERE fk_bint_plan_id = $1 AND vchr_status IN ('trial', 'active')",
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
