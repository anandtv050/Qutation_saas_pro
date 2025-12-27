from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from typing import List, Dict, Optional
import io
import os


class HDCQuotationPDF:
    """Generate professional quotations for HDC Security Solutionz"""

    def __init__(self):
        self.company_name = "HDC SECURITY SOLUTIONZ"
        self.location = "MOKERI"
        self.address = "NEAR BHARAT PETROLEUM"
        self.phone = "PH: 6235 15 3938"
        self.email = "hdc3078@gmail.com"
        self.phone_number = "6235153938"

        # Register Malayalam font if available
        self._register_malayalam_font()

    def _register_malayalam_font(self):
        """Register a Unicode font that supports Malayalam characters"""
        try:
            # Font paths in order of preference (local font first)
            font_paths = [
                "fonts/NotoSansMalayalam.ttf",  # Downloaded font in project
                os.path.join(os.path.dirname(__file__), "fonts", "NotoSansMalayalam.ttf"),
                "C:/Windows/Fonts/NotoSans-Regular.ttf",
                "C:/Windows/Fonts/NotoSansMalayalam-Regular.ttf",
                "C:/Windows/Fonts/seguiemj.ttf",  # Segoe UI Emoji (has some Unicode support)
                "C:/Windows/Fonts/ArialUni.ttf",
                "C:/Windows/Fonts/arial.ttf",
            ]

            font_registered = False
            for font_path in font_paths:
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont('MalayalamFont', font_path))
                        self.malayalam_font = 'MalayalamFont'
                        font_registered = True
                        print(f"[INFO] Registered Malayalam font: {font_path}")
                        break
                    except Exception as e:
                        print(f"[DEBUG] Failed to register {font_path}: {str(e)}")
                        continue

            if not font_registered:
                print("[WARNING] No Malayalam font found. Using Helvetica (Malayalam text will show as boxes)")
                self.malayalam_font = 'Helvetica'
        except Exception as e:
            print(f"[ERROR] Error registering font: {str(e)}")
            self.malayalam_font = 'Helvetica'

    def draw_header(self, canvas, doc):
        """Draw the professional black header with company branding"""
        canvas.saveState()
        
        # Black header background
        canvas.setFillColor(colors.black)
        canvas.rect(0, A4[1] - 1.3*inch, A4[0], 1.3*inch, fill=True, stroke=False)
        
        # HDC Logo (Left side)
        # Main HDC text with orange C
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 48)
        canvas.drawString(0.6*inch, A4[1] - 0.75*inch, "HD")
        
        # Orange "C" in logo
        canvas.setFillColor(colors.HexColor("#FF6B35"))  # Orange color
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
        
        # Footer text
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
        
        # Title style with red color
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
        
        # Bullet point style
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
        
        # Malayalam text style
        malayalam_style = ParagraphStyle(
            'Malayalam',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceAfter=8,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=40
        )
        
        # Add title with bullet point
        elements.append(Paragraph("• How is hdc cctv hub different from the others ?", title_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Information points
        info_points = [
            "1) First ai controlled self service office in kerala",
            "2) Fast and proper service",
            "3) 10 year + experienced technicians",
            "4) Mainly deals with banking sector (federalbank,sib amc)",
            "5) 24*7 customer support",
        ]
        
        for point in info_points:
            elements.append(Paragraph(point, bullet_style))
        
        # Point 6 with Malayalam text (special formatting) - RED COLOR
        point6_text = """<font color="red">6) hdc ചെയ്ത വർക്കിൽ എചെങ്കില ും COMPLAINT വന്നാൽ പകരും കയാമറ അചെങ്കിൽ dvr ചവച്ച്തന്നതിന്ശേഷും മാത്തും COMPLAINT ആയ Materials സർവീസിന ചകാണ്ട ശപാക കയ ള്ളൂ . ( company SERVICE late ആവ ന്ന ണ്ട്, അത ചകാണ്ടാണ്hdc ഈ സർവീസ്ചകാട ക്ക ന്നത്, ഈസർവീസ്മചറാര കമ്പനിയ ും നൽക ന്നിെ)</font>"""

        # Create special style for point 6 with Malayalam font support
        point6_style = ParagraphStyle(
            'Point6',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,  # Base color (overridden by font color tag)
            spaceAfter=12,
            alignment=TA_LEFT,
            fontName=self.malayalam_font,
            leftIndent=20
        )

        elements.append(Paragraph(point6_text, point6_style))
        
        # Remaining points
        remaining_points = [
            "7) deals with quality products",
            "8) more details please visit our Instagram hdc_cctv_hub",
            "9) 1 YEAR FREE SERVICE (ONLY FOR COMPLAINTS T&C APPLIED)"
        ]
        
        for point in remaining_points:
            if "T&C APPLIED" in point:
                # Special formatting for point 9
                text = point.replace("(ONLY FOR COMPLAINTS T&C APPLIED)", 
                                    '<font color="red">(ONLY FOR COMPLAINTS T&C APPLIED)</font>')
                elements.append(Paragraph(text, bullet_style))
            else:
                elements.append(Paragraph(point, bullet_style))
        
        return elements
        
    def generate_quotation(self, 
                          items: List[Dict],
                          customer_name: Optional[str] = None,
                          customer_location: Optional[str] = None,
                          quotation_date: Optional[str] = None,
                          reference_no: Optional[str] = None,
                          output_path: Optional[str] = None,
                          include_info_page: bool = True) -> io.BytesIO:
        """
        Generate PDF quotation with items - matching exact original format
        
        Args:
            items: List of dictionaries with keys: description, rate, quantity, amount
            customer_name: Optional customer name
            customer_location: Optional customer location
            quotation_date: Optional date string (defaults to today)
            reference_no: Optional reference number (defaults to generated)
            output_path: Optional file path to save PDF
            include_info_page: Whether to include the information page
        """
        
        # Create PDF buffer
        if output_path:
            pdf_buffer = output_path
        else:
            pdf_buffer = io.BytesIO()
            
        # Create document
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
        
        # Quotation page styles
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
        
        # Add ESTIMATE title
        elements.append(Paragraph("ESTIMATE", title_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Date and reference section
        date_str = quotation_date or datetime.now().strftime('%d/%m/%Y')
        ref_str = reference_no or datetime.now().strftime('%M%S')
        
        # Create date validity warning style
        red_warning_style = ParagraphStyle(
            'RedWarning',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.red,
            fontName='Helvetica',
            alignment=TA_LEFT
        )
        
        # Date and reference table - EXACT FORMAT from original
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
        if customer_name or customer_location:
            customer_style = ParagraphStyle(
                'CustomerInfo',
                parent=styles['Normal'],
                fontSize=11,
                fontName='Helvetica-Bold',
                spaceAfter=8
            )
            if customer_name:
                elements.append(Paragraph(f"Customer: {customer_name}", customer_style))
            if customer_location:
                elements.append(Paragraph(f"Location: {customer_location}", customer_style))
            elements.append(Spacer(1, 0.2*inch))
        
        # Create items table - EXACT FORMAT
        table_data = [['Sl', 'DESCRIPTION', 'RATE', 'QTY', 'AMOUNT']]

        # Create paragraph style for description column (enables word wrapping)
        desc_style = ParagraphStyle(
            'DescriptionStyle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            alignment=TA_LEFT,
            leading=12  # Line spacing
        )

        total = 0
        for idx, item in enumerate(items, 1):
            # Format amount calculation
            amount = float(item.get('amount', item['rate'] * item['quantity']))
            total += amount

            # Format numbers without unnecessary decimals
            rate_str = f"{int(item['rate'])}" if float(item['rate']) == int(item['rate']) else f"{float(item['rate'])}"
            amount_str = f"{int(amount)}" if amount == int(amount) else f"{amount}"

            # Wrap description in Paragraph for word wrapping
            desc_paragraph = Paragraph(item['description'], desc_style)

            table_data.append([
                str(idx),
                desc_paragraph,  # Use Paragraph instead of plain text
                rate_str,
                str(item['quantity']),
                amount_str
            ])
        
        # Add empty rows - IMPORTANT: Original shows empty rows between items and total
        min_rows = 10
        empty_rows_needed = max(0, min_rows - len(items))
        for _ in range(empty_rows_needed):
            table_data.append(['', '', '', '', ''])
        
        # Add spacing row before total
        table_data.append(['', '', '', '', ''])
        
        # Add total row - format as integer if no decimals
        total_str = f"{int(total)}" if total == int(total) else f"{total:.0f}"
        table_data.append(['', '', '', 'TOTAL', total_str])
        
        # Define column widths - MATCHING ORIGINAL PROPORTIONS
        col_widths = [0.5*inch, 3.5*inch, 1*inch, 0.8*inch, 1.2*inch]
        
        # Create table
        item_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Apply table styling - EXACT MATCH TO ORIGINAL
        table_style = TableStyle([
            # Grid for all cells
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.black),

            # Header row - LIGHT GREY BACKGROUND
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D0D0D0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),

            # Data rows alignment - EXACT AS ORIGINAL
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),     # Sl column - CENTER
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),       # Description - LEFT
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),     # Rate, Qty, Amount - RIGHT

            # Vertical alignment for all data rows (keeps content at top when wrapped)
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),

            # Data rows font
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),

            # Total row - NO BACKGROUND, just bold text
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (-2, -1), (-1, -1), 12),
            ('ALIGN', (-2, -1), (-2, -1), 'CENTER'),  # TOTAL text centered
            ('ALIGN', (-1, -1), (-1, -1), 'RIGHT'),   # Amount right aligned
        ])
        
        item_table.setStyle(table_style)
        elements.append(item_table)
        
        # Build PDF
        doc.build(elements, 
                 onFirstPage=self.draw_header_footer,
                 onLaterPages=self.draw_header_footer)
        
        if output_path:
            return output_path
        else:
            pdf_buffer.seek(0)
            return pdf_buffer


# Example usage and test function
def test_quotation():
    """Test function to generate a sample quotation"""
    
    # Sample items matching your PDF
    sample_items = [
        {
            'description': '3 mp color bullet Ip ai camera tplink\n( 2 YEAR WARRANTY)',
            'rate': 3990,
            'quantity': 6,
            'amount': 23940
        },
        {
            'description': 'Nvr 8channel tp link (2 YEAR WARRANTY )',
            'rate': 6000,
            'quantity': 1,
            'amount': 6000
        },
        {
            'description': 'Ai POE switch 10 PORT ( 1 year warranty)',
            'rate': 4500,
            'quantity': 1,
            'amount': 4500
        },
        {
            'description': 'WD PURPLE SURVAILLANCE 2 TB Hard disk ( 2 year warranty)',
            'rate': 7500,
            'quantity': 1,
            'amount': 7500
        },
        {
            'description': 'Nvr configuration charge',
            'rate': 1000,
            'quantity': 1,
            'amount': 1000
        },
        {
            'description': 'HDMI 4k',
            'rate': 650,
            'quantity': 1,
            'amount': 650
        },
        {
            'description': 'Co box HEAVY',
            'rate': 70,
            'quantity': 10,
            'amount': 700
        },
        {
            'description': 'Ip camera installation AND CONFIGURATION CHARGE',
            'rate': 1500,
            'quantity': 2,
            'amount': 3000
        },
        {
            'description': 'Patch code',
            'rate': 200,
            'quantity': 4,
            'amount': 800
        },
        {
            'description': 'JACK and boots',
            'rate': 25,
            'quantity': 20,
            'amount': 500
        },
        {
            'description': 'Pdu surge protector',
            'rate': 1500,
            'quantity': 1,
            'amount': 1500
        },
        {
            'description': 'Electrical materials',
            'rate': 1500,
            'quantity': 1,
            'amount': 1500
        },
        {
            'description': 'Wireless mouse',
            'rate': 500,
            'quantity': 1,
            'amount': 500
        },
        {
            'description': 'UTP CABLING CHARGE INCLUDING LABOUR AND MATERIALS (wite pipe)',
            'rate': 83,
            'quantity': 210,
            'amount': 17430
        }
    ]
    
    # Create PDF generator
    pdf_gen = HDCQuotationPDF()
    
    # Generate PDF with info page
    pdf_gen.generate_quotation(
        items=sample_items,
        customer_name="Sample Customer",
        customer_location="Calicut",
        quotation_date="5/11/2025",
        reference_no="6228",
        output_path="hdc_quotation_sample.pdf",
        include_info_page=True
    )
    
    print("✅ Sample quotation generated: hdc_quotation_sample.pdf")
    
    # Generate PDF without info page (quotation only)
    pdf_gen.generate_quotation(
        items=sample_items[:5],  # Use fewer items for this example
        quotation_date="22/11/2025",
        reference_no="1234",
        output_path="hdc_quotation_simple.pdf",
        include_info_page=False
    )
    
    print("✅ Simple quotation generated: hdc_quotation_simple.pdf")


# Helper function for easy use
def create_hdc_quotation(items, **kwargs):
    """
    Convenience function to create HDC quotation
    
    Args:
        items: List of item dictionaries
        **kwargs: Additional parameters (customer_name, customer_location, etc.)
    
    Returns:
        BytesIO object or file path
    """
    pdf_gen = HDCQuotationPDF()
    return pdf_gen.generate_quotation(items, **kwargs)


if __name__ == "__main__":
    # Run test when script is executed directly
    test_quotation()
    
    # Example of creating a custom quotation
    print("\n" + "="*50)
    print("HDC Security Solutionz - Quotation Generator")
    print("="*50)
    
    # You can customize this with your own items
    custom_items = [
        {
            'description': 'IP Camera 4MP Bullet',
            'rate': 4500,
            'quantity': 4,
            'amount': 18000
        },
        {
            'description': 'Installation Charges',
            'rate': 500,
            'quantity': 4,
            'amount': 2000
        }
    ]
    
    # Generate custom quotation
    result = create_hdc_quotation(
        items=custom_items,
        customer_name="Your Customer Name",
        customer_location="Location",
        output_path="custom_quotation.pdf",
        include_info_page=True
    )
    
    print(f"\n✅ Custom quotation generated successfully!")
    print("\nUsage Instructions:")
    print("-" * 40)
    print("1. Import the class: from hdc_quotation_generator import HDCQuotationPDF")
    print("2. Create instance: pdf_gen = HDCQuotationPDF()")
    print("3. Generate PDF: pdf_gen.generate_quotation(items, customer_name='Name', ...)")
    print("\nItem Dictionary Format:")
    print("{'description': 'Item name', 'rate': 1000, 'quantity': 2, 'amount': 2000}")