from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    HRFlowable,
    Image,
)
from fastapi.responses import StreamingResponse
import io
import json
from pathlib import Path

# ── column registry: maps column key → DB field per module ──────
MODULE_COLUMN_REGISTRY = {
    "QUOTATION": {
        "item_code":  {"db_field": "vchr_item_code",  "label": "Item Code"},
        "item_name":  {"db_field": "vchr_item_name",  "label": "Item"},
        "unit":       {"db_field": "vchr_unit",        "label": "Unit"},
        "qty":        {"db_field": "dbl_quantity",     "label": "Qty"},
        "unit_price": {"db_field": "dbl_unit_price",   "label": "Unit Price"},
        "amount":     {"db_field": None,               "label": "Amount"},  # computed: qty × unit_price
    },
    "INVOICE": {
        "item_code":  {"db_field": "vchr_item_code",  "label": "Item Code"},
        "item_name":  {"db_field": "vchr_item_name",  "label": "Description"},
        "unit":       {"db_field": "vchr_unit",        "label": "Unit"},
        "qty":        {"db_field": "dbl_quantity",     "label": "Qty"},
        "unit_price": {"db_field": "dbl_unit_price",   "label": "Unit Price"},
        "amount":     {"db_field": None,               "label": "Amount"},
    },
    "WARRANTY": {
        "item_name":           {"db_field": "vchr_item_name",         "label": "Item"},
        "qty":                 {"db_field": "dbl_quantity",            "label": "Qty"},
        "warranty_period":     {"db_field": None,                      "label": "Warranty Period"},  # computed
        "implementation_date": {"db_field": "dat_implementation_date", "label": "Impl. Date"},
        "expiry_date":         {"db_field": "dat_expiry_date",         "label": "Expiry"},
    },
}

# ── default colour palette (fallback when no user settings) ─────
DEF_BRAND_DARK   = "#1B2A4A"
DEF_BRAND_ACCENT = "#2563EB"

LIGHT_BG     = colors.HexColor("#F8FAFC")
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
        # Dynamic colours — set from user print settings (loaded lazily)
        self._print_settings = None
        self._column_config = []
        self.BRAND_DARK   = colors.HexColor(DEF_BRAND_DARK)
        self.BRAND_ACCENT = colors.HexColor(DEF_BRAND_ACCENT)
        self.TABLE_HEADER = colors.HexColor("#1E3A5F")

    def _setting(self, key, default=None):
        if not self._print_settings:
            return default
        return self._print_settings.get(key, default)

    def _setting_bool(self, key, default=True):
        return bool(self._setting(key, default))

    def _asset_path_or_url(self, raw_path):
        """Resolve DB asset value to local absolute path (if possible) or URL."""
        if not raw_path:
            return None
        p = str(raw_path).strip()
        if not p:
            return None
        if p.startswith("http://") or p.startswith("https://"):
            # If API URL points to /uploads/*, resolve to local backend/uploads/*.
            try:
                parsed = urlparse(p)
                if parsed.path and "/uploads/" in parsed.path:
                    rel = parsed.path.split("/uploads/", 1)[1].replace("\\", "/")
                    base_dir = Path(__file__).resolve().parents[3]
                    rel_parts = [seg for seg in rel.split("/") if seg]
                    return str((base_dir / "uploads").joinpath(*rel_parts).resolve())
            except Exception:
                pass
            return p
        # Typical DB value: uploads/logos/file.png
        base_dir = Path(__file__).resolve().parents[3]
        norm = p.lstrip("/\\").replace("\\", "/")
        rel_parts = [seg for seg in norm.split("/") if seg]
        return str(base_dir.joinpath(*rel_parts).resolve())

    def _footer_terms_lines(self):
        txt = self._setting("txt_terms_text", "")
        return [ln.strip() for ln in str(txt or "").splitlines() if ln.strip()]

    def _clean_text(self, val):
        txt = str(val or "").strip()
        return txt

    def _build_footer_box(self, elements):
        """Render txt_footer_custom_html as a filled color box with white text."""
        footer_extra = self._clean_text(self._setting("txt_footer_custom_html"))
        if not footer_extra:
            return
        stBoxText = ParagraphStyle(
            "footerBoxText", fontName="Helvetica", fontSize=8,
            leading=11, textColor=colors.white, alignment=TA_LEFT,
        )
        lines = [Paragraph(ln.strip(), stBoxText)
                 for ln in footer_extra.splitlines() if ln.strip()]
        if not lines:
            return
        elements.append(Spacer(1, 12))
        box_tbl = Table([[lines]], colWidths=[510])
        box_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), self.BRAND_DARK),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(box_tbl)

    def _build_preview_style_header(
        self,
        *,
        styles,
        business_name,
        phone,
        email,
        doc_title,
        doc_number,
        doc_date,
    ):
        """Build top header block closer to Print Model Settings preview."""
        elements = []
        # Accent top line like preview
        elements.append(HRFlowable(
            width="100%", thickness=4, color=self.BRAND_ACCENT,
            spaceBefore=0, spaceAfter=10,
        ))

        stBiz = ParagraphStyle(
            "pmBiz", parent=styles["Normal"],
            fontSize=15, fontName="Helvetica-Bold", textColor=self.BRAND_DARK, leading=18,
        )
        stMini = ParagraphStyle(
            "pmMini", parent=styles["Normal"],
            fontSize=8.5, fontName="Helvetica", textColor=TEXT_DARK, leading=11,
        )
        # Fit title to right column width to avoid overlap with date/number.
        title_text = str(doc_title or "QUOTATION").strip()
        right_col_w = 230
        usable_title_w = right_col_w - 6
        title_size = 22
        while title_size > 12 and stringWidth(title_text, "Helvetica-Bold", title_size) > usable_title_w:
            title_size -= 1
        stTitle = ParagraphStyle(
            "pmTitle", parent=styles["Normal"],
            fontSize=title_size, leading=title_size + 2,
            fontName="Helvetica-Bold", textColor=self.BRAND_DARK, alignment=TA_RIGHT,
            spaceAfter=2,
        )
        stMetaR = ParagraphStyle(
            "pmMetaR", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica", textColor=TEXT_MUTED, alignment=TA_RIGHT, leading=10.5,
        )
        left_parts = []
        logo_path = self._asset_path_or_url(self._setting("vchr_logo_url"))
        if logo_path:
            try:
                lw = float(self._setting("int_logo_width", 150) or 150)
                lh = float(self._setting("int_logo_height", 150) or 150)
                # Use DB-configured size directly (with only safety clamps).
                draw_w = max(20, min(lw, 260))
                draw_h = max(20, min(lh, 140))
                left_parts.append(Image(logo_path, width=draw_w, height=draw_h))
                left_parts.append(Spacer(1, 4))
            except Exception:
                pass
        biz_txt = self._clean_text(business_name)
        if self._setting_bool("bln_show_company_name", True) and biz_txt:
            left_parts.append(Paragraph(biz_txt.upper(), stBiz))

        contacts = []
        if self._setting_bool("bln_show_phone", True) and phone:
            contacts.append(str(phone))
        if self._setting_bool("bln_show_email", True) and email:
            contacts.append(str(email))
        if contacts:
            left_parts.append(Paragraph("   |   ".join(contacts), stMini))

        header_extra = self._clean_text(self._setting("txt_header_custom_html"))
        if header_extra:
            for ln in header_extra.splitlines():
                ln = ln.strip()
                if ln:
                    left_parts.append(Paragraph(ln, stMini))

        right_parts = [
            Paragraph(title_text, stTitle),
            Paragraph(str(doc_date or "-"), stMetaR),
            Paragraph(f"No: {doc_number or '-'}", stMetaR),
        ]

        header_tbl = Table([[left_parts, right_parts]], colWidths=[280, right_col_w])
        header_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(header_tbl)
        elements.append(Spacer(1, 8))
        return elements

    async def _load_print_settings(self, strModule="QUOTATION"):
        """Fetch user print-model settings for the given module and set colours."""
        strModule = (strModule or "QUOTATION").upper()
        if self._print_settings is not None and self._print_settings.get("__module") == strModule:
            return
        async with self.objPool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT vchr_primary_color, vchr_accent_color, vchr_header_title, "
                "bln_show_company_name, bln_show_phone, bln_show_email, bln_show_address, "
                "vchr_logo_url, int_logo_width, int_logo_height, txt_header_custom_html, "
                "bln_show_subtotal, bln_show_tax, bln_show_discount, bln_show_grand_total, "
                "bln_show_signature, vchr_signature_url, int_signature_width, int_signature_height, "
                "txt_terms_text, txt_footer_note, txt_footer_custom_html, "
                "bln_qr_enabled, vchr_qr_link, vchr_qr_label, "
                "jsonb_columns "
                "FROM tbl_print_model_settings WHERE fk_bint_user_id = $1 AND vchr_module = $2",
                self.intUserId, strModule,
            )
        if row:
            self._print_settings = dict(row)
            self._print_settings["__module"] = strModule
            # Parse column config
            cols_raw = row["jsonb_columns"]
            if isinstance(cols_raw, str):
                cols_raw = json.loads(cols_raw)
            self._column_config = cols_raw or []
            try:
                self.BRAND_DARK   = colors.HexColor(row["vchr_primary_color"] or DEF_BRAND_DARK)
                self.BRAND_ACCENT = colors.HexColor(row["vchr_accent_color"] or DEF_BRAND_ACCENT)
                self.TABLE_HEADER = self.BRAND_DARK
            except Exception:
                pass
        else:
            self._print_settings = {"__module": strModule}
            self._column_config = []

    # ── dynamic column helpers ──────────────────────────────────
    def _build_dynamic_columns(self, strModule):
        """Return (col_keys, header_labels, col_widths_pts) from saved settings + registry."""
        registry = MODULE_COLUMN_REGISTRY.get(strModule, {})
        if self._column_config:
            visible = sorted(
                [c for c in self._column_config if c.get("visible", True)],
                key=lambda c: c.get("order", 0),
            )
        else:
            visible = [{"key": k, "widthPct": 100 // max(len(registry), 1)} for k in registry]

        total_w = 510  # A4 width minus margins in points
        col_keys, labels, widths = [], [], []
        for col in visible:
            key = col["key"]
            meta = registry.get(key)
            if not meta:
                continue
            col_keys.append(key)
            # Header label as Paragraph with same alignment as data cells
            if key in ("amount", "unit_price"):
                h_align = TA_RIGHT
            elif key in ("qty",):
                h_align = TA_CENTER
            else:
                h_align = TA_LEFT
            h_style = ParagraphStyle(
                f"hdr_{key}", fontName="Helvetica-Bold", fontSize=9,
                leading=11, textColor=colors.white, alignment=h_align,
            )
            labels.append(Paragraph(meta["label"], h_style))
            widths.append(total_w * col["widthPct"] / 100)
        # Safety: keep at least one visible column.
        if not col_keys and registry:
            first_key = next(iter(registry.keys()))
            col_keys = [first_key]
            h_style = ParagraphStyle(
                "hdr_fallback", fontName="Helvetica-Bold", fontSize=9,
                leading=11, textColor=colors.white, alignment=TA_LEFT,
            )
            labels = [Paragraph(registry[first_key]["label"], h_style)]
            widths = [total_w]
        return col_keys, labels, widths

    def _cell_style(self, key):
        """Return a ParagraphStyle for table cells — wraps long text."""
        if key in ("amount", "unit_price"):
            align = TA_RIGHT
        elif key in ("qty",):
            align = TA_CENTER
        else:
            align = TA_LEFT
        return ParagraphStyle(
            f"cell_{key}", fontName="Helvetica", fontSize=9,
            leading=11, textColor=TEXT_DARK, alignment=align,
        )

    def _extract_cell(self, strModule, key, item):
        """Extract + format a cell value for the given column key.
        Returns a Paragraph so long text wraps inside the column."""
        registry = MODULE_COLUMN_REGISTRY.get(strModule, {})
        meta = registry.get(key, {})
        db_field = meta.get("db_field")

        def _get(db_name, *fallbacks):
            """Try DB field name, then pydantic-style names, then fallbacks."""
            if db_name and db_name in item:
                return item[db_name]
            for fb in fallbacks:
                if fb in item:
                    return item[fb]
            return None

        # Computed columns
        if key == "amount":
            qty = float(_get("dbl_quantity", "dblQuantity", "qty") or 0)
            price = float(_get("dbl_unit_price", "dblUnitPrice", "price") or 0)
            text = f"{RUPEE} {qty * price:,.0f}"
        elif key == "warranty_period":
            y = int(_get("int_warranty_years", "intWarrantyYears") or 0)
            m = int(_get("int_warranty_months", "intWarrantyMonths") or 0)
            d = int(_get("int_warranty_days", "intWarrantyDays") or 0)
            text = "-" if y == 0 and m == 0 and d == 0 else f"{y}Y {m}M {d}D"
        elif key == "unit_price":
            val = float(_get("dbl_unit_price", "dblUnitPrice", "price") or 0)
            text = f"{RUPEE} {val:,.0f}"
        elif key == "qty":
            val = float(_get("dbl_quantity", "dblQuantity", "qty") or 0)
            text = f"{val:g}"
        elif key == "item_name":
            val = _get("vchr_item_name", "strItemName", "name")
            text = str(val or "-")
        elif key == "item_code":
            val = _get("vchr_item_code", "strItemCode", "code")
            text = str(val or "-")
        elif key == "unit":
            val = _get("vchr_unit", "strUnit", "unit")
            text = str(val or "-")
        else:
            # Generic: try db_field then key directly
            val = _get(db_field, key) if db_field else item.get(key, "")
            text = str(val or "-")

        return Paragraph(text, self._cell_style(key))

    # ── canvas: footer on every page ────────────────────────────
    def _draw_footer(self, canvas, doc):
        canvas.saveState()
        w, _ = A4

        # thin line
        canvas.setStrokeColor(BORDER_CLR)
        canvas.setLineWidth(0.5)
        canvas.line(40, 52, w - 40, 52)

        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawRightString(w - 40, 40, f"Page {doc.page}")

        canvas.restoreState()

    # ── main quotation builder ──────────────────────────────────
    async def fnGetQuotationPdf(self, mdlRequest):
        """Generate a clean, professional quotation PDF."""
        await self._load_print_settings("QUOTATION")

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
                    SELECT *
                    FROM tbl_quotation_item
                    WHERE fk_bint_quotation_id = $1
                    ORDER BY int_sort_order
                """
                rstItems = await conn.fetch(strItemsQuery, mdlRequest.intQuotationId)
                dctItems = [dict(r) for r in rstItems]

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
            topMargin=40,
            bottomMargin=70,  # room for canvas footer
        )

        styles = getSampleStyleSheet()
        elements = []
        doc_title = self._setting("vchr_header_title", "QUOTATION") or "QUOTATION"
        terms_lines = self._footer_terms_lines()
        elements.extend(self._build_preview_style_header(
            styles=styles,
            business_name=strBusinessName,
            phone=strShopPhoneNumber,
            email=strEmail,
            doc_title=doc_title,
            doc_number=strQuotationNumber,
            doc_date=strQuotationDate,
        ))

        # ── reusable styles ─────────────────────────────────────
        stSectionLabel = ParagraphStyle(
            "secLabel", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=self.BRAND_ACCENT, spaceAfter=3,
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
            textColor=self.BRAND_ACCENT, spaceAfter=3,
            alignment=TA_RIGHT,
        )
        stNameRight = ParagraphStyle(
            "secNameR", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
            alignment=TA_RIGHT,
        )

        # ── Bill To block (preview-style) ───────────────────────
        billto_lbl = ParagraphStyle(
            "qBillLbl", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            textColor=self.BRAND_DARK, spaceAfter=4,
        )
        billto_txt = ParagraphStyle(
            "qBillTxt", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, leading=12, spaceAfter=1,
        )
        elements.append(Paragraph("Bill To", billto_lbl))
        if strCustomerName:
            elements.append(Paragraph(str(strCustomerName), billto_txt))
        if self._setting_bool("bln_show_phone", True) and strCustomerPhone:
            elements.append(Paragraph(f"Phone: {strCustomerPhone}", billto_txt))
        if self._setting_bool("bln_show_address", True) and strCustomerAddress:
            elements.append(Paragraph(str(strCustomerAddress), billto_txt))
        elements.append(Spacer(1, 10))

        # ── divider ─────────────────────────────────────────────
        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=BORDER_CLR,
            spaceBefore=0, spaceAfter=14,
        ))

        # ── ITEMS TABLE (dynamic from print model settings) ─────
        col_keys, col_labels, col_widths = self._build_dynamic_columns("QUOTATION")

        tbl_data = [col_labels]
        grand_total = 0.0

        for item in dctItems:
            row = [self._extract_cell("QUOTATION", k, item) for k in col_keys]
            qty = float(item.get("dbl_quantity", 0))
            price = float(item.get("dbl_unit_price", 0))
            grand_total += qty * price
            tbl_data.append(row)

        num_items = len(dctItems)

        show_grand_total = self._setting_bool("bln_show_grand_total", True)

        tbl = Table(tbl_data, colWidths=col_widths, repeatRows=1)

        tbl_style_rules = [
            # header
            ("BACKGROUND",    (0, 0), (-1, 0), self.TABLE_HEADER),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("TOPPADDING",    (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),

            # data rows
            ("FONTNAME",      (0, 1), (-1, num_items), "Helvetica"),
            ("FONTSIZE",      (0, 1), (-1, num_items), 9),
            ("TOPPADDING",    (0, 1), (-1, num_items), 7),
            ("BOTTOMPADDING", (0, 1), (-1, num_items), 7),
            ("VALIGN",        (0, 1), (-1, -1), "MIDDLE"),

            # horizontal lines
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, self.TABLE_HEADER),
            ("LINEBELOW", (0, 1), (-1, num_items), 0.3, BORDER_CLR),

        ]
        if len(col_keys) >= 2:
            # right-align last 2 cols (price + amount)
            tbl_style_rules.append(("ALIGN", (-2, 0), (-1, -1), "RIGHT"))
        for i in range(1, num_items + 1):
            if i % 2 == 0:
                tbl_style_rules.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

        tbl.setStyle(TableStyle(tbl_style_rules))
        elements.append(tbl)
        elements.append(Spacer(1, 10))

        # right-side grand total box (preview-style)
        if show_grand_total:
            gt_style = ParagraphStyle(
                "qGt", parent=styles["Normal"],
                fontSize=10, fontName="Helvetica-Bold", textColor=self.BRAND_DARK, alignment=TA_RIGHT,
            )
            gt_label_style = ParagraphStyle(
                "qGtL", parent=styles["Normal"],
                fontSize=10, fontName="Helvetica-Bold", textColor=TEXT_DARK, alignment=TA_LEFT,
            )
            gt_box = Table([[
                Paragraph("Grand Total", gt_label_style),
                Paragraph(f"{RUPEE} {grand_total:,.2f}", gt_style),
            ]], colWidths=[120, 110])
            gt_box.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER_CLR),
                ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            gt_wrap = Table([["", gt_box]], colWidths=[280, 230])
            gt_wrap.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            elements.append(gt_wrap)
            elements.append(Spacer(1, 22))
        else:
            elements.append(Spacer(1, 22))

        # ── footer terms / note from DB settings ────────────────
        stTermsHead = ParagraphStyle(
            "qTermsHead", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=4,
        )
        stTermsItem = ParagraphStyle(
            "qTermsItem", parent=styles["Normal"],
            fontSize=8.5, fontName="Helvetica",
            textColor=TEXT_MUTED, spaceAfter=2, leading=11,
        )
        if terms_lines:
            elements.append(Paragraph("Terms & Conditions", stTermsHead))
            for ln in terms_lines:
                elements.append(Paragraph(f"• {ln}", stTermsItem))
            elements.append(Spacer(1, 6))

        footer_note = self._setting("txt_footer_note", "")
        if footer_note:
            elements.append(Paragraph(str(footer_note), stTermsItem))

        # signature block
        if self._setting_bool("bln_show_signature", False):
            sig = self._asset_path_or_url(self._setting("vchr_signature_url"))
            if sig:
                try:
                    sig_w = float(self._setting("int_signature_width", 180) or 180)
                    sig_h = float(self._setting("int_signature_height", 56) or 56)
                    elements.append(Spacer(1, 10))
                    elements.append(Paragraph("Authorized Signature", stTermsHead))
                    elements.append(Image(sig, width=min(sig_w, 220), height=min(sig_h, 90)))
                except Exception:
                    pass

        self._build_footer_box(elements)

        # ── 3. Build with header/footer on every page ───────────
        def on_page(cvs, doc_ref):
            self._draw_footer(cvs, doc_ref)

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
        await self._load_print_settings("INVOICE")

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
                    SELECT *
                    FROM tbl_invoice_item
                    WHERE fk_bint_invoice_id = $1
                    ORDER BY int_sort_order
                """
                rstItems = await conn.fetch(strItemsQuery, mdlRequest.intInvoiceId)
                dctItems = [dict(r) for r in rstItems]

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
            topMargin=40,
            bottomMargin=70,
        )

        styles = getSampleStyleSheet()
        elements = []
        doc_title = self._setting("vchr_header_title", "INVOICE") or "INVOICE"
        terms_lines = self._footer_terms_lines()
        elements.extend(self._build_preview_style_header(
            styles=styles,
            business_name=strBusinessName,
            phone=strShopPhoneNumber,
            email=strEmail,
            doc_title=doc_title,
            doc_number=strInvoiceNumber,
            doc_date=strInvoiceDate,
        ))

        # ── reusable styles ─────────────────────────────────────
        stSectionLabel = ParagraphStyle(
            "iSecLabel", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=self.BRAND_ACCENT, spaceAfter=3,
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
            textColor=self.BRAND_ACCENT, spaceAfter=3,
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
        if self._setting_bool("bln_show_company_name", True):
            biz_text = self._clean_text(strBusinessName)
            if biz_text:
                from_col.append(Paragraph(biz_text.upper(), stName))
        if self._setting_bool("bln_show_phone", True) and strShopPhoneNumber:
            from_col.append(Paragraph(f"Phone: {strShopPhoneNumber}", stDetail))
        if self._setting_bool("bln_show_email", True) and strEmail:
            from_col.append(Paragraph(f"Email: {strEmail}", stDetail))
        if strShopGstNumber:
            from_col.append(Paragraph(f"GST: {strShopGstNumber}", stDetail))

        to_col = []
        to_col.append(Paragraph("BILL TO", stLabelRight))
        to_col.append(Paragraph(strCustomerName or "-", stNameRight))
        if self._setting_bool("bln_show_phone", True) and strCustomerPhone:
            to_col.append(Paragraph(f"Phone: {strCustomerPhone}", stDetailRight))
        if self._setting_bool("bln_show_address", True) and strCustomerAddress:
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

        # ── ITEMS TABLE (dynamic from print model settings) ─────
        col_keys, col_labels, col_widths = self._build_dynamic_columns("INVOICE")

        tbl_data = [col_labels]
        subtotal = 0.0

        for item in dctItems:
            row = [self._extract_cell("INVOICE", k, item) for k in col_keys]
            qty = float(item.get("dbl_quantity", 0))
            price = float(item.get("dbl_unit_price", 0))
            subtotal += qty * price
            tbl_data.append(row)

        num_items = len(dctItems)

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
            textColor=self.BRAND_DARK, alignment=TA_RIGHT,
        )

        # helper to build a summary row with label+value in last 2 columns
        nc = len(col_keys)
        def _sum_row(label_para, val_para):
            if nc < 2:
                return [Paragraph(f"{label_para.getPlainText()}: {val_para.getPlainText()}", stSumVal)]
            r = [""] * nc
            r[-2] = label_para
            r[-1] = val_para
            return r

        show_subtotal = self._setting_bool("bln_show_subtotal", True)
        show_tax = self._setting_bool("bln_show_tax", True)
        show_discount = self._setting_bool("bln_show_discount", True)
        show_grand_total = self._setting_bool("bln_show_grand_total", True)

        # subtotal row
        if show_subtotal:
            tbl_data.append(_sum_row(
                Paragraph("Subtotal", stSumLabel),
                Paragraph(f"{RUPEE} {subtotal:,.2f}", stSumVal),
            ))

        # tax row (if any)
        if show_tax and (dblTaxPercent > 0 or dblTaxAmount > 0):
            tax_label = f"Tax ({dblTaxPercent:g}%)" if dblTaxPercent else "Tax"
            tax_val = dblTaxAmount if dblTaxAmount else subtotal * dblTaxPercent / 100
            tbl_data.append(_sum_row(
                Paragraph(tax_label, stSumLabel),
                Paragraph(f"{RUPEE} {tax_val:,.2f}", stSumVal),
            ))
        else:
            tax_val = 0.0

        # discount row (if any)
        if show_discount and dblDiscount > 0:
            tbl_data.append(_sum_row(
                Paragraph("Discount", stSumLabel),
                Paragraph(f"- {RUPEE} {dblDiscount:,.2f}", stSumVal),
            ))

        # grand total
        grand_total = subtotal + tax_val - dblDiscount
        if show_grand_total:
            tbl_data.append(_sum_row(
                Paragraph("<b>Total</b>", stTotalLabel),
                Paragraph(f"<b>{RUPEE} {grand_total:,.2f}</b>", stTotalVal),
            ))

        tbl = Table(tbl_data, colWidths=col_widths, repeatRows=1)

        summary_start = 1 + num_items
        summary_row_count = len(tbl_data) - (1 + num_items)

        tbl_style_rules = [
            # header
            ("BACKGROUND",    (0, 0), (-1, 0), self.TABLE_HEADER),
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

            # horizontal lines
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, self.TABLE_HEADER),
            ("LINEBELOW", (0, 1), (-1, num_items), 0.3, BORDER_CLR),

        ]
        if len(col_keys) >= 2:
            tbl_style_rules.append(("ALIGN", (-2, 0), (-1, -1), "RIGHT"))
        if summary_row_count > 0:
            tbl_style_rules.extend([
                ("TOPPADDING",    (0, summary_start), (-1, -1), 5),
                ("BOTTOMPADDING", (0, summary_start), (-1, -1), 5),
            ])
            if len(col_keys) >= 2:
                tbl_style_rules.append(("LINEABOVE", (-2, summary_start), (-1, summary_start), 0.5, BORDER_CLR))
        if show_grand_total:
            if len(col_keys) >= 2:
                tbl_style_rules.extend([
                    ("LINEABOVE",     (-2, -1), (-1, -1), 1.2, self.BRAND_DARK),
                    ("TOPPADDING",    (0, -1), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
                    ("BACKGROUND",    (0, -1), (-1, -1), LIGHT_BG),
                ])

        for i in range(1, num_items + 1):
            if i % 2 == 0:
                tbl_style_rules.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

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

        # ── footer terms / note from DB settings ────────────────
        stNote = ParagraphStyle(
            "iNote", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_MUTED, spaceAfter=3, leading=12,
        )
        if terms_lines:
            elements.append(Paragraph("Terms & Conditions", ParagraphStyle(
                "iTermsHead", parent=styles["Normal"],
                fontSize=8, fontName="Helvetica-Bold", textColor=TEXT_DARK, spaceAfter=4,
            )))
            for ln in terms_lines:
                elements.append(Paragraph(f"• {ln}", stNote))
            elements.append(Spacer(1, 6))

        footer_note = self._setting("txt_footer_note", "")
        if footer_note:
            elements.append(Paragraph(str(footer_note), stNote))

        if self._setting_bool("bln_show_signature", False):
            sig = self._asset_path_or_url(self._setting("vchr_signature_url"))
            if sig:
                try:
                    sig_w = float(self._setting("int_signature_width", 180) or 180)
                    sig_h = float(self._setting("int_signature_height", 56) or 56)
                    elements.append(Spacer(1, 10))
                    elements.append(Paragraph("Authorized Signature", ParagraphStyle(
                        "iSignLbl", parent=styles["Normal"],
                        fontSize=8, fontName="Helvetica-Bold", textColor=TEXT_DARK, spaceAfter=3,
                    )))
                    elements.append(Image(sig, width=min(sig_w, 220), height=min(sig_h, 90)))
                except Exception:
                    pass

        self._build_footer_box(elements)

        # ── 3. Build with header/footer ─────────────────────────
        def on_page(cvs, doc_ref):
            self._draw_footer(cvs, doc_ref)

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
        await self._load_print_settings("WARRANTY")
        strBusinessName = strEmail = strShopPhoneNumber = strShopGstNumber = ""
        doc_title = self._setting("vchr_header_title", "WARRANTY CERTIFICATE") or "WARRANTY CERTIFICATE"

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

            dctItems = [dict(row) for row in rstItems]

            # Get common implementation date (first item's date)
            strImplementationDate = None
            if dctItems:
                strImplementationDate = dctItems[0].get("dat_implementation_date")

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
            topMargin=40,
            bottomMargin=70,
        )

        styles = getSampleStyleSheet()
        elements = []
        elements.extend(self._build_preview_style_header(
            styles=styles,
            business_name=strBusinessName,
            phone=strShopPhoneNumber,
            email=strEmail,
            doc_title=doc_title,
            doc_number=(strInvoiceNumber or strQuotationNumber),
            doc_date=strImplementationDate,
        ))

        stSectionLabel = ParagraphStyle(
            "wSecLabel", parent=styles["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=self.BRAND_ACCENT, spaceAfter=3,
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
            textColor=self.BRAND_ACCENT, spaceAfter=3,
            alignment=TA_RIGHT,
        )
        stNameRight = ParagraphStyle(
            "wSecNameR", parent=styles["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=TEXT_DARK, spaceAfter=2,
            alignment=TA_RIGHT,
        )

        # ── Bill To block (same style as quotation) ──────────────
        billto_lbl = ParagraphStyle(
            "wBillLbl", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            textColor=self.BRAND_DARK, spaceAfter=4,
        )
        billto_txt = ParagraphStyle(
            "wBillTxt", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_DARK, leading=12, spaceAfter=1,
        )
        elements.append(Paragraph("Bill To", billto_lbl))
        if strCustomerName:
            elements.append(Paragraph(str(strCustomerName), billto_txt))
        if self._setting_bool("bln_show_phone", True) and strCustomerPhone:
            elements.append(Paragraph(f"Phone: {strCustomerPhone}", billto_txt))
        if self._setting_bool("bln_show_address", True) and strCustomerAddress:
            elements.append(Paragraph(str(strCustomerAddress), billto_txt))
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
                Paragraph("Installation Date", stMetaLabel),
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

        # ── ITEMS TABLE (dynamic from print model settings) ─────
        col_keys, col_labels, col_widths = self._build_dynamic_columns("WARRANTY")
        tbl_data = [col_labels]

        for item in dctItems:
            row = [self._extract_cell("WARRANTY", k, item) for k in col_keys]
            tbl_data.append(row)

        if len(tbl_data) == 1:
            tbl_data.append(["No items with warranty"] + [""] * (len(col_keys) - 1))

        num_items = len(tbl_data) - 1
        tbl = Table(tbl_data, colWidths=col_widths, repeatRows=1)
        tbl_style_rules = [
            ("BACKGROUND",    (0, 0), (-1, 0), self.TABLE_HEADER),
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
            ("LINEBELOW",     (0, 0), (-1, 0), 0.8, self.TABLE_HEADER),
            ("LINEBELOW",     (0, 1), (-1, -1), 0.3, BORDER_CLR),
        ]
        for i in range(1, num_items + 1):
            if i % 2 == 0:
                tbl_style_rules.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))

        tbl.setStyle(TableStyle(tbl_style_rules))
        elements.append(tbl)
        elements.append(Spacer(1, 20))

        stNote = ParagraphStyle(
            "wNote", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=TEXT_MUTED, spaceAfter=3, leading=12,
        )
        terms_lines = self._footer_terms_lines()
        if terms_lines:
            elements.append(Paragraph("Warranty Terms", ParagraphStyle(
                "wTermsHead", parent=styles["Normal"],
                fontSize=8, fontName="Helvetica-Bold", textColor=TEXT_DARK, spaceAfter=4,
            )))
            for ln in terms_lines:
                elements.append(Paragraph(f"• {ln}", stNote))
            elements.append(Spacer(1, 6))

        footer_note = self._setting("txt_footer_note", "")
        if footer_note:
            elements.append(Paragraph(str(footer_note), stNote))

        if self._setting_bool("bln_show_signature", False):
            sig = self._asset_path_or_url(self._setting("vchr_signature_url"))
            if sig:
                try:
                    sig_w = float(self._setting("int_signature_width", 180) or 180)
                    sig_h = float(self._setting("int_signature_height", 56) or 56)
                    elements.append(Spacer(1, 10))
                    elements.append(Paragraph("Authorized Signature", ParagraphStyle(
                        "wSignLbl", parent=styles["Normal"],
                        fontSize=8, fontName="Helvetica-Bold", textColor=TEXT_DARK, spaceAfter=3,
                    )))
                    elements.append(Image(sig, width=min(sig_w, 220), height=min(sig_h, 90)))
                except Exception:
                    pass

        self._build_footer_box(elements)

        def on_page(cvs, doc_ref):
            self._draw_footer(cvs, doc_ref)

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
