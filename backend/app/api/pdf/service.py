from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from fastapi.responses import StreamingResponse
import io


class ClsPdfGenerator:
    def __init__(self,objPool,intUserid) -> None:
        self.intUserId = intUserid
        self.objPool = objPool
    
    async def fnGetQuotationPdf(self,mdlRequest):
        """Generate PDF for quotation"""
        print(mdlRequest.intQuotationId)
        if mdlRequest.intQuotationId:
            # step1 : get the quotation list
            async with self.objPool.acquire() as conn:
                # fetch quotation details 
                strHeaderQuery = """
                    SELECT 
                        u.vchr_business_name,
                        u.vchr_email,
                        u.vchr_phone,
                        u.vchr_gst_number,
                        q.vchr_quotation_number,
                        q.dat_quotation_date,
                        q.vchr_customer_name,
                        q.vchr_customer_phone,
                        q.txt_customer_address
                    FROM tbl_quotation q
                    LEFT JOIN tbl_user u ON q.fk_bint_user_id = u.pk_bint_user_id
                    WHERE q.pk_bint_quotation_id = $1
                    AND q.fk_bint_user_id = $2;
                """
                
                rstQuotationHeader = await conn.fetchrow(strHeaderQuery,mdlRequest.intQuotationId,self.intUserId)
                
                if not rstQuotationHeader:
                    # TODO :: make clean response 
                    return{"error":"Quotation not found"}

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
                
                # dctItems =[
                #     {
                #         'strItemName': objRow['vchr_item_name'],
                #         'dblQuantity': objRow['dbl_quantity'],
                #         'dblUnitprice': objRow['dbl_unit_price']
                #     }
                #     for objRow in rstItems
                # ]
                dctItems = [
                    {
                        'name': objRow['vchr_item_name'],
                        'qty': float(objRow['dbl_quantity']),
                        'price': float(objRow['dbl_unit_price'])
                    }
                    for objRow in rstItems
                ]
                
                # Customer details block
                strCustomerName = rstQuotationHeader['vchr_customer_name']
                strCustomerPhone = rstQuotationHeader['vchr_customer_phone']
                strCustomerAddress = rstQuotationHeader['txt_customer_address'] 
                
                # shop details
                strBusinessName = rstQuotationHeader['vchr_business_name']
                strEmail = rstQuotationHeader['vchr_email']
                strShopPhoneNumber = rstQuotationHeader['vchr_phone']
                strShopGstNumber = rstQuotationHeader['vchr_gst_number']
                strQuotationNumber = rstQuotationHeader['vchr_quotation_number']
                strQuotationDate = rstQuotationHeader['dat_quotation_date']

        else:
            # Use data from request
            dctItems = [item.model_dump() for item in mdlRequest.lstItems] if mdlRequest.lstItems else []
            strCustomerName = mdlRequest.strCustomerName
            strCustomerPhone = mdlRequest.strCustomerPhone
            strCustomerAddress = mdlRequest.strCustomerAddress
            strQuotationDate = mdlRequest.strQuotationDate
            strQuotationNumber = mdlRequest.strQuotationNumber

            # ------------------------------
            # GENERATE PDF USING REPORTLAB
            # ------------------------------

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        elements = []
        styles = getSampleStyleSheet()

        # -----------------------------
        # HEADER SECTION (2 COLUMN LAYOUT)
        # -----------------------------

        header_data = [
            [
                Paragraph(f"<b><font size=16>{strBusinessName or ''}</font></b>", styles["Normal"]),
                Paragraph("<b><font size=18>QUOTATION</font></b>", styles["Normal"])
            ],
            [
                Paragraph(f"Email: {strEmail or ''}", styles["Normal"]),
                Paragraph(f"Quotation No: {strQuotationNumber}", styles["Normal"])
            ],
            [
                Paragraph(f"Phone: {strShopPhoneNumber or ''}", styles["Normal"]),
                Paragraph(f"Date: {strQuotationDate}", styles["Normal"])
            ],
            [
                Paragraph(f"GST: {strShopGstNumber or ''}", styles["Normal"]),
                ""
            ]
        ]
        header_table = Table(header_data, colWidths=[300, 200])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, 25))

                
        # -----------------------------
        # CUSTOMER BOX
        # -----------------------------

        customer_box = [
            [Paragraph("<b>Bill To</b>", styles["Normal"])],
            [Paragraph(strCustomerName or "", styles["Normal"])],
            [Paragraph(strCustomerPhone or "", styles["Normal"])],
            [Paragraph(strCustomerAddress or "", styles["Normal"])]
        ]

        customer_table = Table(customer_box, colWidths=[500])
        customer_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
            ("INNERPADDING", (0, 0), (-1, -1), 6),
        ]))

        elements.append(customer_table)
        elements.append(Spacer(1, 25))

        # -----------------------------
        # ITEMS TABLE
        # -----------------------------

        data = [["#", "Item Description", "Qty", "Unit Price (₹)", "Total (₹)"]]

        grand_total = 0

        for idx, item in enumerate(dctItems, start=1):
            qty = item["qty"]
            price = item["price"]
            total = qty * price
            grand_total += total

            data.append([
                str(idx),
                item["name"],
                f"{qty:.2f}",
                f"{price:,.2f}",
                f"{total:,.2f}"
            ])

        data.append(["", "", "", "Grand Total", f"{grand_total:,.2f}"])

        table = Table(
            data,
            colWidths=[40, 240, 60, 90, 90],
            repeatRows=1
        )

        table.setStyle(TableStyle([
            # Header style
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E3B4E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),

            # Grid
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),

            # Align numbers right
            ("ALIGN", (2, 1), (-1, -1), "RIGHT"),

            # Grand total highlight
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f5f5f5")),
            ("FONTNAME", (3, -1), (-1, -1), "Helvetica-Bold"),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 40))

        # -----------------------------
        # FOOTER
        # -----------------------------

        elements.append(Paragraph(
            "<font size=9>Thank you for your business.</font>",
            styles["Normal"]
        ))

        doc.build(elements)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                f"inline; filename=Quotation_{strQuotationNumber}.pdf"
            }
        )