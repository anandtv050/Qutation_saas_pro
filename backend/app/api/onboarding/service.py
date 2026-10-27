from datetime import datetime

from fastapi import HTTPException, UploadFile, status

from app.api.onboarding import seed
from app.api.onboarding.schema import (
    MdlChecklist, MdlOnboardingState, MdlProfileRequest, MdlTradeInfo,
)
from app.api.print_settings import assets
from app.api.quotation.schema import MdlCreateQuotationRequest, MdlQuotationItemRequest
from app.api.quotation.service import ClsQuotationService
from app.core.logger import getUserLogger
from app.core.notify import fnNotifyOwner

SAMPLE_KEY = "onboarding_sample_quotation_id"
SAMPLE_ITEM_COUNT = 5


class ClsOnboardingService:
    def __init__(self, objPool, intUserId: int) -> None:
        self.objPool = objPool
        self.intUserId = intUserId
        self.logger = getUserLogger(intUserId)

    async def _fnSampleQuotationId(self, conn):
        """The sample quotation's id, or None if it was never made or has been deleted."""
        strId = await conn.fetchval(
            "SELECT vchr_value FROM tbl_user_settings WHERE fk_bint_user_id = $1 AND vchr_key = $2",
            self.intUserId, SAMPLE_KEY,
        )
        if not strId or not str(strId).isdigit():
            return None
        return await conn.fetchval(
            "SELECT pk_bint_quotation_id FROM tbl_quotation WHERE pk_bint_quotation_id = $1 AND fk_bint_user_id = $2",
            int(strId), self.intUserId,
        )

    async def fnGetState(self) -> MdlOnboardingState:
        async with self.objPool.acquire() as conn:
            rstUser = await conn.fetchrow(
                """SELECT vchr_username, vchr_business_name, vchr_phone, vchr_signup_trade,
                          bln_needs_onboarding, tim_onboarded_at, tim_first_pdf_at
                   FROM tbl_user WHERE pk_bint_user_id = $1""",
                self.intUserId,
            )
            if not rstUser:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

            intSampleId = await self._fnSampleQuotationId(conn)
            intOwnQuotations = await conn.fetchval(
                """SELECT COUNT(*) FROM tbl_quotation
                   WHERE fk_bint_user_id = $1 AND ($2::BIGINT IS NULL OR pk_bint_quotation_id <> $2)""",
                self.intUserId, intSampleId,
            )
            strLogo = await conn.fetchval(
                """SELECT vchr_logo_url FROM tbl_print_model_settings
                   WHERE fk_bint_user_id = $1 AND vchr_module = 'QUOTATION'""",
                self.intUserId,
            )

        objChecklist = MdlChecklist(
            blnFirstQuotation=intOwnQuotations > 0,
            blnLogo=bool(strLogo),
            blnPdfDownloaded=rstUser["tim_first_pdf_at"] is not None,
        )
        blnAllDone = objChecklist.blnFirstQuotation and objChecklist.blnLogo and objChecklist.blnPdfDownloaded
        return MdlOnboardingState(
            blnNeedsOnboarding=bool(rstUser["bln_needs_onboarding"]),
            blnShowChecklist=rstUser["tim_onboarded_at"] is not None and not blnAllDone,
            strUserName=rstUser["vchr_username"] or "",
            strBusinessName=rstUser["vchr_business_name"] or "",
            strPhone=rstUser["vchr_phone"] or "",
            strTrade=rstUser["vchr_signup_trade"] or "",
            intSampleQuotationId=intSampleId,
            dctChecklist=objChecklist,
            lstTrades=[MdlTradeInfo(strKey=t["key"], strLabel=t["label"]) for t in seed.fnLoadTrades().values()],
        )

    async def fnSaveProfile(self, mdlRequest: MdlProfileRequest) -> dict:
        async with self.objPool.acquire() as conn:
            await conn.execute(
                """UPDATE tbl_user
                   SET vchr_business_name = $1, vchr_phone = COALESCE($2, vchr_phone),
                       tim_updated_at = CURRENT_TIMESTAMP
                   WHERE pk_bint_user_id = $3""",
                mdlRequest.businessName, mdlRequest.phone, self.intUserId,
            )
        return {"strBusinessName": mdlRequest.businessName}

    async def fnSelectTrade(self, strTrade: str) -> dict:
        """Seed the catalogue for a trade. Safe to call repeatedly (no duplicates)."""
        dctTrade = seed.fnGetTrade(strTrade)
        if not dctTrade:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please choose a valid trade.")

        async with self.objPool.acquire() as conn:
            async with conn.transaction():
                strOldTrade = await conn.fetchval(
                    "SELECT vchr_signup_trade FROM tbl_user WHERE pk_bint_user_id = $1 FOR UPDATE",
                    self.intUserId,
                )
                # Going back and picking another trade: drop the previous trade's seeded items,
                # but only the ones the user has not edited (same code, name and rate).
                dctOld = seed.fnGetTrade(strOldTrade)
                if dctOld and dctOld["key"] != dctTrade["key"]:
                    for dctItem in dctOld["items"]:
                        await conn.execute(
                            """DELETE FROM tbl_inventory
                               WHERE fk_bint_user_id = $1 AND vchr_item_code = $2
                                 AND vchr_item_name = $3 AND dbl_unit_price = $4""",
                            self.intUserId, dctItem["code"], dctItem["name"], dctItem["price"],
                        )

                for dctItem in dctTrade["items"]:
                    await conn.execute(
                        """INSERT INTO tbl_inventory (
                               fk_bint_user_id, vchr_item_code, vchr_item_name, vchr_category,
                               vchr_unit, dbl_unit_price, int_warranty_years, int_warranty_months
                           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                           ON CONFLICT (fk_bint_user_id, vchr_item_code) WHERE vchr_item_code LIKE 'SMP-%'
                           DO NOTHING""",
                        self.intUserId, dctItem["code"], dctItem["name"], dctItem["category"],
                        dctItem["unit"], dctItem["price"], dctItem["warrantyYears"], dctItem["warrantyMonths"],
                    )

                await conn.execute(
                    """UPDATE tbl_user
                       SET vchr_signup_trade = $1,
                           fk_bint_service_id = COALESCE(
                               (SELECT pk_bint_service_id FROM tbl_service WHERE vchr_service_name = $2),
                               fk_bint_service_id)
                       WHERE pk_bint_user_id = $3""",
                    dctTrade["key"], dctTrade["service"], self.intUserId,
                )
                intCount = await conn.fetchval(
                    "SELECT COUNT(*) FROM tbl_inventory WHERE fk_bint_user_id = $1 AND vchr_item_code LIKE 'SMP-%'",
                    self.intUserId,
                )
        return {"strTrade": dctTrade["key"], "intItemCount": intCount}

    async def fnUploadLogo(self, objFile: UploadFile) -> dict:
        """Wizard step 3: store the logo and make it the quotation logo."""
        strPath = await assets.fnStoreAsset(self.objPool, self.intUserId, "logo", "QUOTATION", objFile)
        async with self.objPool.acquire() as conn:
            await conn.execute(
                """INSERT INTO tbl_print_model_settings (fk_bint_user_id, vchr_module, vchr_logo_url)
                   VALUES ($1, 'QUOTATION', $2)
                   ON CONFLICT (fk_bint_user_id, vchr_module) DO UPDATE SET vchr_logo_url = EXCLUDED.vchr_logo_url""",
                self.intUserId, strPath,
            )
        return {"vchUrl": strPath}

    async def fnFinish(self, blnSkipSample: bool = False) -> dict:
        """Create the draft sample quotation (once, unless skipped) and close the wizard."""
        # One finish at a time per user, so a double tap cannot create two samples.
        async with self.objPool.acquire() as connLock:
            await connLock.execute("SELECT pg_advisory_lock($1)", self.intUserId)
            try:
                return await self._fnFinishLocked(blnSkipSample)
            finally:
                await connLock.execute("SELECT pg_advisory_unlock($1)", self.intUserId)

    async def _fnFinishLocked(self, blnSkipSample: bool = False) -> dict:
        async with self.objPool.acquire() as conn:
            intQuotationId = await self._fnSampleQuotationId(conn)
            if intQuotationId is None and not blnSkipSample:
                rstItems = await conn.fetch(
                    """SELECT pk_bint_inventory_id, vchr_item_code, vchr_item_name, vchr_unit, dbl_unit_price
                       FROM tbl_inventory
                       WHERE fk_bint_user_id = $1 AND vchr_item_code LIKE 'SMP-%'
                       ORDER BY vchr_item_code LIMIT $2""",
                    self.intUserId, SAMPLE_ITEM_COUNT,
                )
                if rstItems:
                    lstItems = [
                        MdlQuotationItemRequest(
                            intInventoryId=r["pk_bint_inventory_id"], strItemCode=r["vchr_item_code"],
                            strItemName=r["vchr_item_name"], strUnit=r["vchr_unit"],
                            dblQuantity=1, dblUnitPrice=float(r["dbl_unit_price"]), intSortOrder=i,
                        )
                        for i, r in enumerate(rstItems)
                    ]
                else:  # skipped the trade step: a few editable placeholder lines
                    lstItems = [
                        MdlQuotationItemRequest(strItemName=f"Sample item {i}", strUnit="Nos",
                                                dblQuantity=1, dblUnitPrice=1000.0, intSortOrder=i - 1)
                        for i in (1, 2, 3)
                    ]
                mdlResponse = await ClsQuotationService(self.objPool, self.intUserId).fnAddQuotationService(
                    MdlCreateQuotationRequest(
                        strCustomerName="Sample Customer",
                        strNotes="Sample quotation: change the customer name and quantities, then download the PDF.",
                        dblTaxPercent=0, strStatus="draft", lstItems=lstItems,
                    )
                )
                if not mdlResponse.data:
                    raise HTTPException(status_code=500, detail="Could not create your sample quotation.")
                intQuotationId = mdlResponse.data.intPkQuotationId
                await conn.execute(
                    """INSERT INTO tbl_user_settings (fk_bint_user_id, vchr_key, vchr_value) VALUES ($1, $2, $3)
                       ON CONFLICT (fk_bint_user_id, vchr_key) DO UPDATE SET vchr_value = EXCLUDED.vchr_value""",
                    self.intUserId, SAMPLE_KEY, str(intQuotationId),
                )

            rstUser = await conn.fetchrow(
                """UPDATE tbl_user
                   SET bln_needs_onboarding = FALSE, tim_onboarded_at = COALESCE(tim_onboarded_at, $2)
                   WHERE pk_bint_user_id = $1
                   RETURNING vchr_username, vchr_email, vchr_business_name, vchr_phone,
                             vchr_signup_trade, vchr_signup_source,
                             (tim_onboarded_at = $2) AS bln_first_finish""",
                self.intUserId, datetime.now(),
            )

        if rstUser and rstUser["bln_first_finish"]:
            await fnNotifyOwner(
                "Quotely Pro: new user finished setup\n"
                f"{rstUser['vchr_username']} - {rstUser['vchr_business_name'] or '-'}\n"
                f"Trade: {rstUser['vchr_signup_trade'] or 'skipped'}\n"
                f"Phone: {rstUser['vchr_phone'] or '-'}\n"
                f"Email: {rstUser['vchr_email']}\n"
                f"Source: {rstUser['vchr_signup_source'] or 'direct'}"
            )
        return {"intQuotationId": intQuotationId}
