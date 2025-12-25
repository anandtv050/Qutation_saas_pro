import datetime

from app.api.quotation.schema import (
    MdlQuotationResponse,
    MdlQuotationListResponse,
    MdlQuotation,
    MdlQuotationListItem,
    MdlQuotationItem,
    MdlDeleteQuotationResponse,
    MdlCreateQuotationRequest,
    MdlUpdateQuotationRequest
)
from app.core.baseSchema import ResponseStatus

class ClsQuotationService:
    def __init__(self, pool, intUserId: int) -> None:
        self.insPool = pool
        self.intUserId = intUserId
        
    async def fnGenerateQuotationNumber(self) -> str:
        """Generate Qutation Number"""
        strYear = datetime.datetime.now().strftime("%Y")

        strQuery = """
            SELECT MAX(CAST(SUBSTRING(vchr_quotation_number FROM 9) AS INTEGER)) as max_num
            FROM tbl_quotation
            WHERE fk_bint_user_id = $1
            AND vchr_quotation_number LIKE $2
        """

        async with self.insPool.acquire() as conn:
            rstMax = await conn.fetchrow(strQuery, self.intUserId, f"QT-{strYear}-%")

        intNextNum = (rstMax['max_num'] or 0) + 1
        return f"QT-{strYear}-{intNextNum:04d}"

    
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

    async def fnGetSingleQuotationDetails(self, intQuotationId: int):
        """Get single quotation with items and linked invoice info"""

        strQuery = """
            SELECT
                q.pk_bint_quotation_id,
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
                intSortOrder=dctItem['int_sort_order'] or 0
            )
            lstQuotationItems.append(mdlItem)
            
        mdlQuotation = MdlQuotation(
            intPkQuotationId=rstQuotation['pk_bint_quotation_id'],
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
    
    async def fnAddQuotationService(self, mdlRequest: MdlCreateQuotationRequest):
        """Create new quotation with items"""
        
        strQuotationNumber = await self.fnGenerateQuotationNumber()
        
        dblSubtotal = sum(item.dblQuantity * item.dblUnitPrice for item in mdlRequest.lstItems)
        dblTaxAmount = dblSubtotal * (mdlRequest.dblTaxPercent or 0) / 100
        dblTotalAmount = dblSubtotal + dblTaxAmount - (mdlRequest.dblDiscountAmount or 0)
        
        datQuotationDate = mdlRequest.datQuotationDate or datetime.date.today()
        
        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                strInsertQuotation = """
                    INSERT INTO tbl_quotation (
                        fk_bint_user_id,
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
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING pk_bint_quotation_id
                """
                rstQuotation = await conn.fetchrow(
                    strInsertQuotation,
                    self.intUserId,
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
                        int_sort_order
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """
                for intIndex, mdlItem in enumerate(mdlRequest.lstItems):
                    dblItemTotal = mdlItem.dblQuantity * mdlItem.dblUnitPrice
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
                        mdlItem.intSortOrder or intIndex
                    )

        return await self.fnGetSingleQuotationDetails(intQuotationId)
            
    
    async def fnUpdateQuotationService(self, mdlRequest: MdlUpdateQuotationRequest):
        """Update existing quotation"""
        
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
                    strDeleteItems = "DELETE FROM tbl_quotation_item WHERE fk_bint_quotation_id = $1"
                    await conn.execute(strDeleteItems, mdlRequest.intPkQuotationId)

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
                            int_sort_order
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """
                    for intIndex, mdlItem in enumerate(mdlRequest.lstItems):
                        dblItemTotal = mdlItem.dblQuantity * mdlItem.dblUnitPrice
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
                            mdlItem.intSortOrder or intIndex
                        )

        return await self.fnGetSingleQuotationDetails(mdlRequest.intPkQuotationId)
    
    async def fnDeleteQuotationService(self, intQuotationId: int):
        """Delete quotation and its items"""
        
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