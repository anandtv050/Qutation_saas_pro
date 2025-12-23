import datetime
from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.api.invoice.schema import (
    MdlCreateInvoiceRequest,
    MdlInvoiceResponse,
    MdlInvoiceListResponse,
    MdlDeleteInvoiceResponse,
    MdlInvoice,
    MdlInvoiceListItem,
    MdlInvoiceItem
)


class ClsInvoiceService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId

    async def fnGenerateInvoiceNumber(self):
        """Generate unique invoice number: INV-YYYY-NNNN"""
        strYear = str(datetime.date.today().year)
        
        strQuery = """
            SELECT COUNT(*) + 1 as next_num
            FROM tbl_invoice
            WHERE fk_bint_user_id = $1
            AND vchr_invoice_number LIKE $2
        """
        async with self.insPool.acquire() as conn:
            rstCount = await conn.fetchrow(strQuery, self.intUserId, f"INV-{strYear}-%")
            intNextNum = rstCount['next_num']
        
        return f"INV-{strYear}-{str(intNextNum).zfill(4)}"
    
    async def fnGetAllInvoiceList(self):
        """Get all invoices for user"""
        
        strQuery = """
            SELECT 
                i.pk_bint_invoice_id,
                i.fk_bint_quotation_id,
                q.vchr_quotation_number,
                i.vchr_invoice_number,
                i.dat_invoice_date,
                i.vchr_customer_name,
                i.vchr_customer_phone,
                i.dbl_total_amount,
                i.vchr_payment_status,
                (SELECT COUNT(*) FROM tbl_invoice_item WHERE fk_bint_invoice_id = i.pk_bint_invoice_id) as item_count
            FROM tbl_invoice i
            LEFT JOIN tbl_quotation q ON i.fk_bint_quotation_id = q.pk_bint_quotation_id
            WHERE i.fk_bint_user_id = $1
            ORDER BY i.tim_created_at DESC
        """
        
        async with self.insPool.acquire() as conn:
            rstInvoices = await conn.fetch(strQuery, self.intUserId)

        if not rstInvoices:
            return MdlInvoiceListResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No invoices found",
                lstInvoice=[]
            )

        lstInvoices = []
        for row in rstInvoices:
            mdlInvoice = MdlInvoiceListItem(
                intPkInvoiceId=row['pk_bint_invoice_id'],
                intQuotationId=row['fk_bint_quotation_id'],
                strQuotationNumber=row['vchr_quotation_number'],
                strInvoiceNumber=row['vchr_invoice_number'],
                datInvoiceDate=row['dat_invoice_date'],
                strCustomerName=row['vchr_customer_name'],
                strCustomerPhone=row['vchr_customer_phone'],
                dblTotalAmount=float(row['dbl_total_amount']),
                strPaymentStatus=row['vchr_payment_status'],
                intItemCount=row['item_count']
            )
            lstInvoices.append(mdlInvoice)

        return MdlInvoiceListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstInvoices)} invoices",
            lstInvoice=lstInvoices
        )
    
    async def fnGetSingleInvoiceDetails(self, intInvoiceId: int):
        """Get single invoice with all items"""
        
        strInvoiceQuery = """
            SELECT 
                i.pk_bint_invoice_id,
                i.fk_bint_quotation_id,
                q.vchr_quotation_number,
                i.vchr_invoice_number,
                i.dat_invoice_date,
                i.vchr_customer_name,
                i.vchr_customer_phone,
                i.txt_customer_address,
                i.dbl_subtotal,
                i.dbl_tax_percent,
                i.dbl_tax_amount,
                i.dbl_discount_amount,
                i.dbl_total_amount,
                i.txt_notes,
                i.vchr_payment_status,
                i.dat_due_date
            FROM tbl_invoice i
            LEFT JOIN tbl_quotation q ON i.fk_bint_quotation_id = q.pk_bint_quotation_id
            WHERE i.pk_bint_invoice_id = $1 AND i.fk_bint_user_id = $2
        """
        
        strItemsQuery = """
            SELECT 
                pk_bint_invoice_item_id,
                fk_bint_inventory_id,
                vchr_item_code,
                vchr_item_name,
                vchr_unit,
                dbl_quantity,
                dbl_unit_price,
                dbl_total_price,
                int_sort_order
            FROM tbl_invoice_item
            WHERE fk_bint_invoice_id = $1
            ORDER BY int_sort_order
        """
        
        async with self.insPool.acquire() as conn:
            rstInvoice = await conn.fetchrow(strInvoiceQuery, intInvoiceId, self.intUserId)
            
            if not rstInvoice:
                return MdlInvoiceResponse(
                    intStatus=ResponseStatus.NO_DATA,
                    strStatus=ResponseStatus.NO_DATA_STR,
                    intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                    strMessage="Invoice not found",
                    data=None
                )
            
            rstItems = await conn.fetch(strItemsQuery, intInvoiceId)

        lstItems = []
        for row in rstItems:
            mdlItem = MdlInvoiceItem(
                intPkInvoiceItemId=row['pk_bint_invoice_item_id'],
                intInventoryId=row['fk_bint_inventory_id'],
                strItemCode=row['vchr_item_code'],
                strItemName=row['vchr_item_name'],
                strUnit=row['vchr_unit'],
                dblQuantity=float(row['dbl_quantity']),
                dblUnitPrice=float(row['dbl_unit_price']),
                dblTotalPrice=float(row['dbl_total_price']),
                intSortOrder=row['int_sort_order']
            )
            lstItems.append(mdlItem)

        mdlInvoice = MdlInvoice(
            intPkInvoiceId=rstInvoice['pk_bint_invoice_id'],
            intQuotationId=rstInvoice['fk_bint_quotation_id'],
            strQuotationNumber=rstInvoice['vchr_quotation_number'],
            strInvoiceNumber=rstInvoice['vchr_invoice_number'],
            datInvoiceDate=rstInvoice['dat_invoice_date'],
            strCustomerName=rstInvoice['vchr_customer_name'],
            strCustomerPhone=rstInvoice['vchr_customer_phone'],
            strCustomerAddress=rstInvoice['txt_customer_address'],
            dblSubtotal=float(rstInvoice['dbl_subtotal']),
            dblTaxPercent=float(rstInvoice['dbl_tax_percent']),
            dblTaxAmount=float(rstInvoice['dbl_tax_amount']),
            dblDiscountAmount=float(rstInvoice['dbl_discount_amount']),
            dblTotalAmount=float(rstInvoice['dbl_total_amount']),
            strNotes=rstInvoice['txt_notes'],
            strPaymentStatus=rstInvoice['vchr_payment_status'],
            datDueDate=rstInvoice['dat_due_date'],
            lstItems=lstItems
        )

        return MdlInvoiceResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Invoice retrieved",
            data=mdlInvoice
        )
    
    async def fnAddInvoiceService(self, mdlRequest: MdlCreateInvoiceRequest):
        """Create new invoice"""
        
        strInvoiceNumber = await self.fnGenerateInvoiceNumber()
        
        dblSubtotal = sum(item.dblQuantity * item.dblUnitPrice for item in mdlRequest.lstItems)
        dblTaxAmount = dblSubtotal * (mdlRequest.dblTaxPercent or 0) / 100
        dblTotalAmount = dblSubtotal + dblTaxAmount - (mdlRequest.dblDiscountAmount or 0)
        
        datInvoiceDate = mdlRequest.datInvoiceDate or datetime.date.today()
        
        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                strInsertInvoice = """
                    INSERT INTO tbl_invoice (
                        fk_bint_user_id,
                        fk_bint_quotation_id,
                        vchr_invoice_number,
                        dat_invoice_date,
                        vchr_customer_name,
                        vchr_customer_phone,
                        txt_customer_address,
                        dbl_subtotal,
                        dbl_tax_percent,
                        dbl_tax_amount,
                        dbl_discount_amount,
                        dbl_total_amount,
                        txt_notes,
                        vchr_payment_status,
                        dat_due_date,
                        tim_created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    RETURNING pk_bint_invoice_id
                """
                rstInvoice = await conn.fetchrow(
                    strInsertInvoice,
                    self.intUserId,
                    mdlRequest.intQuotationId,
                    strInvoiceNumber,
                    datInvoiceDate,
                    mdlRequest.strCustomerName,
                    mdlRequest.strCustomerPhone,
                    mdlRequest.strCustomerAddress,
                    dblSubtotal,
                    mdlRequest.dblTaxPercent or 0,
                    dblTaxAmount,
                    mdlRequest.dblDiscountAmount or 0,
                    dblTotalAmount,
                    mdlRequest.strNotes,
                    mdlRequest.strPaymentStatus or "pending",
                    mdlRequest.datDueDate,
                    datetime.datetime.now()
                )
                
                intInvoiceId = rstInvoice['pk_bint_invoice_id']
                
                strInsertItem = """
                    INSERT INTO tbl_invoice_item (
                        fk_bint_invoice_id,
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
                        intInvoiceId,
                        mdlItem.intInventoryId,
                        mdlItem.strItemCode,
                        mdlItem.strItemName,
                        mdlItem.strUnit,
                        mdlItem.dblQuantity,
                        mdlItem.dblUnitPrice,
                        dblItemTotal,
                        mdlItem.intSortOrder or intIndex
                    )

        return await self.fnGetSingleInvoiceDetails(intInvoiceId)
    
    
    async def fnDeleteInvoiceService(self, intInvoiceId: int):
        """Delete invoice"""
        
        strQuery = """
            DELETE FROM tbl_invoice
            WHERE pk_bint_invoice_id = $1 AND fk_bint_user_id = $2
            RETURNING pk_bint_invoice_id
        """
        async with self.insPool.acquire() as conn:
            rstDeleted = await conn.fetchrow(strQuery, intInvoiceId, self.intUserId)

        if not rstDeleted:
            return MdlDeleteInvoiceResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Invoice not found",
                intDeletedId=None
            )

        return MdlDeleteInvoiceResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Invoice deleted",
            intDeletedId=intInvoiceId
        )