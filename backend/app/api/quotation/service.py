import datetime
import calendar
from decimal import Decimal


from app.api.quotation.schema import (
    MdlQuotationResponse,
    MdlQuotationListResponse,
    MdlQuotation,
    MdlQuotationListItem,
    MdlQuotationItem,
    MdlDeleteQuotationResponse,
    MdlCreateQuotationRequest,
    MdlUpdateQuotationRequest,
    MdlUpdateWarrantyRequest
)
from app.core.baseSchema import ResponseStatus
from app.core.logger import getUserLogger


class ClsQuotationService:
    def __init__(self, pool, intUserId: int) -> None:
        self.insPool = pool
        self.intUserId = intUserId
        self.logger = getUserLogger(intUserId)

    @staticmethod
    def fnAddWarrantyPeriod(datImplementationDate, intYears: int, intMonths: int, intDays: int):
        """Add warranty period to implementation date."""
        if not datImplementationDate:
            return None

        intTotalMonths = (intYears or 0) * 12 + (intMonths or 0)
        datResult = datImplementationDate

        if intTotalMonths:
            intMonthIndex = (datImplementationDate.month - 1) + intTotalMonths
            intYear = datImplementationDate.year + (intMonthIndex // 12)
            intMonth = (intMonthIndex % 12) + 1
            intDay = min(datImplementationDate.day, calendar.monthrange(intYear, intMonth)[1])
            datResult = datetime.date(intYear, intMonth, intDay)

        if intDays:
            datResult = datResult + datetime.timedelta(days=intDays)

        return datResult

    @staticmethod
    def fnResolveWarrantyDates(
        datImplementationDate,
        intWarrantyYears: int,
        intWarrantyMonths: int,
        intWarrantyDays: int,
        blnManualExpiryOverride: bool,
        datExpiryDate,
    ):
        if blnManualExpiryOverride:
            datFinalExpiry = datExpiryDate
        else:
            datFinalExpiry = ClsQuotationService.fnAddWarrantyPeriod(
                datImplementationDate,
                intWarrantyYears,
                intWarrantyMonths,
                intWarrantyDays,
            )

        return datFinalExpiry

    async def fnGetInventoryWarrantyDefaults(self, conn, lstInventoryIds: list[int]) -> dict[int, tuple[int, int, int]]:
        """Fetch warranty defaults for inventory items in one query."""
        if not lstInventoryIds:
            return {}

        strQuery = """
            SELECT
                pk_bint_inventory_id,
                int_warranty_years,
                int_warranty_months,
                int_warranty_days
            FROM tbl_inventory
            WHERE fk_bint_user_id = $1
              AND pk_bint_inventory_id = ANY($2::BIGINT[])
        """
        rstRows = await conn.fetch(strQuery, self.intUserId, lstInventoryIds)
        return {
            row["pk_bint_inventory_id"]: (
                int(row["int_warranty_years"] or 0),
                int(row["int_warranty_months"] or 0),
                int(row["int_warranty_days"] or 0),
            )
            for row in rstRows
        }

    ##### Helper function fro get the increment Quotation number   
    async def fnGenerateQuotationNumber(self) -> str:
        """Generate Qutation Number"""
        intYear = datetime.datetime.now().year

        strQuery = """
            INSERT INTO tbl_document_counter (
                fk_bint_user_id,
                Vchr_document_type,
                int_year,
                int_last_number
            )
            VALUES ($1, 'QUOTATION', $2, 6)

            ON CONFLICT (fk_bint_user_id, Vchr_document_type, int_year)
            DO UPDATE
            SET int_last_number = tbl_document_counter.int_last_number + 1

            RETURNING int_last_number;
        """

        async with self.insPool.acquire() as conn:
            rstMax = await conn.fetchrow(strQuery, self.intUserId, intYear)

        intNextNum = rstMax["int_last_number"]
        return f"QT-{intYear}-{intNextNum:04d}"

    ##### List All Quotation 
    async def fnGetAllQuotationList(self):
        """Get all quotations for user"""
        
        strQuery = """
            SELECT 
                q.pk_bint_quotation_id,
                q.vchr_quotation_number,
                q.dat_quotation_date,
                q.vchr_customer_name,
                q.vchr_customer_phone,
                q.dbl_total_amount,
                q.vchr_status,
                COUNT(qi.pk_bint_quotation_item_id) as item_count
            FROM tbl_quotation q
            LEFT JOIN tbl_quotation_item qi ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
            WHERE q.fk_bint_user_id = $1
            GROUP BY q.pk_bint_quotation_id
            ORDER BY q.tim_created_at DESC
        """
        async with self.insPool.acquire() as conn:
            lstQuotations = await conn.fetch(strQuery, self.intUserId)

        if not lstQuotations:
            return MdlQuotationListResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No quotations found",
                lstQuotation=[]
            )
        
        lstItems = []
        for dctRow in lstQuotations:
            mdlItem = MdlQuotationListItem(
                intPkQuotationId=dctRow['pk_bint_quotation_id'],
                strQuotationNumber=dctRow['vchr_quotation_number'],
                datQuotationDate=dctRow['dat_quotation_date'],
                strCustomerName=dctRow['vchr_customer_name'],
                strCustomerPhone=dctRow['vchr_customer_phone'],
                dblTotalAmount=float(dctRow['dbl_total_amount'] or 0),
                strStatus=dctRow['vchr_status'],
                intItemCount=dctRow['item_count']
            )
            lstItems.append(mdlItem)

        return MdlQuotationListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstItems)} quotations",
            lstQuotation=lstItems
        )
   
    ##### Get the SIngle quotation Details
    async def fnGetSingleQuotationDetails(self, intQuotationId: int):
        """Get single quotation with items and linked invoice info"""

        strQuery = """
            SELECT
                q.pk_bint_quotation_id,
                q.fk_bint_ai_response_id,
                q.vchr_quotation_number,
                q.dat_quotation_date,
                q.vchr_customer_name,
                q.vchr_customer_phone,
                q.txt_customer_address,
                q.dbl_subtotal,
                q.dbl_tax_percent,
                q.dbl_tax_amount,
                q.dbl_discount_amount,
                q.dbl_total_amount,
                q.txt_notes,
                q.vchr_status,
                q.dat_valid_until,
                i.pk_bint_invoice_id as linked_invoice_id,
                i.vchr_invoice_number as linked_invoice_number
            FROM tbl_quotation q
            LEFT JOIN tbl_invoice i ON i.fk_bint_quotation_id = q.pk_bint_quotation_id
            WHERE q.pk_bint_quotation_id = $1 AND q.fk_bint_user_id = $2
        """
        async with self.insPool.acquire() as conn:
            rstQuotation = await conn.fetchrow(strQuery, intQuotationId, self.intUserId)
        
        if not rstQuotation:
            return MdlQuotationResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Quotation not found",
                data=None
            )
        
        strItemsQuery = """
            SELECT
                pk_bint_quotation_item_id,
                fk_bint_inventory_id,
                vchr_item_code,
                vchr_item_name,
                vchr_unit,
                dbl_quantity,
                dbl_unit_price,
                dbl_total_price,
                int_warranty_years,
                int_warranty_months,
                int_warranty_days,
                dat_implementation_date,
                dat_expiry_date,
                bln_manual_expiry_override,
                int_sort_order
            FROM tbl_quotation_item
            WHERE fk_bint_quotation_id = $1
            ORDER BY int_sort_order
        """
        async with self.insPool.acquire() as conn:
            lstItems = await conn.fetch(strItemsQuery, intQuotationId)
        
        lstQuotationItems = []
        for dctItem in lstItems:
            mdlItem = MdlQuotationItem(
                intPkQuotationItemId=dctItem['pk_bint_quotation_item_id'],
                intInventoryId=dctItem['fk_bint_inventory_id'],
                strItemCode=dctItem['vchr_item_code'],
                strItemName=dctItem['vchr_item_name'],
                strUnit=dctItem['vchr_unit'],
                dblQuantity=float(dctItem['dbl_quantity']),
                dblUnitPrice=float(dctItem['dbl_unit_price']),
                dblTotalPrice=float(dctItem['dbl_total_price']),
                intWarrantyYears=int(dctItem['int_warranty_years'] or 0),
                intWarrantyMonths=int(dctItem['int_warranty_months'] or 0),
                intWarrantyDays=int(dctItem['int_warranty_days'] or 0),
                datImplementationDate=dctItem['dat_implementation_date'],
                datExpiryDate=dctItem['dat_expiry_date'],
                blnManualExpiryOverride=bool(dctItem['bln_manual_expiry_override']),
                intSortOrder=dctItem['int_sort_order'] or 0
            )
            lstQuotationItems.append(mdlItem)
            
        mdlQuotation = MdlQuotation(
            intPkQuotationId=rstQuotation['pk_bint_quotation_id'],
            intAiResponseId=rstQuotation['fk_bint_ai_response_id'],
            strQuotationNumber=rstQuotation['vchr_quotation_number'],
            datQuotationDate=rstQuotation['dat_quotation_date'],
            strCustomerName=rstQuotation['vchr_customer_name'],
            strCustomerPhone=rstQuotation['vchr_customer_phone'],
            strCustomerAddress=rstQuotation['txt_customer_address'],
            dblSubtotal=float(rstQuotation['dbl_subtotal'] or 0),
            dblTaxPercent=float(rstQuotation['dbl_tax_percent'] or 0),
            dblTaxAmount=float(rstQuotation['dbl_tax_amount'] or 0),
            dblDiscountAmount=float(rstQuotation['dbl_discount_amount'] or 0),
            dblTotalAmount=float(rstQuotation['dbl_total_amount'] or 0),
            strNotes=rstQuotation['txt_notes'],
            strStatus=rstQuotation['vchr_status'],
            datValidUntil=rstQuotation['dat_valid_until'],
            lstItems=lstQuotationItems,
            intLinkedInvoiceId=rstQuotation['linked_invoice_id'],
            strLinkedInvoiceNumber=rstQuotation['linked_invoice_number']
        )
        
        return MdlQuotationResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Quotation retrieved successfully",
            data=mdlQuotation
        )
    
    ##### Save Single Quotation 
    async def fnAddQuotationService(self, mdlRequest: MdlCreateQuotationRequest):
        """Create new quotation with items"""
        self.logger.info(f"Creating quotation for customer: {mdlRequest.strCustomerName}")

        for mdlItem in mdlRequest.lstItems:
            if (
                (mdlItem.intWarrantyYears is not None and mdlItem.intWarrantyYears < 0)
                or (mdlItem.intWarrantyMonths is not None and mdlItem.intWarrantyMonths < 0)
                or (mdlItem.intWarrantyDays is not None and mdlItem.intWarrantyDays < 0)
            ):
                return MdlQuotationResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage="Warranty period values cannot be negative",
                    data=None
                )
            if mdlItem.blnManualExpiryOverride and mdlItem.datImplementationDate and not mdlItem.datExpiryDate:
                return MdlQuotationResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage="Manual expiry is enabled, so expiry date is required",
                    data=None
                )
            if (
                mdlItem.datImplementationDate is not None
                and mdlItem.datExpiryDate is not None
                and mdlItem.datExpiryDate < mdlItem.datImplementationDate
            ):
                return MdlQuotationResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage="Expiry date cannot be before implementation date",
                    data=None
                )

        strQuotationNumber = await self.fnGenerateQuotationNumber()
        
        # calculate item sub total
        dblSubtotal = sum(Decimal(item.dblQuantity) * Decimal(item.dblUnitPrice) for item in mdlRequest.lstItems)
        
        # use decimal instead of float bcz roudning issue 
        dblTaxPercentage = Decimal(mdlRequest.dblTaxPercent or 0)
        dblDiscountAmount = Decimal(mdlRequest.dblDiscountAmount or 0)
        # calculate tax amount
        dblTaxAmount = (dblSubtotal * dblTaxPercentage) / 100
        
        # NOTE ::  case fixed when User enters ₹5000 discount on ₹2000 quotation
        dblTotalAmount = max(Decimal(0), dblSubtotal + dblTaxAmount - dblDiscountAmount)
        
        datQuotationDate = mdlRequest.datQuotationDate or datetime.date.today()
        # insert into master tabel only single raw
        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                strInsertQuotation = """
                    INSERT INTO tbl_quotation (
                        fk_bint_user_id,
                        fk_bint_ai_response_id,
                        vchr_quotation_number,
                        dat_quotation_date,
                        vchr_customer_name,
                        vchr_customer_phone,
                        txt_customer_address,
                        dbl_subtotal,
                        dbl_tax_percent,
                        dbl_tax_amount,
                        dbl_discount_amount,
                        dbl_total_amount,
                        txt_notes,
                        vchr_status,
                        dat_valid_until,
                        tim_created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    RETURNING pk_bint_quotation_id
                """
                rstQuotation = await conn.fetchrow(
                    strInsertQuotation,
                    self.intUserId,
                    mdlRequest.intAiResponseId,  # NULL for manual, ID for AI-generated
                    strQuotationNumber,
                    datQuotationDate,
                    mdlRequest.strCustomerName,
                    mdlRequest.strCustomerPhone,
                    mdlRequest.strCustomerAddress,
                    dblSubtotal,
                    mdlRequest.dblTaxPercent or 0,
                    dblTaxAmount,
                    mdlRequest.dblDiscountAmount or 0,
                    dblTotalAmount,
                    mdlRequest.strNotes,
                    mdlRequest.strStatus or "draft",
                    mdlRequest.datValidUntil,
                    datetime.datetime.now()
                )
                
                intQuotationId = rstQuotation['pk_bint_quotation_id']
                self.logger.info(f"Quotation created: {strQuotationNumber} | ID={intQuotationId} | Items={len(mdlRequest.lstItems)}")

                lstInventoryIds = [
                    int(item.intInventoryId)
                    for item in mdlRequest.lstItems
                    if item.intInventoryId
                ]
                dctInventoryWarranty = await self.fnGetInventoryWarrantyDefaults(conn, lstInventoryIds)

                # item table each item have each raw
                strInsertItem = """
                    INSERT INTO tbl_quotation_item (
                        fk_bint_quotation_id,
                        fk_bint_inventory_id,
                        vchr_item_code,
                        vchr_item_name,
                        vchr_unit,
                        dbl_quantity,
                        dbl_unit_price,
                        dbl_total_price,
                        int_warranty_years,
                        int_warranty_months,
                        int_warranty_days,
                        dat_implementation_date,
                        dat_expiry_date,
                        bln_manual_expiry_override,
                        int_sort_order
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                """
                for intIndex, mdlItem in enumerate(mdlRequest.lstItems):
                    dblItemTotal = mdlItem.dblQuantity * mdlItem.dblUnitPrice

                    tplWarranty = dctInventoryWarranty.get(mdlItem.intInventoryId or 0, (0, 0, 0))
                    intWarrantyYears = (
                        int(mdlItem.intWarrantyYears)
                        if mdlItem.intWarrantyYears is not None
                        else tplWarranty[0]
                    )
                    intWarrantyMonths = (
                        int(mdlItem.intWarrantyMonths)
                        if mdlItem.intWarrantyMonths is not None
                        else tplWarranty[1]
                    )
                    intWarrantyDays = (
                        int(mdlItem.intWarrantyDays)
                        if mdlItem.intWarrantyDays is not None
                        else tplWarranty[2]
                    )
                    blnManualExpiryOverride = bool(mdlItem.blnManualExpiryOverride)
                    datImplementationDate = mdlItem.datImplementationDate
                    datExpiryDate = self.fnResolveWarrantyDates(
                        datImplementationDate,
                        intWarrantyYears,
                        intWarrantyMonths,
                        intWarrantyDays,
                        blnManualExpiryOverride,
                        mdlItem.datExpiryDate,
                    )

                    await conn.execute(
                        strInsertItem,
                        intQuotationId,
                        mdlItem.intInventoryId,
                        mdlItem.strItemCode,
                        mdlItem.strItemName,
                        mdlItem.strUnit,
                        mdlItem.dblQuantity,
                        mdlItem.dblUnitPrice,
                        dblItemTotal,
                        intWarrantyYears,
                        intWarrantyMonths,
                        intWarrantyDays,
                        datImplementationDate,
                        datExpiryDate,
                        blnManualExpiryOverride,
                        mdlItem.intSortOrder or intIndex
                    )

        return await self.fnGetSingleQuotationDetails(intQuotationId)
            
    ##### update Quotation 
    async def fnUpdateQuotationService(self, mdlRequest: MdlUpdateQuotationRequest):
        """Update existing quotation"""

        if mdlRequest.lstItems:
            for mdlItem in mdlRequest.lstItems:
                if (
                    (mdlItem.intWarrantyYears is not None and mdlItem.intWarrantyYears < 0)
                    or (mdlItem.intWarrantyMonths is not None and mdlItem.intWarrantyMonths < 0)
                    or (mdlItem.intWarrantyDays is not None and mdlItem.intWarrantyDays < 0)
                ):
                    return MdlQuotationResponse(
                        intStatus=ResponseStatus.ERROR,
                        strStatus=ResponseStatus.ERROR_STR,
                        intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                        strMessage="Warranty period values cannot be negative",
                        data=None
                    )
                if mdlItem.blnManualExpiryOverride and mdlItem.datImplementationDate and not mdlItem.datExpiryDate:
                    return MdlQuotationResponse(
                        intStatus=ResponseStatus.ERROR,
                        strStatus=ResponseStatus.ERROR_STR,
                        intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                        strMessage="Manual expiry is enabled, so expiry date is required",
                        data=None
                    )
                if (
                    mdlItem.datImplementationDate is not None
                    and mdlItem.datExpiryDate is not None
                    and mdlItem.datExpiryDate < mdlItem.datImplementationDate
                ):
                    return MdlQuotationResponse(
                        intStatus=ResponseStatus.ERROR,
                        strStatus=ResponseStatus.ERROR_STR,
                        intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                        strMessage="Expiry date cannot be before implementation date",
                        data=None
                    )
        
        strCheckQuery = """
            SELECT pk_bint_quotation_id FROM tbl_quotation
            WHERE pk_bint_quotation_id = $1 AND fk_bint_user_id = $2
        """
        
        async with self.insPool.acquire() as conn:
            rstExist = await conn.fetchrow(strCheckQuery, mdlRequest.intPkQuotationId, self.intUserId)

        if not rstExist:
            return MdlQuotationResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Quotation not found",
            )
        
        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                lstFields = []
                lstValues = []
                intParamCount = 1

                if mdlRequest.strCustomerName is not None:
                    lstFields.append(f"vchr_customer_name = ${intParamCount}")
                    lstValues.append(mdlRequest.strCustomerName)
                    intParamCount += 1

                if mdlRequest.strCustomerPhone is not None:
                    lstFields.append(f"vchr_customer_phone = ${intParamCount}")
                    lstValues.append(mdlRequest.strCustomerPhone)
                    intParamCount += 1

                if mdlRequest.strCustomerAddress is not None:
                    lstFields.append(f"txt_customer_address = ${intParamCount}")
                    lstValues.append(mdlRequest.strCustomerAddress)
                    intParamCount += 1

                if mdlRequest.datQuotationDate is not None:
                    lstFields.append(f"dat_quotation_date = ${intParamCount}")
                    lstValues.append(mdlRequest.datQuotationDate)
                    intParamCount += 1

                if mdlRequest.datValidUntil is not None:
                    lstFields.append(f"dat_valid_until = ${intParamCount}")
                    lstValues.append(mdlRequest.datValidUntil)
                    intParamCount += 1

                if mdlRequest.dblTaxPercent is not None:
                    lstFields.append(f"dbl_tax_percent = ${intParamCount}")
                    lstValues.append(mdlRequest.dblTaxPercent)
                    intParamCount += 1

                if mdlRequest.dblDiscountAmount is not None:
                    lstFields.append(f"dbl_discount_amount = ${intParamCount}")
                    lstValues.append(mdlRequest.dblDiscountAmount)
                    intParamCount += 1

                if mdlRequest.strNotes is not None:
                    lstFields.append(f"txt_notes = ${intParamCount}")
                    lstValues.append(mdlRequest.strNotes)
                    intParamCount += 1

                if mdlRequest.strStatus is not None:
                    lstFields.append(f"vchr_status = ${intParamCount}")
                    lstValues.append(mdlRequest.strStatus)
                    intParamCount += 1

                if mdlRequest.lstItems is not None and len(mdlRequest.lstItems) > 0:
                    dblSubtotal = sum(item.dblQuantity * item.dblUnitPrice for item in mdlRequest.lstItems)
                    
                    dblTaxPercent = mdlRequest.dblTaxPercent
                    if dblTaxPercent is None:
                        strGetTax = "SELECT dbl_tax_percent FROM tbl_quotation WHERE pk_bint_quotation_id = $1"
                        rstTax = await conn.fetchrow(strGetTax, mdlRequest.intPkQuotationId)
                        dblTaxPercent = float(rstTax['dbl_tax_percent'] or 0)
                    
                    dblDiscountAmount = mdlRequest.dblDiscountAmount
                    if dblDiscountAmount is None:
                        strGetDiscount = "SELECT dbl_discount_amount FROM tbl_quotation WHERE pk_bint_quotation_id = $1"
                        rstDiscount = await conn.fetchrow(strGetDiscount, mdlRequest.intPkQuotationId)
                        dblDiscountAmount = float(rstDiscount['dbl_discount_amount'] or 0)
                    
                    dblTaxAmount = dblSubtotal * dblTaxPercent / 100
                    dblTotalAmount = dblSubtotal + dblTaxAmount - dblDiscountAmount

                    lstFields.append(f"dbl_subtotal = ${intParamCount}")
                    lstValues.append(dblSubtotal)
                    intParamCount += 1

                    lstFields.append(f"dbl_tax_amount = ${intParamCount}")
                    lstValues.append(dblTaxAmount)
                    intParamCount += 1

                    lstFields.append(f"dbl_total_amount = ${intParamCount}")
                    lstValues.append(dblTotalAmount)
                    intParamCount += 1

                lstFields.append(f"tim_updated_at = ${intParamCount}")
                lstValues.append(datetime.datetime.now())
                intParamCount += 1

                if lstFields:
                    lstValues.append(mdlRequest.intPkQuotationId)
                    lstValues.append(self.intUserId)
                    
                    strUpdateQuery = f"""
                        UPDATE tbl_quotation
                        SET {', '.join(lstFields)}
                        WHERE pk_bint_quotation_id = ${intParamCount} AND fk_bint_user_id = ${intParamCount + 1}
                    """
                    await conn.execute(strUpdateQuery, *lstValues)

                if mdlRequest.lstItems is not None:
                    # Preserve existing warranty data before deleting items
                    strGetWarranty = """
                        SELECT fk_bint_inventory_id, vchr_item_name,
                               int_warranty_years, int_warranty_months, int_warranty_days,
                               dat_implementation_date, dat_expiry_date, bln_manual_expiry_override
                        FROM tbl_quotation_item
                        WHERE fk_bint_quotation_id = $1
                    """
                    rstExistingItems = await conn.fetch(strGetWarranty, mdlRequest.intPkQuotationId)
                    # Key by (inventory_id, item_name) to match old items to new items
                    dctSavedWarranty = {}
                    for row in rstExistingItems:
                        intInvId = row["fk_bint_inventory_id"]
                        strName = row["vchr_item_name"]
                        dctSavedWarranty[(intInvId, strName)] = {
                            "years": int(row["int_warranty_years"] or 0),
                            "months": int(row["int_warranty_months"] or 0),
                            "days": int(row["int_warranty_days"] or 0),
                            "impl_date": row["dat_implementation_date"],
                            "expiry_date": row["dat_expiry_date"],
                            "manual_override": bool(row["bln_manual_expiry_override"]),
                        }

                    strDeleteItems = "DELETE FROM tbl_quotation_item WHERE fk_bint_quotation_id = $1"
                    await conn.execute(strDeleteItems, mdlRequest.intPkQuotationId)

                    lstInventoryIds = [
                        int(item.intInventoryId)
                        for item in mdlRequest.lstItems
                        if item.intInventoryId
                    ]
                    dctInventoryWarranty = await self.fnGetInventoryWarrantyDefaults(conn, lstInventoryIds)

                    strInsertItem = """
                        INSERT INTO tbl_quotation_item (
                            fk_bint_quotation_id,
                            fk_bint_inventory_id,
                            vchr_item_code,
                            vchr_item_name,
                            vchr_unit,
                            dbl_quantity,
                            dbl_unit_price,
                            dbl_total_price,
                            int_warranty_years,
                            int_warranty_months,
                            int_warranty_days,
                            dat_implementation_date,
                            dat_expiry_date,
                            bln_manual_expiry_override,
                            int_sort_order
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    """
                    for intIndex, mdlItem in enumerate(mdlRequest.lstItems):
                        dblItemTotal = mdlItem.dblQuantity * mdlItem.dblUnitPrice

                        # Check if this item had saved warranty data
                        dctPrevWarranty = dctSavedWarranty.get(
                            (mdlItem.intInventoryId, mdlItem.strItemName), None
                        )

                        if mdlItem.intWarrantyYears is not None:
                            intWarrantyYears = int(mdlItem.intWarrantyYears)
                        elif dctPrevWarranty:
                            intWarrantyYears = dctPrevWarranty["years"]
                        else:
                            tplWarranty = dctInventoryWarranty.get(mdlItem.intInventoryId or 0, (0, 0, 0))
                            intWarrantyYears = tplWarranty[0]

                        if mdlItem.intWarrantyMonths is not None:
                            intWarrantyMonths = int(mdlItem.intWarrantyMonths)
                        elif dctPrevWarranty:
                            intWarrantyMonths = dctPrevWarranty["months"]
                        else:
                            tplWarranty = dctInventoryWarranty.get(mdlItem.intInventoryId or 0, (0, 0, 0))
                            intWarrantyMonths = tplWarranty[1]

                        if mdlItem.intWarrantyDays is not None:
                            intWarrantyDays = int(mdlItem.intWarrantyDays)
                        elif dctPrevWarranty:
                            intWarrantyDays = dctPrevWarranty["days"]
                        else:
                            tplWarranty = dctInventoryWarranty.get(mdlItem.intInventoryId or 0, (0, 0, 0))
                            intWarrantyDays = tplWarranty[2]

                        # Preserve saved dates if no new warranty fields sent
                        if dctPrevWarranty and mdlItem.datImplementationDate is None:
                            datImplementationDate = dctPrevWarranty["impl_date"]
                            blnManualExpiryOverride = dctPrevWarranty["manual_override"]
                            datExpiryDate = dctPrevWarranty["expiry_date"]
                        else:
                            blnManualExpiryOverride = bool(mdlItem.blnManualExpiryOverride)
                            datImplementationDate = mdlItem.datImplementationDate
                            datExpiryDate = self.fnResolveWarrantyDates(
                                datImplementationDate,
                                intWarrantyYears,
                                intWarrantyMonths,
                                intWarrantyDays,
                                blnManualExpiryOverride,
                                mdlItem.datExpiryDate,
                            )

                        await conn.execute(
                            strInsertItem,
                            mdlRequest.intPkQuotationId,
                            mdlItem.intInventoryId,
                            mdlItem.strItemCode,
                            mdlItem.strItemName,
                            mdlItem.strUnit,
                            mdlItem.dblQuantity,
                            mdlItem.dblUnitPrice,
                            dblItemTotal,
                            intWarrantyYears,
                            intWarrantyMonths,
                            intWarrantyDays,
                            datImplementationDate,
                            datExpiryDate,
                            blnManualExpiryOverride,
                            mdlItem.intSortOrder or intIndex
                        )

        return await self.fnGetSingleQuotationDetails(mdlRequest.intPkQuotationId)
    
    ##### Update Warranty Only
    async def fnUpdateWarrantyService(self, mdlRequest: MdlUpdateWarrantyRequest):
        """Update ONLY warranty fields on existing quotation items (no delete/re-insert)."""

        for mdlItem in mdlRequest.lstItems:
            if mdlItem.intWarrantyYears < 0 or mdlItem.intWarrantyMonths < 0 or mdlItem.intWarrantyDays < 0:
                return MdlQuotationResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage="Warranty period values cannot be negative",
                    data=None
                )
            if mdlItem.blnManualExpiryOverride and mdlItem.datImplementationDate and not mdlItem.datExpiryDate:
                return MdlQuotationResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage="Manual expiry is enabled, so expiry date is required",
                    data=None
                )
            if (
                mdlItem.datImplementationDate is not None
                and mdlItem.datExpiryDate is not None
                and mdlItem.datExpiryDate < mdlItem.datImplementationDate
            ):
                return MdlQuotationResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage="Expiry date cannot be before implementation date",
                    data=None
                )

        strCheckQuery = """
            SELECT pk_bint_quotation_id FROM tbl_quotation
            WHERE pk_bint_quotation_id = $1 AND fk_bint_user_id = $2
        """

        async with self.insPool.acquire() as conn:
            rstExist = await conn.fetchrow(strCheckQuery, mdlRequest.intPkQuotationId, self.intUserId)

        if not rstExist:
            return MdlQuotationResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Quotation not found",
            )

        strUpdateItem = """
            UPDATE tbl_quotation_item
            SET int_warranty_years = $1,
                int_warranty_months = $2,
                int_warranty_days = $3,
                dat_implementation_date = $4,
                dat_expiry_date = $5,
                bln_manual_expiry_override = $6
            WHERE pk_bint_quotation_item_id = $7
              AND fk_bint_quotation_id = $8
        """

        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                for mdlItem in mdlRequest.lstItems:
                    datExpiryDate = self.fnResolveWarrantyDates(
                        mdlItem.datImplementationDate,
                        mdlItem.intWarrantyYears,
                        mdlItem.intWarrantyMonths,
                        mdlItem.intWarrantyDays,
                        mdlItem.blnManualExpiryOverride,
                        mdlItem.datExpiryDate,
                    )

                    await conn.execute(
                        strUpdateItem,
                        mdlItem.intWarrantyYears,
                        mdlItem.intWarrantyMonths,
                        mdlItem.intWarrantyDays,
                        mdlItem.datImplementationDate,
                        datExpiryDate,
                        mdlItem.blnManualExpiryOverride,
                        mdlItem.intPkQuotationItemId,
                        mdlRequest.intPkQuotationId,
                    )

        return await self.fnGetSingleQuotationDetails(mdlRequest.intPkQuotationId)

    ##### Delete QUotation
    async def fnDeleteQuotationService(self, intQuotationId: int):
        """Delete quotation and its items"""
        self.logger.info(f"Deleting quotation: ID={intQuotationId}")

        strQuery = """
            DELETE FROM tbl_quotation
            WHERE pk_bint_quotation_id = $1 AND fk_bint_user_id = $2
            RETURNING pk_bint_quotation_id
        """
        async with self.insPool.acquire() as conn:
            rstDeleted = await conn.fetchrow(strQuery, intQuotationId, self.intUserId)

        if not rstDeleted:
            return MdlDeleteQuotationResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Quotation not found",
                intDeletedId=None
            )

        return MdlDeleteQuotationResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Quotation deleted successfully",
            intDeletedId=intQuotationId
        )
