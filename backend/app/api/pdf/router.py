from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import asyncpg

from app.api.pdf.schema import MdlQuotationPDFRequest, MdlInvoicePDFRequest
from app.api.pdf.service import ClsPDFGenerator
from app.core.database import ClsDatabasepool
from app.core.security import fnGetCurrentUser

router = APIRouter(prefix="/pdf", tags=["PDF"])


@router.post("/quotation")
async def fnGenerateQuotationPDF(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlRequest: MdlQuotationPDFRequest
):
    """Generate PDF for quotation"""
    try:
        # If quotation ID is provided, fetch from database
        if mdlRequest.intQuotationId:
            insPool = ClsDatabasepool()
            pool = await insPool.fnGetPool()

            async with pool.acquire() as conn:
                # Fetch quotation details
                strQuery = """
                    SELECT
                        vchr_quotation_number,
                        dat_quotation_date,
                        vchr_customer_name,
                        vchr_customer_phone,
                        txt_customer_address
                    FROM tbl_quotation
                    WHERE pk_bint_quotation_id = $1 AND fk_bint_user_id = $2
                """
                rstQuotation = await conn.fetchrow(strQuery, mdlRequest.intQuotationId, intUserId)

                if not rstQuotation:
                    return {"error": "Quotation not found"}

                # Fetch quotation items
                strItemsQuery = """
                    SELECT
                        vchr_item_name,
                        dbl_quantity,
                        dbl_unit_price
                    FROM tbl_quotation_item
                    WHERE fk_bint_quotation_id = $1
                    ORDER BY int_sort_order
                """
                rstItems = await conn.fetch(strItemsQuery, mdlRequest.intQuotationId)

                items = [
                    {
                        'strItemName': row['vchr_item_name'],
                        'dblQuantity': float(row['dbl_quantity']),
                        'dblUnitPrice': float(row['dbl_unit_price'])
                    }
                    for row in rstItems
                ]

                customer_name = rstQuotation['vchr_customer_name']
                customer_phone = rstQuotation['vchr_customer_phone']
                customer_address = rstQuotation['txt_customer_address']
                quotation_date = rstQuotation['dat_quotation_date'].strftime('%d/%m/%Y') if rstQuotation['dat_quotation_date'] else None
                quotation_number = rstQuotation['vchr_quotation_number']
        else:
            # Use data from request
            items = [item.model_dump() for item in mdlRequest.lstItems] if mdlRequest.lstItems else []
            customer_name = mdlRequest.strCustomerName
            customer_phone = mdlRequest.strCustomerPhone
            customer_address = mdlRequest.strCustomerAddress
            quotation_date = mdlRequest.strQuotationDate
            quotation_number = mdlRequest.strQuotationNumber

        # Generate PDF
        pdf_generator = ClsPDFGenerator()
        pdf_buffer = pdf_generator.generate_quotation_pdf(
            items=items,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_address=customer_address,
            quotation_date=quotation_date,
            quotation_number=quotation_number,
            include_info_page=mdlRequest.blnIncludeInfoPage
        )

        # Return PDF as streaming response
        filename = f"Quotation_{quotation_number or 'draft'}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}"
            }
        )

    except asyncpg.PostgresError as e:
        return {"error": f"Database error: {str(e)}"}
    except Exception as e:
        return {"error": f"Error generating PDF: {str(e)}"}


@router.post("/invoice")
async def fnGenerateInvoicePDF(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlRequest: MdlInvoicePDFRequest
):
    """Generate PDF for invoice"""
    try:
        # If invoice ID is provided, fetch from database
        if mdlRequest.intInvoiceId:
            insPool = ClsDatabasepool()
            pool = await insPool.fnGetPool()

            async with pool.acquire() as conn:
                # Fetch invoice details
                strQuery = """
                    SELECT
                        vchr_invoice_number,
                        dat_invoice_date,
                        dat_due_date,
                        vchr_customer_name,
                        vchr_customer_phone,
                        txt_customer_address
                    FROM tbl_invoice
                    WHERE pk_bint_invoice_id = $1 AND fk_bint_user_id = $2
                """
                rstInvoice = await conn.fetchrow(strQuery, mdlRequest.intInvoiceId, intUserId)

                if not rstInvoice:
                    return {"error": "Invoice not found"}

                # Fetch invoice items
                strItemsQuery = """
                    SELECT
                        vchr_item_name,
                        dbl_quantity,
                        dbl_unit_price
                    FROM tbl_invoice_item
                    WHERE fk_bint_invoice_id = $1
                    ORDER BY int_sort_order
                """
                rstItems = await conn.fetch(strItemsQuery, mdlRequest.intInvoiceId)

                items = [
                    {
                        'strItemName': row['vchr_item_name'],
                        'dblQuantity': float(row['dbl_quantity']),
                        'dblUnitPrice': float(row['dbl_unit_price'])
                    }
                    for row in rstItems
                ]

                customer_name = rstInvoice['vchr_customer_name']
                customer_phone = rstInvoice['vchr_customer_phone']
                customer_address = rstInvoice['txt_customer_address']
                invoice_date = rstInvoice['dat_invoice_date'].strftime('%d/%m/%Y') if rstInvoice['dat_invoice_date'] else None
                invoice_number = rstInvoice['vchr_invoice_number']
                due_date = rstInvoice['dat_due_date'].strftime('%d/%m/%Y') if rstInvoice['dat_due_date'] else None
        else:
            # Use data from request
            items = [item.model_dump() for item in mdlRequest.lstItems] if mdlRequest.lstItems else []
            customer_name = mdlRequest.strCustomerName
            customer_phone = mdlRequest.strCustomerPhone
            customer_address = mdlRequest.strCustomerAddress
            invoice_date = mdlRequest.strInvoiceDate
            invoice_number = mdlRequest.strInvoiceNumber
            due_date = mdlRequest.strDueDate

        # Generate PDF
        pdf_generator = ClsPDFGenerator()
        pdf_buffer = pdf_generator.generate_invoice_pdf(
            items=items,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_address=customer_address,
            invoice_date=invoice_date,
            invoice_number=invoice_number,
            due_date=due_date,
            include_info_page=mdlRequest.blnIncludeInfoPage
        )

        # Return PDF as streaming response
        filename = f"Invoice_{invoice_number or 'draft'}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}"
            }
        )

    except asyncpg.PostgresError as e:
        return {"error": f"Database error: {str(e)}"}
    except Exception as e:
        return {"error": f"Error generating PDF: {str(e)}"}
