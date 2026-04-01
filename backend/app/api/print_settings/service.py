import json
from app.core.baseSchema import ResponseStatus
from app.api.print_settings.schema import (
    MdlPrintSettingsResponse,
    MdlPrintSettingsData,
    MdlColumnConfig,
)
from app.core.logger import getUserLogger


class ClsPrintSettingsService:
    def __init__(self, objPool, intUserId):
        self.objPool = objPool
        self.intUserId = intUserId
        self.logger = getUserLogger(intUserId)

    # ── helper: row → response data model ───────────────────────
    def _row_to_data(self, row) -> MdlPrintSettingsData:
        cols_raw = row["jsonb_columns"]
        if isinstance(cols_raw, str):
            cols_raw = json.loads(cols_raw)
        columns = [MdlColumnConfig(**c) for c in (cols_raw or [])]

        return MdlPrintSettingsData(
            intPkPrintModelSettingsId=row["pk_bint_print_model_settings_id"],
            intFkUserId=row["fk_bint_user_id"],
            vchModule=row["vchr_module"],
            vchPrimaryColor=row["vchr_primary_color"],
            vchAccentColor=row["vchr_accent_color"],
            vchHeaderTitle=row["vchr_header_title"],
            blnShowCompanyName=row["bln_show_company_name"],
            blnShowPhone=row["bln_show_phone"],
            blnShowEmail=row["bln_show_email"],
            blnShowAddress=row["bln_show_address"],
            vchLogoUrl=row["vchr_logo_url"],
            intLogoWidth=row["int_logo_width"],
            intLogoHeight=row["int_logo_height"],
            txtHeaderCustomHtml=row["txt_header_custom_html"],
            lstColumns=columns,
            blnShowSubtotal=row["bln_show_subtotal"],
            blnShowTax=row["bln_show_tax"],
            blnShowDiscount=row["bln_show_discount"],
            blnShowGrandTotal=row["bln_show_grand_total"],
            txtTermsText=row["txt_terms_text"],
            txtFooterNote=row["txt_footer_note"],
            blnShowSignature=row["bln_show_signature"],
            vchSignatureUrl=row["vchr_signature_url"],
            intSignatureWidth=row["int_signature_width"],
            intSignatureHeight=row["int_signature_height"],
            blnQrEnabled=row["bln_qr_enabled"],
            vchQrLink=row["vchr_qr_link"],
            vchQrLabel=row["vchr_qr_label"],
            txtFooterCustomHtml=row["txt_footer_custom_html"],
        )

    # ── GET settings for current user + module ──────────────────
    async def fnGetPrintSettings(self, strModule: str = "QUOTATION") -> MdlPrintSettingsResponse:
        async with self.objPool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM tbl_print_model_settings WHERE fk_bint_user_id = $1 AND vchr_module = $2",
                self.intUserId, strModule.upper(),
            )

        if not row:
            return MdlPrintSettingsResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_OK,
                strMessage=f"No print settings found for {strModule}. Using defaults.",
                data=None,
            )

        return MdlPrintSettingsResponse(
            strMessage="Print settings loaded.",
            data=self._row_to_data(row),
        )

    # ── SAVE (upsert) settings for current user + module ────────
    async def fnSavePrintSettings(self, mdlReq) -> MdlPrintSettingsResponse:
        columns_json = json.dumps(
            [c.model_dump() for c in mdlReq.lstColumns]
        ) if mdlReq.lstColumns else None

        strModule = (mdlReq.vchModule or "QUOTATION").upper()

        async with self.objPool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO tbl_print_model_settings (
                    fk_bint_user_id, vchr_module,
                    vchr_primary_color, vchr_accent_color,
                    vchr_header_title,
                    bln_show_company_name, bln_show_phone, bln_show_email, bln_show_address,
                    vchr_logo_url, int_logo_width, int_logo_height,
                    txt_header_custom_html,
                    jsonb_columns,
                    bln_show_subtotal, bln_show_tax, bln_show_discount, bln_show_grand_total,
                    txt_terms_text, txt_footer_note,
                    bln_show_signature, vchr_signature_url,
                    int_signature_width, int_signature_height,
                    bln_qr_enabled, vchr_qr_link, vchr_qr_label,
                    txt_footer_custom_html
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
                )
                ON CONFLICT (fk_bint_user_id, vchr_module) DO UPDATE SET
                    vchr_primary_color   = EXCLUDED.vchr_primary_color,
                    vchr_accent_color    = EXCLUDED.vchr_accent_color,
                    vchr_header_title    = EXCLUDED.vchr_header_title,
                    bln_show_company_name = EXCLUDED.bln_show_company_name,
                    bln_show_phone       = EXCLUDED.bln_show_phone,
                    bln_show_email       = EXCLUDED.bln_show_email,
                    bln_show_address     = EXCLUDED.bln_show_address,
                    vchr_logo_url        = EXCLUDED.vchr_logo_url,
                    int_logo_width       = EXCLUDED.int_logo_width,
                    int_logo_height      = EXCLUDED.int_logo_height,
                    txt_header_custom_html = EXCLUDED.txt_header_custom_html,
                    jsonb_columns        = EXCLUDED.jsonb_columns,
                    bln_show_subtotal    = EXCLUDED.bln_show_subtotal,
                    bln_show_tax         = EXCLUDED.bln_show_tax,
                    bln_show_discount    = EXCLUDED.bln_show_discount,
                    bln_show_grand_total = EXCLUDED.bln_show_grand_total,
                    txt_terms_text       = EXCLUDED.txt_terms_text,
                    txt_footer_note      = EXCLUDED.txt_footer_note,
                    bln_show_signature   = EXCLUDED.bln_show_signature,
                    vchr_signature_url   = EXCLUDED.vchr_signature_url,
                    int_signature_width  = EXCLUDED.int_signature_width,
                    int_signature_height = EXCLUDED.int_signature_height,
                    bln_qr_enabled       = EXCLUDED.bln_qr_enabled,
                    vchr_qr_link         = EXCLUDED.vchr_qr_link,
                    vchr_qr_label        = EXCLUDED.vchr_qr_label,
                    txt_footer_custom_html = EXCLUDED.txt_footer_custom_html
                RETURNING *
                """,
                self.intUserId,
                strModule,
                mdlReq.vchPrimaryColor,
                mdlReq.vchAccentColor,
                mdlReq.vchHeaderTitle,
                mdlReq.blnShowCompanyName,
                mdlReq.blnShowPhone,
                mdlReq.blnShowEmail,
                mdlReq.blnShowAddress,
                mdlReq.vchLogoUrl,
                mdlReq.intLogoWidth,
                mdlReq.intLogoHeight,
                mdlReq.txtHeaderCustomHtml,
                columns_json,
                mdlReq.blnShowSubtotal,
                mdlReq.blnShowTax,
                mdlReq.blnShowDiscount,
                mdlReq.blnShowGrandTotal,
                mdlReq.txtTermsText,
                mdlReq.txtFooterNote,
                mdlReq.blnShowSignature,
                mdlReq.vchSignatureUrl,
                mdlReq.intSignatureWidth,
                mdlReq.intSignatureHeight,
                mdlReq.blnQrEnabled,
                mdlReq.vchQrLink,
                mdlReq.vchQrLabel,
                mdlReq.txtFooterCustomHtml,
            )

        self.logger.info(f"Print model settings saved/updated for module={strModule}")
        return MdlPrintSettingsResponse(
            strMessage="Print settings saved successfully.",
            data=self._row_to_data(row),
        )
