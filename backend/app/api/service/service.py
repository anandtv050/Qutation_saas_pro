from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.core.logger import getLogger
from app.api.service.schema import (
    MdlCreateServiceRequest, MdlUpdateServiceRequest,
    MdlServiceInfo, MdlServiceDetail,
    MdlServiceListResponse, MdlServiceDetailResponse,
)


class ClsServiceMasterService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId
        self.logger = getLogger()

    async def fnGetAllServices(self, blnIncludeInactive: bool = False):
        """Get all services with user counts"""
        strWhere = "" if blnIncludeInactive else "WHERE s.bln_active = true"

        strQuery = f"""
            SELECT s.*,
                   COALESCE(u.cnt, 0) AS int_user_count
            FROM tbl_service s
            LEFT JOIN (
                SELECT fk_bint_service_id, COUNT(*) AS cnt
                FROM tbl_user
                WHERE fk_bint_service_id IS NOT NULL
                GROUP BY fk_bint_service_id
            ) u ON u.fk_bint_service_id = s.pk_bint_service_id
            {strWhere}
            ORDER BY s.int_sort_order, s.pk_bint_service_id
        """

        async with self.insPool.acquire() as conn:
            rstServices = await conn.fetch(strQuery)

        lstServices = [
            MdlServiceInfo(
                intServiceId=row['pk_bint_service_id'],
                strServiceName=row['vchr_service_name'],
                strDisplayName=row['vchr_display_name'],
                strDescription=row['txt_description'],
                blnAiReady=row['bln_ai_ready'],
                blnActive=row['bln_active'],
                intSortOrder=row['int_sort_order'],
                intUserCount=row['int_user_count'],
                blnHasPrompt=bool(row['txt_ai_prompt']),
            )
            for row in rstServices
        ]

        return MdlServiceListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstServices)} services",
            lstServices=lstServices
        )

    async def fnGetServiceDetail(self, intServiceId: int):
        """Get service detail including prompt (admin only)"""
        async with self.insPool.acquire() as conn:
            rstService = await conn.fetchrow(
                "SELECT * FROM tbl_service WHERE pk_bint_service_id = $1",
                intServiceId
            )

        if not rstService:
            return MdlServiceDetailResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Service not found",
                data=None
            )

        return MdlServiceDetailResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Service found",
            data=MdlServiceDetail(
                intServiceId=rstService['pk_bint_service_id'],
                strServiceName=rstService['vchr_service_name'],
                strDisplayName=rstService['vchr_display_name'],
                strDescription=rstService['txt_description'],
                strAiPrompt=rstService['txt_ai_prompt'],
                blnAiReady=rstService['bln_ai_ready'],
                blnActive=rstService['bln_active'],
                intSortOrder=rstService['int_sort_order'],
                blnHasPrompt=bool(rstService['txt_ai_prompt']),
            )
        )

    async def fnCreateService(self, mdlRequest: MdlCreateServiceRequest):
        """Create new service"""
        async with self.insPool.acquire() as conn:
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_service_id FROM tbl_service WHERE vchr_service_name = $1",
                mdlRequest.strServiceName
            )
            if rstExisting:
                return MdlServiceDetailResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage=f"Service '{mdlRequest.strServiceName}' already exists",
                    data=None
                )

            rstNew = await conn.fetchrow(
                """INSERT INTO tbl_service (
                    vchr_service_name, vchr_display_name, txt_description,
                    txt_ai_prompt, bln_ai_ready, bln_active, int_sort_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING pk_bint_service_id""",
                mdlRequest.strServiceName, mdlRequest.strDisplayName,
                mdlRequest.strDescription, mdlRequest.strAiPrompt,
                mdlRequest.blnAiReady, mdlRequest.blnActive, mdlRequest.intSortOrder
            )

        self.logger.info(f"Service created: {mdlRequest.strServiceName}")
        return await self.fnGetServiceDetail(rstNew['pk_bint_service_id'])

    async def fnUpdateService(self, mdlRequest: MdlUpdateServiceRequest):
        """Update service"""
        lstSets = []
        lstParams = []
        intIdx = 1

        for strField, strCol in [
            ("strDisplayName", "vchr_display_name"),
            ("strDescription", "txt_description"),
            ("strAiPrompt", "txt_ai_prompt"),
        ]:
            val = getattr(mdlRequest, strField)
            if val is not None:
                lstSets.append(f"{strCol} = ${intIdx}")
                lstParams.append(val)
                intIdx += 1

        for strField, strCol in [
            ("blnAiReady", "bln_ai_ready"),
            ("blnActive", "bln_active"),
        ]:
            val = getattr(mdlRequest, strField)
            if val is not None:
                lstSets.append(f"{strCol} = ${intIdx}")
                lstParams.append(val)
                intIdx += 1

        if mdlRequest.intSortOrder is not None:
            lstSets.append(f"int_sort_order = ${intIdx}")
            lstParams.append(mdlRequest.intSortOrder)
            intIdx += 1

        if not lstSets:
            return MdlServiceDetailResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="No fields to update",
                data=None
            )

        lstParams.append(mdlRequest.intServiceId)
        strQuery = f"UPDATE tbl_service SET {', '.join(lstSets)} WHERE pk_bint_service_id = ${intIdx}"

        async with self.insPool.acquire() as conn:
            await conn.execute(strQuery, *lstParams)

        self.logger.info(f"Service updated: ID={mdlRequest.intServiceId}")
        return await self.fnGetServiceDetail(mdlRequest.intServiceId)

    async def fnDeleteService(self, intServiceId: int):
        """Delete service (only if no users assigned)"""
        async with self.insPool.acquire() as conn:
            rstCount = await conn.fetchrow(
                "SELECT COUNT(*) AS cnt FROM tbl_user WHERE fk_bint_service_id = $1",
                intServiceId
            )
            if rstCount and rstCount['cnt'] > 0:
                return MdlServiceDetailResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage=f"Cannot delete service with {rstCount['cnt']} users. Deactivate instead.",
                    data=None
                )

            await conn.execute(
                "DELETE FROM tbl_service WHERE pk_bint_service_id = $1",
                intServiceId
            )

        self.logger.info(f"Service deleted: ID={intServiceId}")
        return MdlServiceDetailResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Service deleted",
            data=None
        )
