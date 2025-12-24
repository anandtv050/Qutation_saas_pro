from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from typing import List, Dict, Optional
import io
import os


class ClsPDFGenerator:
    """Generate professional PDFs for Quotations and Invoices"""

    def __init__(self):
        self.company_name = "HDC SECURITY SOLUTIONZ"
        self.location = "MOKERI"
        self.address = "NEAR BHARAT PETROLEUM"
        self.phone = "PH: 6235 15 3938"
        self.email = "hdc3078@gmail.com"
        self.phone_number = "6235153938"

        # Register Malayalam font if available
        self._register_font()

    def _register_font(self):
        """Register a Unicode font that supports Malayalam characters"""
        try:
            font_paths = [
                "fonts/NotoSansMalayalam.ttf",
                os.path.join(os.path.dirname(__file__), "fonts", "NotoSansMalayalam.ttf"),
                "C:/Windows/Fonts/NotoSans-Regular.ttf",
                "C:/Windows/Fonts/arial.ttf",
            ]

            font_registered = False
            for font_path in font_paths:
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont('MalayalamFont', font_path))
                        self.malayalam_font = 'MalayalamFont'
                        font_registered = True
                        break
                    except Exception:
                        continue

            if not font_registered:
                self.malayalam_font = 'Helvetica'
        except Exception:
            self.malayalam_font = 'Helvetica'

    def draw_header(self, canvas, doc):
        """Draw the professional black header with company branding"""
        canvas.saveState()

        # Black header background
        canvas.setFillColor(colors.black)
        canvas.rect(0, A4[1] - 1.3*inch, A4[0], 1.3*inch, fill=True, stroke=False)

        # HDC Logo (Left side) - HD in white
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 48)
        canvas.drawString(0.6*inch, A4[1] - 0.75*inch, "HD")

        # Orange "C" in logo
        canvas.setFillColor(colors.HexColor("#FF6B35"))
        canvas.drawString(0.6*inch + 85, A4[1] - 0.75*inch, "C")

        # Security Solutionz text below logo
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica", 10)
        canvas.drawString(0.6*inch, A4[1] - 1.05*inch, "SECURITY SOLUTIONZ")

        # Company details (Right side)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawRightString(A4[0] - 0.5*inch, A4[1] - 0.5*inch, self.location)

        canvas.setFont("Helvetica", 10)
        canvas.drawRightString(A4[0] - 0.5*inch, A4[1] - 0.7*inch, self.address)
        canvas.drawRightString(A4[0] - 0.5*inch, A4[1] - 0.9*inch, self.phone)

        canvas.restoreState()

    def draw_footer(self, canvas, doc):
        """Draw footer with company contact information"""
        canvas.saveState()

        canvas.setFont("Helvetica-Bold", 10)
        canvas.setFillColor(colors.black)
        canvas.drawString(0.75*inch, 0.75*inch, self.company_name)

        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.blue)
        canvas.drawString(0.75*inch, 0.55*inch, self.email)

        canvas.setFillColor(colors.black)
        canvas.drawString(0.75*inch, 0.35*inch, self.phone_number)

        canvas.restoreState()

    def draw_header_footer(self, canvas, doc):
        """Combined method to draw both header and footer"""
        self.draw_header(canvas, doc)
        self.draw_footer(canvas, doc)

    def generate_info_page(self) -> List:
        """Generate the first page with company information"""
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'RedTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.red,
            spaceAfter=20,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leftIndent=0
        )

        bullet_style = ParagraphStyle(
            'BulletPoint',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,
            spaceAfter=12,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=20,
            bulletIndent=0
        )

        elements.append(Paragraph("• How is hdc cctv hub different from the others ?", title_style))
        elements.append(Spacer(1, 0.3*inch))

        info_points = [
            "1) First ai controlled self service office in kerala",
            "2) Fast and proper service",
            "3) 10 year + experienced technicians",
            "4) Mainly deals with banking sector (federalbank,sib amc)",
            "5) 24*7 customer support",
        ]

        for point in info_points:
            elements.append(Paragraph(point, bullet_style))

        # Point 6 - Use English version (Malayalam requires special font setup)
        # If you have Malayalam font, the original text was in Malayalam
        point6_text = """<font color="red">6) If any COMPLAINT comes in HDC work, we will provide a replacement camera or DVR first, then take the faulty materials for service. (Since company SERVICE can be late, HDC provides this service - no other company offers this)</font>"""

        point6_style = ParagraphStyle(
            'Point6',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceAfter=12,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=20
        )

        elements.append(Paragraph(point6_text, point6_style))

        remaining_points = [
            "7) deals with quality products",
            "8) more details please visit our Instagram hdc_cctv_hub",
            "9) 1 YEAR FREE SERVICE (ONLY FOR COMPLAINTS T&C APPLIED)"
        ]

        for point in remaining_points:
            if "T&C APPLIED" in point:
                text = point.replace("(ONLY FOR COMPLAINTS T&C APPLIED)",
                                    '<font color="red">(ONLY FOR COMPLAINTS T&C APPLIED)</font>')
                elements.append(Paragraph(text, bullet_style))
            else:
                elements.append(Paragraph(point, bullet_style))

        return elements

    def generate_quotation_pdf(
        self,
        items: List[Dict],
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        customer_address: Optional[str] = None,
        quotation_date: Optional[str] = None,
        quotation_number: Optional[str] = None,
        include_info_page: bool = True
    ) -> io.BytesIO:
        """Generate PDF quotation with items"""

        pdf_buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=1.5*inch,
            bottomMargin=1*inch
        )

        elements = []

        # Add info page if requested
        if include_info_page:
            elements.extend(self.generate_info_page())
            elements.append(PageBreak())

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'QuotationTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.black,
            spaceAfter=30,
            spaceBefore=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        elements.append(Paragraph("ESTIMATE", title_style))
        elements.append(Spacer(1, 0.3*inch))

        # Date and reference section
        date_str = quotation_date or datetime.now().strftime('%d/%m/%Y')
        ref_str = quotation_number or datetime.now().strftime('%M%S')

        red_warning_style = ParagraphStyle(
            'RedWarning',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.red,
            fontName='Helvetica',
            alignment=TA_LEFT
        )

        date_ref_data = [
            [Paragraph("Date valid only 5 days", red_warning_style),
             f"DATE :{date_str}"],
            ["", f"REF  : {ref_str}"]
        ]

        date_table = Table(date_ref_data, colWidths=[3.5*inch, 3*inch])
        date_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (1, 0), (1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(date_table)
        elements.append(Spacer(1, 0.3*inch))

        # Customer details if provided
        if customer_name or customer_address:
            customer_style = ParagraphStyle(
                'CustomerInfo',
                parent=styles['Normal'],
                fontSize=11,
                fontName='Helvetica-Bold',
                spaceAfter=8
            )
            if customer_name:
                elements.append(Paragraph(f"Customer: {customer_name}", customer_style))
            if customer_phone:
                elements.append(Paragraph(f"Phone: {customer_phone}", customer_style))
            if customer_address:
                elements.append(Paragraph(f"Location: {customer_address}", customer_style))
            elements.append(Spacer(1, 0.2*inch))

        # Create items table
        table_data = [['Sl', 'DESCRIPTION', 'RATE', 'QTY', 'AMOUNT']]

        desc_style = ParagraphStyle(
            'DescriptionStyle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            alignment=TA_LEFT,
            leading=12
        )

        total = 0
        for idx, item in enumerate(items, 1):
            rate = float(item.get('rate', item.get('dblUnitPrice', 0)))
            qty = float(item.get('qty', item.get('dblQuantity', 1)))
            amount = rate * qty
            total += amount

            rate_str = f"{int(rate)}" if rate == int(rate) else f"{rate}"
            amount_str = f"{int(amount)}" if amount == int(amount) else f"{amount}"

            description = item.get('name', item.get('strItemName', ''))
            desc_paragraph = Paragraph(description, desc_style)

            table_data.append([
                str(idx),
                desc_paragraph,
                rate_str,
                str(int(qty)),
                amount_str
            ])

        # Add empty rows
        min_rows = 10
        empty_rows_needed = max(0, min_rows - len(items))
        for _ in range(empty_rows_needed):
            table_data.append(['', '', '', '', ''])

        table_data.append(['', '', '', '', ''])

        # Add total row
        total_str = f"{int(total)}" if total == int(total) else f"{total:.0f}"
        table_data.append(['', '', '', 'TOTAL', total_str])

        col_widths = [0.5*inch, 3.5*inch, 1*inch, 0.8*inch, 1.2*inch]

        item_table = Table(table_data, colWidths=col_widths, repeatRows=1)

        table_style = TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D0D0D0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (-2, -1), (-1, -1), 12),
            ('ALIGN', (-2, -1), (-2, -1), 'CENTER'),
            ('ALIGN', (-1, -1), (-1, -1), 'RIGHT'),
        ])

        item_table.setStyle(table_style)
        elements.append(item_table)

        doc.build(elements,
                 onFirstPage=self.draw_header_footer,
                 onLaterPages=self.draw_header_footer)

        pdf_buffer.seek(0)
        return pdf_buffer

    def generate_invoice_pdf(
        self,
        items: List[Dict],
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        customer_address: Optional[str] = None,
        invoice_date: Optional[str] = None,
        invoice_number: Optional[str] = None,
        due_date: Optional[str] = None,
        include_info_page: bool = False
    ) -> io.BytesIO:
        """Generate PDF invoice with items"""

        pdf_buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=1.5*inch,
            bottomMargin=1*inch
        )

        elements = []

        # Add info page if requested
        if include_info_page:
            elements.extend(self.generate_info_page())
            elements.append(PageBreak())

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'InvoiceTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.black,
            spaceAfter=30,
            spaceBefore=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        elements.append(Paragraph("INVOICE", title_style))
        elements.append(Spacer(1, 0.3*inch))

        # Date and reference section
        date_str = invoice_date or datetime.now().strftime('%d/%m/%Y')
        ref_str = invoice_number or datetime.now().strftime('%M%S')

        date_ref_data = [
            [f"DATE: {date_str}", f"INVOICE NO: {ref_str}"],
        ]

        if due_date:
            date_ref_data.append([f"DUE DATE: {due_date}", ""])

        date_table = Table(date_ref_data, colWidths=[3.5*inch, 3*inch])
        date_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(date_table)
        elements.append(Spacer(1, 0.3*inch))

        # Customer details
        if customer_name or customer_address:
            customer_style = ParagraphStyle(
                'CustomerInfo',
                parent=styles['Normal'],
                fontSize=11,
                fontName='Helvetica-Bold',
                spaceAfter=8
            )

            elements.append(Paragraph("BILL TO:", customer_style))

            customer_detail_style = ParagraphStyle(
                'CustomerDetail',
                parent=styles['Normal'],
                fontSize=10,
                fontName='Helvetica',
                spaceAfter=4,
                leftIndent=10
            )

            if customer_name:
                elements.append(Paragraph(f"{customer_name}", customer_detail_style))
            if customer_phone:
                elements.append(Paragraph(f"Phone: {customer_phone}", customer_detail_style))
            if customer_address:
                elements.append(Paragraph(f"{customer_address}", customer_detail_style))
            elements.append(Spacer(1, 0.2*inch))

        # Create items table
        table_data = [['Sl', 'DESCRIPTION', 'RATE', 'QTY', 'AMOUNT']]

        desc_style = ParagraphStyle(
            'DescriptionStyle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            alignment=TA_LEFT,
            leading=12
        )

        total = 0
        for idx, item in enumerate(items, 1):
            rate = float(item.get('rate', item.get('dblUnitPrice', 0)))
            qty = float(item.get('qty', item.get('dblQuantity', 1)))
            amount = rate * qty
            total += amount

            rate_str = f"{int(rate)}" if rate == int(rate) else f"{rate}"
            amount_str = f"{int(amount)}" if amount == int(amount) else f"{amount}"

            description = item.get('name', item.get('strItemName', ''))
            desc_paragraph = Paragraph(description, desc_style)

            table_data.append([
                str(idx),
                desc_paragraph,
                rate_str,
                str(int(qty)),
                amount_str
            ])

        # Add empty rows
        min_rows = 8
        empty_rows_needed = max(0, min_rows - len(items))
        for _ in range(empty_rows_needed):
            table_data.append(['', '', '', '', ''])

        table_data.append(['', '', '', '', ''])

        # Add total row
        total_str = f"{int(total)}" if total == int(total) else f"{total:.0f}"
        table_data.append(['', '', '', 'TOTAL', total_str])

        col_widths = [0.5*inch, 3.5*inch, 1*inch, 0.8*inch, 1.2*inch]

        item_table = Table(table_data, colWidths=col_widths, repeatRows=1)

        table_style = TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D0D0D0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (-2, -1), (-1, -1), 12),
            ('ALIGN', (-2, -1), (-2, -1), 'CENTER'),
            ('ALIGN', (-1, -1), (-1, -1), 'RIGHT'),
        ])

        item_table.setStyle(table_style)
        elements.append(item_table)

        # Add payment status section
        elements.append(Spacer(1, 0.3*inch))

        paid_style = ParagraphStyle(
            'PaidStatus',
            parent=styles['Normal'],
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#228B22'),
            alignment=TA_CENTER,
            spaceAfter=10
        )

        elements.append(Paragraph("PAID", paid_style))

        doc.build(elements,
                 onFirstPage=self.draw_header_footer,
                 onLaterPages=self.draw_header_footer)

        pdf_buffer.seek(0)
        return pdf_buffer
