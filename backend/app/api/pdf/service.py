from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    HRFlowable,
)
from fastapi.responses import StreamingResponse
import io

# ── colour palette ──────────────────────────────────────────────
BRAND_DARK   = colors.HexColor("#1B2A4A")
BRAND_ACCENT = colors.HexColor("#2563EB")
LIGHT_BG     = colors.HexColor("#F8FAFC")
TABLE_HEADER = colors.HexColor("#1E3A5F")
ROW_ALT      = colors.HexColor("#F1F5F9")
BORDER_CLR   = colors.HexColor("#CBD5E1")
TEXT_DARK    = colors.HexColor("#1E293B")
TEXT_MUTED   = colors.HexColor("#64748B")

# Use "Rs." instead of unicode ₹ — Helvetica doesn't have the glyph
RUPEE = "Rs."


class ClsPdfGenerator:
    def __init__(self, objPool, intUserid) -> None:
        self.intUserId = intUserid
        self.objPool = objPool

    # ── canvas: header on every page ────────────────────────────
    def _draw_header(self, canvas, doc, *, business_name, email, phone, gst,
                     doc_title="QUOTATION"):
        canvas.saveState()
        w, h = A4

        # dark navy bar
        bar_h = 80
        canvas.setFillColor(BRAND_DARK)
        canvas.rect(0, h - bar_h, w, bar_h, fill=True, stroke=False)

        # accent stripe
        canvas.setFillColor(BRAND_ACCENT)
        canvas.rect(0, h - bar_h - 3, w, 3, fill=True, stroke=False)

        # business name — large, left
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 20)
        canvas.drawString(40, h - 38, (business_name or "Your Business").upper())

        # contact details below name — smaller
        canvas.setFont("Helvetica", 8.5)
        contact_parts = []
        if phone:
            contact_parts.append(phone)
        if email:
            contact_parts.append(email)
        if gst:
            contact_parts.append(f"GST: {gst}")
        contact_line = "   |   ".join(contact_parts)
        canvas.drawString(40, h - 55, contact_line)

        # doc title — right side, large
        canvas.setFont("Helvetica-Bold", 22)
        canvas.drawRightString(w - 40, h - 38, doc_title)

        canvas.restoreState()

    # ── canvas: footer on every page ────────────────────────────
    def _draw_footer(self, canvas, doc, *, business_name, phone):
        canvas.saveState()
        w, _ = A4

        # thin line
        canvas.setStrokeColor(BORDER_CLR)
        canvas.setLineWidth(0.5)
        canvas.line(40, 52, w - 40, 52)

        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawString(40, 40, business_name or "")
        if phone:
            canvas.drawString(40, 30, f"Contact: {phone}")
        canvas.drawRightString(w - 40, 40, f"Page {doc.page}")

        canvas.restoreState()

    # ── main quotation builder ──────────────────────────────────
    async def fnGetQuotationPdf(self, mdlRequest):
        """Generate a clean, professional quotation PDF."""

        # ── 1. Resolve data ─────────────────────────────────────
        strBusinessName = strEmail = strShopPhoneNumber = strShopGstNumber = ""

        if mdlRequest.intQuotationId:
            async with self.objPool.acquire() as conn:
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
                rstQuotationHeader = await conn.fetchrow(
                    strHeaderQuery, mdlRequest.intQuotationId, self.intUserId
                )
                if not rstQuotationHeader:
                    return {"error": "Quotation not found"}

                strItemsQuery = """
                    SELECT vchr_item_name, dbl_quantity, dbl_unit_price
                    FROM tbl_quotation_item
                    WHERE fk_bint_quotation_id = $1
                    ORDER BY int_sort_order
                """
                rstItems = await conn.fetch(strItemsQuery, mdlRequest.intQuotationId)

                dctItems = [
                    {
                        "name": r["vchr_item_name"],
                        "qty": float(r["dbl_quantity"]),
                        "price": float(r["dbl_unit_price"]),
                    }
                    for r in rstItems
                ]

                strCustomerName    = rstQuotationHeader["vchr_customer_name"]
                strCustomerPhone   = rstQuotationHeader["vchr_customer_phone"]
                strCustomerAddress = rstQuotationHeader["txt_customer_address"]
                strBusinessName    = rstQuotationHeader["vchr_business_name"]
                strEmail           = rstQuotationHeader["vchr_email"]
                strShopPhoneNumber = rstQuotationHeader["vchr_phone"]
                strShopGstNumber   = rstQuotationHeader["vchr_gst_number"]
                strQuotationNumber = rstQuotationHeader["vchr_quotation_number"]
                strQuotationDate   = rstQuotationHeader["dat_quotation_date"]
        else:
            dctItems = (
                [item.model_dump() for item in mdlRequest.lstItems]
                if mdlRequest.lstItems
                else []
            )
            strCustomerName    = mdlRequest.strCustomerName
            strCustomerPhone   = mdlRequest.strCustomerPhone
            strCustomerAddress = mdlRequest.strCustomerAddress
            strQuotationDate   = mdlRequest.strQuotationDate
            strQuotationNumber = mdlRequest.strQuotationNumber

        # ── 2. PDF setup ────────────────────────────────────────
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=105,    # room for canvas header
            bottomMargin=70,  # room for canvas footer
        )

        styles = getSampleStyleSheet()
        elements = []

        # ── reusable styles ─────────────────────────────────────
        stSectionLabel = ParagraphStyle(
            "secLabel", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=BRAND_ACCENT, spaceAfter=3,
        )
        stName = ParagraphStyle(
            "secName", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
        )
        stDetail = ParagraphStyle(
            "secDetail", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=1, leading=12,
        )
        stDetailRight = ParagraphStyle(
            "secDetailR", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=1, leading=12,
            alignment=TA_RIGHT,
        )
        stLabelRight = ParagraphStyle(
            "secLabelR", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=BRAND_ACCENT, spaceAfter=3,
            alignment=TA_RIGHT,
        )
        stNameRight = ParagraphStyle(
            "secNameR", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
            alignment=TA_RIGHT,
        )

        # ── FROM / BILL TO — two-column layout ─────────────────
        # Left column: "From" (business details)
        from_col = []
        from_col.append(Paragraph("FROM", stSectionLabel))
        from_col.append(Paragraph(
            (strBusinessName or "Your Business").upper(), stName
        ))
        if strShopPhoneNumber:
            from_col.append(Paragraph(f"Phone: {strShopPhoneNumber}", stDetail))
        if strEmail:
            from_col.append(Paragraph(f"Email: {strEmail}", stDetail))
        if strShopGstNumber:
            from_col.append(Paragraph(f"GST: {strShopGstNumber}", stDetail))

        # Right column: "Bill To" (customer details)
        to_col = []
        to_col.append(Paragraph("BILL TO", stLabelRight))
        to_col.append(Paragraph(strCustomerName or "-", stNameRight))
        if strCustomerPhone:
            to_col.append(Paragraph(f"Phone: {strCustomerPhone}", stDetailRight))
        if strCustomerAddress:
            to_col.append(Paragraph(strCustomerAddress, stDetailRight))

        addr_table = Table(
            [[from_col, to_col]],
            colWidths=[260, 250],
        )
        addr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(addr_table)
        elements.append(Spacer(1, 10))

        # ── Quotation No + Date row ────────────────────────────
        stMetaLabel = ParagraphStyle(
            "metaLbl", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica",
            textColor=TEXT_MUTED,
        )
        stMetaVal = ParagraphStyle(
            "metaVal", parent=styles["Normal"],
            fontSize=9.5, fontName="Helvetica-Bold",
            textColor=TEXT_DARK,
        )

        meta_data = [[
            Paragraph("Quotation No.", stMetaLabel),
            Paragraph(str(strQuotationNumber or "-"), stMetaVal),
            Paragraph("Date", stMetaLabel),
            Paragraph(str(strQuotationDate or "-"), stMetaVal),
        ]]
        meta_tbl = Table(meta_data, colWidths=[80, 180, 40, 210])
        meta_tbl.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_BG),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))
        elements.append(meta_tbl)
        elements.append(Spacer(1, 16))

        # ── divider ─────────────────────────────────────────────
        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=BORDER_CLR,
            spaceBefore=0, spaceAfter=14,
        ))

        # ── ITEMS TABLE ─────────────────────────────────────────
        col_widths = [30, 228, 50, 100, 100]
        header_row = ["#", "Description", "Qty", "Unit Price", "Amount"]

        tbl_data = [header_row]
        grand_total = 0.0

        stItemDesc = ParagraphStyle(
            "itemDesc", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica", leading=12,
        )

        for idx, item in enumerate(dctItems, start=1):
            qty   = item["qty"]
            price = item["price"]
            total = qty * price
            grand_total += total
            tbl_data.append([
                str(idx),
                Paragraph(item["name"], stItemDesc),
                f"{qty:g}",
                f"{RUPEE} {price:,.2f}",
                f"{RUPEE} {total:,.2f}",
            ])

        # grand total row
        tbl_data.append([
            "", "", "",
            Paragraph("<b>Grand Total</b>", ParagraphStyle(
                "gtLabel", parent=styles["Normal"],
                fontSize=10, fontName="Helvetica-Bold",
                textColor=TEXT_DARK, alignment=TA_RIGHT,
            )),
            Paragraph(f"<b>{RUPEE} {grand_total:,.2f}</b>", ParagraphStyle(
                "gtVal", parent=styles["Normal"],
                fontSize=10, fontName="Helvetica-Bold",
                textColor=BRAND_DARK, alignment=TA_RIGHT,
            )),
        ])

        tbl = Table(tbl_data, colWidths=col_widths, repeatRows=1)

        tbl_style_rules = [
            # header
            ("BACKGROUND",    (0, 0), (-1, 0), TABLE_HEADER),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("TOPPADDING",    (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),

            # data rows
            ("FONTNAME",      (0, 1), (-1, -2), "Helvetica"),
            ("FONTSIZE",      (0, 1), (-1, -2), 9),
            ("TOPPADDING",    (0, 1), (-1, -2), 7),
            ("BOTTOMPADDING", (0, 1), (-1, -2), 7),
            ("VALIGN",        (0, 1), (-1, -1), "MIDDLE"),

            # alignment
            ("ALIGN", (0, 0), (0, -1), "CENTER"),   # #
            ("ALIGN", (2, 0), (2, -1), "CENTER"),    # qty
            ("ALIGN", (3, 0), (-1, -1), "RIGHT"),    # price + amount

            # clean horizontal lines only
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, TABLE_HEADER),
            ("LINEBELOW", (0, 1), (-1, -2), 0.3, BORDER_CLR),

            # grand total row
            ("LINEABOVE",     (0, -1), (-1, -1), 1.2, BRAND_DARK),
            ("TOPPADDING",    (0, -1), (-1, -1), 10),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
            ("BACKGROUND",    (0, -1), (-1, -1), LIGHT_BG),
        ]

        # alternating row colour
        for i in range(1, len(tbl_data) - 1):
            if i % 2 == 0:
                tbl_style_rules.append(
                    ("BACKGROUND", (0, i), (-1, i), ROW_ALT)
                )

        tbl.setStyle(TableStyle(tbl_style_rules))
        elements.append(tbl)
        elements.append(Spacer(1, 30))

        # ── thank-you note ──────────────────────────────────────
        stNote = ParagraphStyle(
            "qNote", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Oblique",
            textColor=TEXT_MUTED, spaceAfter=4,
        )
        elements.append(Paragraph("Thank you for your business.", stNote))
        elements.append(Paragraph(
            "This quotation is valid for 15 days from the date of issue.",
            stNote,
        ))

        # ── 3. Build with header/footer on every page ───────────
        def on_page(cvs, doc_ref):
            self._draw_header(
                cvs, doc_ref,
                business_name=strBusinessName,
                email=strEmail,
                phone=strShopPhoneNumber,
                gst=strShopGstNumber,
            )
            self._draw_footer(
                cvs, doc_ref,
                business_name=strBusinessName,
                phone=strShopPhoneNumber,
            )

        doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    f"inline; filename=Quotation_{strQuotationNumber}.pdf"
            },
        )

    # ══════════════════════════════════════════════════════════════
    #  INVOICE PDF
    # ══════════════════════════════════════════════════════════════
    async def fnGetInvoicePdf(self, mdlRequest):
        """Generate a clean, professional invoice PDF."""

        # ── 1. Resolve data ─────────────────────────────────────
        strBusinessName = strEmail = strShopPhoneNumber = strShopGstNumber = ""
        dblTaxPercent = dblTaxAmount = dblDiscount = 0.0
        strNotes = strPaymentStatus = strDueDate = ""

        if mdlRequest.intInvoiceId:
            async with self.objPool.acquire() as conn:
                strHeaderQuery = """
                    SELECT
                        u.vchr_business_name,
                        u.vchr_email,
                        u.vchr_phone,
                        u.vchr_gst_number,
                        i.vchr_invoice_number,
                        i.dat_invoice_date,
                        i.dat_due_date,
                        i.vchr_customer_name,
                        i.vchr_customer_phone,
                        i.txt_customer_address,
                        i.dbl_subtotal,
                        i.dbl_tax_percent,
                        i.dbl_tax_amount,
                        i.dbl_discount_amount,
                        i.dbl_total_amount,
                        i.txt_notes,
                        i.vchr_payment_status
                    FROM tbl_invoice i
                    LEFT JOIN tbl_user u ON i.fk_bint_user_id = u.pk_bint_user_id
                    WHERE i.pk_bint_invoice_id = $1
                      AND i.fk_bint_user_id = $2;
                """
                rstHeader = await conn.fetchrow(
                    strHeaderQuery, mdlRequest.intInvoiceId, self.intUserId
                )
                if not rstHeader:
                    return {"error": "Invoice not found"}

                strItemsQuery = """
                    SELECT vchr_item_name, dbl_quantity, dbl_unit_price
                    FROM tbl_invoice_item
                    WHERE fk_bint_invoice_id = $1
                    ORDER BY int_sort_order
                """
                rstItems = await conn.fetch(strItemsQuery, mdlRequest.intInvoiceId)

                dctItems = [
                    {
                        "name": r["vchr_item_name"],
                        "qty": float(r["dbl_quantity"]),
                        "price": float(r["dbl_unit_price"]),
                    }
                    for r in rstItems
                ]

                strCustomerName    = rstHeader["vchr_customer_name"]
                strCustomerPhone   = rstHeader["vchr_customer_phone"]
                strCustomerAddress = rstHeader["txt_customer_address"]
                strBusinessName    = rstHeader["vchr_business_name"]
                strEmail           = rstHeader["vchr_email"]
                strShopPhoneNumber = rstHeader["vchr_phone"]
                strShopGstNumber   = rstHeader["vchr_gst_number"]
                strInvoiceNumber   = rstHeader["vchr_invoice_number"]
                strInvoiceDate     = rstHeader["dat_invoice_date"]
                strDueDate         = rstHeader["dat_due_date"]
                dblTaxPercent      = float(rstHeader["dbl_tax_percent"] or 0)
                dblTaxAmount       = float(rstHeader["dbl_tax_amount"] or 0)
                dblDiscount        = float(rstHeader["dbl_discount_amount"] or 0)
                strNotes           = rstHeader["txt_notes"] or ""
                strPaymentStatus   = rstHeader["vchr_payment_status"] or ""
        else:
            dctItems = (
                [item.model_dump() for item in mdlRequest.lstItems]
                if mdlRequest.lstItems
                else []
            )
            strCustomerName    = mdlRequest.strCustomerName
            strCustomerPhone   = mdlRequest.strCustomerPhone
            strCustomerAddress = mdlRequest.strCustomerAddress
            strInvoiceDate     = mdlRequest.strInvoiceDate
            strInvoiceNumber   = mdlRequest.strInvoiceNumber
            strDueDate         = mdlRequest.strDueDate

        # ── 2. PDF setup ────────────────────────────────────────
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=105,
            bottomMargin=70,
        )

        styles = getSampleStyleSheet()
        elements = []

        # ── reusable styles ─────────────────────────────────────
        stSectionLabel = ParagraphStyle(
            "iSecLabel", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=BRAND_ACCENT, spaceAfter=3,
        )
        stName = ParagraphStyle(
            "iSecName", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
        )
        stDetail = ParagraphStyle(
            "iSecDetail", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=1, leading=12,
        )
        stDetailRight = ParagraphStyle(
            "iSecDetailR", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=1, leading=12,
            alignment=TA_RIGHT,
        )
        stLabelRight = ParagraphStyle(
            "iSecLabelR", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=BRAND_ACCENT, spaceAfter=3,
            alignment=TA_RIGHT,
        )
        stNameRight = ParagraphStyle(
            "iSecNameR", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
            alignment=TA_RIGHT,
        )

        # ── FROM / BILL TO ─────────────────────────────────────
        from_col = []
        from_col.append(Paragraph("FROM", stSectionLabel))
        from_col.append(Paragraph(
            (strBusinessName or "Your Business").upper(), stName
        ))
        if strShopPhoneNumber:
            from_col.append(Paragraph(f"Phone: {strShopPhoneNumber}", stDetail))
        if strEmail:
            from_col.append(Paragraph(f"Email: {strEmail}", stDetail))
        if strShopGstNumber:
            from_col.append(Paragraph(f"GST: {strShopGstNumber}", stDetail))

        to_col = []
        to_col.append(Paragraph("BILL TO", stLabelRight))
        to_col.append(Paragraph(strCustomerName or "-", stNameRight))
        if strCustomerPhone:
            to_col.append(Paragraph(f"Phone: {strCustomerPhone}", stDetailRight))
        if strCustomerAddress:
            to_col.append(Paragraph(strCustomerAddress, stDetailRight))

        addr_table = Table(
            [[from_col, to_col]],
            colWidths=[260, 250],
        )
        addr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(addr_table)
        elements.append(Spacer(1, 10))

        # ── Invoice meta row ────────────────────────────────────
        stMetaLabel = ParagraphStyle(
            "iMetaLbl", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica",
            textColor=TEXT_MUTED,
        )
        stMetaVal = ParagraphStyle(
            "iMetaVal", parent=styles["Normal"],
            fontSize=9.5, fontName="Helvetica-Bold",
            textColor=TEXT_DARK,
        )

        meta_rows = [
            [
                Paragraph("Invoice No.", stMetaLabel),
                Paragraph(str(strInvoiceNumber or "-"), stMetaVal),
                Paragraph("Invoice Date", stMetaLabel),
                Paragraph(str(strInvoiceDate or "-"), stMetaVal),
            ],
        ]
        # second row: due date + payment status (if from DB)
        if strDueDate or strPaymentStatus:
            meta_rows.append([
                Paragraph("Due Date", stMetaLabel),
                Paragraph(str(strDueDate or "-"), stMetaVal),
                Paragraph("Status", stMetaLabel),
                Paragraph(
                    str(strPaymentStatus or "-").upper(), ParagraphStyle(
                        "iStatusVal", parent=styles["Normal"],
                        fontSize=9.5, fontName="Helvetica-Bold",
                        textColor=(
                            colors.HexColor("#16A34A") if strPaymentStatus == "paid"
                            else colors.HexColor("#DC2626") if strPaymentStatus == "overdue"
                            else colors.HexColor("#D97706")
                        ),
                    )
                ),
            ])

        meta_tbl = Table(meta_rows, colWidths=[80, 180, 80, 170])
        meta_tbl.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_BG),
        ]))
        elements.append(meta_tbl)
        elements.append(Spacer(1, 16))

        # ── divider ─────────────────────────────────────────────
        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=BORDER_CLR,
            spaceBefore=0, spaceAfter=14,
        ))

        # ── ITEMS TABLE ─────────────────────────────────────────
        col_widths = [30, 228, 50, 100, 100]
        header_row = ["#", "Description", "Qty", "Unit Price", "Amount"]

        tbl_data = [header_row]
        subtotal = 0.0

        stItemDesc = ParagraphStyle(
            "iItemDesc", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica", leading=12,
        )

        for idx, item in enumerate(dctItems, start=1):
            qty   = item["qty"]
            price = item["price"]
            total = qty * price
            subtotal += total
            tbl_data.append([
                str(idx),
                Paragraph(item["name"], stItemDesc),
                f"{qty:g}",
                f"{RUPEE} {price:,.2f}",
                f"{RUPEE} {total:,.2f}",
            ])

        # ── summary rows (subtotal, tax, discount, total) ──────
        stSumLabel = ParagraphStyle(
            "iSumLbl", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, alignment=TA_RIGHT,
        )
        stSumVal = ParagraphStyle(
            "iSumVal", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, alignment=TA_RIGHT,
        )
        stTotalLabel = ParagraphStyle(
            "iTotLbl", parent=styles["Normal"],
            fontSize=10, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, alignment=TA_RIGHT,
        )
        stTotalVal = ParagraphStyle(
            "iTotVal", parent=styles["Normal"],
            fontSize=10, fontName="Helvetica-Bold",
            textColor=BRAND_DARK, alignment=TA_RIGHT,
        )

        # subtotal row
        tbl_data.append([
            "", "", "",
            Paragraph("Subtotal", stSumLabel),
            Paragraph(f"{RUPEE} {subtotal:,.2f}", stSumVal),
        ])

        # tax row (if any)
        if dblTaxPercent > 0 or dblTaxAmount > 0:
            tax_label = f"Tax ({dblTaxPercent:g}%)" if dblTaxPercent else "Tax"
            tax_val = dblTaxAmount if dblTaxAmount else subtotal * dblTaxPercent / 100
            tbl_data.append([
                "", "", "",
                Paragraph(tax_label, stSumLabel),
                Paragraph(f"{RUPEE} {tax_val:,.2f}", stSumVal),
            ])
        else:
            tax_val = 0.0

        # discount row (if any)
        if dblDiscount > 0:
            tbl_data.append([
                "", "", "",
                Paragraph("Discount", stSumLabel),
                Paragraph(f"- {RUPEE} {dblDiscount:,.2f}", stSumVal),
            ])

        # grand total
        grand_total = subtotal + tax_val - dblDiscount
        tbl_data.append([
            "", "", "",
            Paragraph("<b>Total</b>", stTotalLabel),
            Paragraph(f"<b>{RUPEE} {grand_total:,.2f}</b>", stTotalVal),
        ])

        tbl = Table(tbl_data, colWidths=col_widths, repeatRows=1)

        # count of item rows (excluding summary rows)
        num_items = len(dctItems)
        # summary rows start after header + item rows
        summary_start = 1 + num_items

        tbl_style_rules = [
            # header
            ("BACKGROUND",    (0, 0), (-1, 0), TABLE_HEADER),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("TOPPADDING",    (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),

            # item data rows
            ("FONTNAME",      (0, 1), (-1, num_items), "Helvetica"),
            ("FONTSIZE",      (0, 1), (-1, num_items), 9),
            ("TOPPADDING",    (0, 1), (-1, num_items), 7),
            ("BOTTOMPADDING", (0, 1), (-1, num_items), 7),
            ("VALIGN",        (0, 1), (-1, -1), "MIDDLE"),

            # alignment
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("ALIGN", (3, 0), (-1, -1), "RIGHT"),

            # horizontal lines for items
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, TABLE_HEADER),
            ("LINEBELOW", (0, 1), (-1, num_items), 0.3, BORDER_CLR),

            # summary section separator
            ("LINEABOVE", (3, summary_start), (-1, summary_start), 0.5, BORDER_CLR),
            ("TOPPADDING",    (0, summary_start), (-1, -1), 5),
            ("BOTTOMPADDING", (0, summary_start), (-1, -1), 5),

            # grand total row
            ("LINEABOVE",     (3, -1), (-1, -1), 1.2, BRAND_DARK),
            ("TOPPADDING",    (0, -1), (-1, -1), 10),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
            ("BACKGROUND",    (0, -1), (-1, -1), LIGHT_BG),
        ]

        # alternating row colour for items only
        for i in range(1, num_items + 1):
            if i % 2 == 0:
                tbl_style_rules.append(
                    ("BACKGROUND", (0, i), (-1, i), ROW_ALT)
                )

        tbl.setStyle(TableStyle(tbl_style_rules))
        elements.append(tbl)
        elements.append(Spacer(1, 24))

        # ── notes (if any) ──────────────────────────────────────
        if strNotes:
            stNotesLabel = ParagraphStyle(
                "iNotesLbl", parent=styles["Normal"],
                fontSize=8, fontName="Helvetica-Bold",
                textColor=TEXT_MUTED, spaceAfter=3,
            )
            stNotesBody = ParagraphStyle(
                "iNotesBody", parent=styles["Normal"],
                fontSize=9, fontName="Helvetica",
                textColor=TEXT_DARK, spaceAfter=8, leading=12,
            )
            elements.append(Paragraph("NOTES", stNotesLabel))
            elements.append(Paragraph(strNotes, stNotesBody))
            elements.append(Spacer(1, 10))

        # ── thank-you note ──────────────────────────────────────
        stNote = ParagraphStyle(
            "iNote", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Oblique",
            textColor=TEXT_MUTED, spaceAfter=4,
        )
        elements.append(Paragraph("Thank you for your business.", stNote))

        # ── 3. Build with header/footer ─────────────────────────
        def on_page(cvs, doc_ref):
            self._draw_header(
                cvs, doc_ref,
                business_name=strBusinessName,
                email=strEmail,
                phone=strShopPhoneNumber,
                gst=strShopGstNumber,
                doc_title="INVOICE",
            )
            self._draw_footer(
                cvs, doc_ref,
                business_name=strBusinessName,
                phone=strShopPhoneNumber,
            )

        doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    f"inline; filename=Invoice_{strInvoiceNumber}.pdf"
            },
        )

    async def fnGetWarrantyCertificatePdf(self, mdlRequest):
        """Generate warranty certificate PDF directly from quotation items."""
        strBusinessName = strEmail = strShopPhoneNumber = strShopGstNumber = ""

        async with self.objPool.acquire() as conn:
            intQuotationId = mdlRequest.intQuotationId
            strInvoiceNumber = None

            if mdlRequest.intInvoiceId and not intQuotationId:
                rstInvoiceLink = await conn.fetchrow(
                    """
                    SELECT fk_bint_quotation_id, vchr_invoice_number
                    FROM tbl_invoice
                    WHERE pk_bint_invoice_id = $1
                      AND fk_bint_user_id = $2
                    """,
                    mdlRequest.intInvoiceId,
                    self.intUserId,
                )
                if not rstInvoiceLink:
                    return {"error": "Invoice not found"}
                intQuotationId = rstInvoiceLink["fk_bint_quotation_id"]
                strInvoiceNumber = rstInvoiceLink["vchr_invoice_number"]

            if not intQuotationId:
                return {"error": "Quotation ID is required for warranty certificate"}

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
                    q.txt_customer_address,
                    i.vchr_invoice_number
                FROM tbl_quotation q
                LEFT JOIN tbl_user u ON q.fk_bint_user_id = u.pk_bint_user_id
                LEFT JOIN tbl_invoice i ON i.fk_bint_quotation_id = q.pk_bint_quotation_id
                WHERE q.pk_bint_quotation_id = $1
                  AND q.fk_bint_user_id = $2
                ORDER BY i.pk_bint_invoice_id DESC
                LIMIT 1
            """
            rstHeader = await conn.fetchrow(strHeaderQuery, intQuotationId, self.intUserId)
            if not rstHeader:
                return {"error": "Quotation not found"}

            strItemsQuery = """
                SELECT
                    vchr_item_name,
                    dbl_quantity,
                    vchr_unit,
                    dat_implementation_date,
                    int_warranty_years,
                    int_warranty_months,
                    int_warranty_days,
                    dat_expiry_date
                FROM tbl_quotation_item
                WHERE fk_bint_quotation_id = $1
                  AND (
                      COALESCE(int_warranty_years, 0) > 0
                      OR COALESCE(int_warranty_months, 0) > 0
                      OR COALESCE(int_warranty_days, 0) > 0
                      OR COALESCE(bln_manual_expiry_override, FALSE) = TRUE
                  )
                ORDER BY int_sort_order
            """
            rstItems = await conn.fetch(strItemsQuery, intQuotationId)

            dctItems = [
                {
                    "name": row["vchr_item_name"],
                    "quantity": float(row["dbl_quantity"] or 0),
                    "unit": row["vchr_unit"] or "piece",
                    "implementation_date": row["dat_implementation_date"],
                    "years": int(row["int_warranty_years"] or 0),
                    "months": int(row["int_warranty_months"] or 0),
                    "days": int(row["int_warranty_days"] or 0),
                    "expiry_date": row["dat_expiry_date"],
                }
                for row in rstItems
            ]

            # Get common implementation date (first item's date)
            strImplementationDate = None
            if dctItems:
                strImplementationDate = dctItems[0].get("implementation_date")

            strCustomerName = rstHeader["vchr_customer_name"]
            strCustomerPhone = rstHeader["vchr_customer_phone"]
            strCustomerAddress = rstHeader["txt_customer_address"]
            strBusinessName = rstHeader["vchr_business_name"]
            strEmail = rstHeader["vchr_email"]
            strShopPhoneNumber = rstHeader["vchr_phone"]
            strShopGstNumber = rstHeader["vchr_gst_number"]
            strQuotationNumber = rstHeader["vchr_quotation_number"]
            strInvoiceNumber = strInvoiceNumber or rstHeader["vchr_invoice_number"]
            strCertificateNumber = f"WAR-{strQuotationNumber}"

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=105,
            bottomMargin=70,
        )

        styles = getSampleStyleSheet()
        elements = []

        stSectionLabel = ParagraphStyle(
            "wSecLabel", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=BRAND_ACCENT, spaceAfter=3,
        )
        stName = ParagraphStyle(
            "wSecName", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
        )
        stDetail = ParagraphStyle(
            "wSecDetail", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=1, leading=12,
        )
        stDetailRight = ParagraphStyle(
            "wSecDetailR", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, spaceAfter=1, leading=12,
            alignment=TA_RIGHT,
        )
        stLabelRight = ParagraphStyle(
            "wSecLabelR", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=BRAND_ACCENT, spaceAfter=3,
            alignment=TA_RIGHT,
        )
        stNameRight = ParagraphStyle(
            "wSecNameR", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
            alignment=TA_RIGHT,
        )

        from_col = []
        from_col.append(Paragraph("FROM", stSectionLabel))
        from_col.append(Paragraph((strBusinessName or "Your Business").upper(), stName))
        if strShopPhoneNumber:
            from_col.append(Paragraph(f"Phone: {strShopPhoneNumber}", stDetail))
        if strEmail:
            from_col.append(Paragraph(f"Email: {strEmail}", stDetail))
        if strShopGstNumber:
            from_col.append(Paragraph(f"GST: {strShopGstNumber}", stDetail))

        to_col = []
        to_col.append(Paragraph("CUSTOMER", stLabelRight))
        to_col.append(Paragraph(strCustomerName or "-", stNameRight))
        if strCustomerPhone:
            to_col.append(Paragraph(f"Phone: {strCustomerPhone}", stDetailRight))
        if strCustomerAddress:
            to_col.append(Paragraph(strCustomerAddress, stDetailRight))

        addr_table = Table([[from_col, to_col]], colWidths=[260, 250])
        addr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(addr_table)
        elements.append(Spacer(1, 10))

        stMetaLabel = ParagraphStyle(
            "wMetaLbl", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica",
            textColor=TEXT_MUTED,
        )
        stMetaVal = ParagraphStyle(
            "wMetaVal", parent=styles["Normal"],
            fontSize=9.5, fontName="Helvetica-Bold",
            textColor=TEXT_DARK,
        )

        meta_tbl = Table(
            [[
                Paragraph("Certificate No.", stMetaLabel),
                Paragraph(str(strCertificateNumber or "-"), stMetaVal),
                Paragraph("Implementation Date", stMetaLabel),
                Paragraph(str(strImplementationDate or "-"), stMetaVal),
            ]],
            colWidths=[90, 170, 110, 140],
        )
        meta_tbl.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_BG),
        ]))
        elements.append(meta_tbl)
        elements.append(Spacer(1, 14))

        strDocLabel = "Invoice No." if strInvoiceNumber else "Quotation No."
        strDocValue = strInvoiceNumber or strQuotationNumber or "-"
        doc_ref_table = Table(
            [[
                Paragraph(strDocLabel, stMetaLabel),
                Paragraph(str(strDocValue), stMetaVal),
            ]],
            colWidths=[90, 420],
        )
        doc_ref_table.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND",    (0, 0), (-1, -1), colors.white),
            ("BOX",           (0, 0), (-1, -1), 0.5, BORDER_CLR),
        ]))
        elements.append(doc_ref_table)
        elements.append(Spacer(1, 12))

        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=BORDER_CLR,
            spaceBefore=0, spaceAfter=12,
        ))

        header_row = ["#", "Item", "Qty", "Expiry"]
        tbl_data = [header_row]
        stItemDesc = ParagraphStyle(
            "wItemDesc", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica", leading=12,
        )

        for idx, item in enumerate(dctItems, start=1):
            dblQty = item["quantity"]
            strQty = f"{int(dblQty)}" if dblQty == int(dblQty) else f"{dblQty}"
            tbl_data.append([
                str(idx),
                Paragraph(item["name"], stItemDesc),
                strQty,
                str(item["expiry_date"] or "-"),
            ])

        if len(tbl_data) == 1:
            tbl_data.append(["", Paragraph("No items", stItemDesc), "-", "-"])

        tbl = Table(tbl_data, colWidths=[30, 310, 60, 110], repeatRows=1)
        tbl_style_rules = [
            ("BACKGROUND",    (0, 0), (-1, 0), TABLE_HEADER),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("TOPPADDING",    (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",      (0, 1), (-1, -1), 9),
            ("TOPPADDING",    (0, 1), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 7),
            ("VALIGN",        (0, 1), (-1, -1), "MIDDLE"),
            ("ALIGN",         (0, 0), (0, -1), "CENTER"),
            ("ALIGN",         (2, 0), (-1, -1), "CENTER"),
            ("LINEBELOW",     (0, 0), (-1, 0), 0.8, TABLE_HEADER),
            ("LINEBELOW",     (0, 1), (-1, -1), 0.3, BORDER_CLR),
        ]
        for i in range(1, len(tbl_data)):
            if i % 2 == 0:
                tbl_style_rules.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

        tbl.setStyle(TableStyle(tbl_style_rules))
        elements.append(tbl)
        elements.append(Spacer(1, 20))

        stNote = ParagraphStyle(
            "wNote", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Oblique",
            textColor=TEXT_MUTED, spaceAfter=4,
        )
        elements.append(Paragraph("This certificate is generated based on recorded implementation details.", stNote))

        def on_page(cvs, doc_ref):
            self._draw_header(
                cvs, doc_ref,
                business_name=strBusinessName,
                email=strEmail,
                phone=strShopPhoneNumber,
                gst=strShopGstNumber,
                doc_title="WARRANTY CERTIFICATE",
            )
            self._draw_footer(
                cvs, doc_ref,
                business_name=strBusinessName,
                phone=strShopPhoneNumber,
            )

        doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    f"inline; filename=Warranty_{strQuotationNumber}.pdf"
            },
        )
