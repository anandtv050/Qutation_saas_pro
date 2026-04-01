-- Migration: Add print model settings table (full feature parity with print model UI)
-- Run this on your database
-- DROP TABLE IF EXISTS tbl_print_model_settings;  -- Uncomment if recreating

CREATE TABLE IF NOT EXISTS tbl_print_model_settings (
    pk_bint_print_model_settings_id  BIGSERIAL PRIMARY KEY,
    fk_bint_user_id                  BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    vchr_module                      VARCHAR(20) NOT NULL DEFAULT 'QUOTATION',  -- 'QUOTATION' | 'INVOICE' | 'WARRANTY'

    UNIQUE (fk_bint_user_id, vchr_module),

    -- ── Theme ──────────────────────────────────────────────────
    vchr_primary_color               VARCHAR(7)   DEFAULT '#1f2a67',
    vchr_accent_color                VARCHAR(7)   DEFAULT '#0ea5a4',

    -- ── Header ─────────────────────────────────────────────────
    vchr_header_title                VARCHAR(100) DEFAULT 'QUOTATION',
    bln_show_company_name            BOOLEAN      DEFAULT TRUE,
    bln_show_phone                   BOOLEAN      DEFAULT TRUE,
    bln_show_email                   BOOLEAN      DEFAULT TRUE,
    bln_show_address                 BOOLEAN      DEFAULT TRUE,
    vchr_logo_url                    VARCHAR(500) DEFAULT NULL,
    int_logo_width                   INTEGER      DEFAULT 160,
    int_logo_height                  INTEGER      DEFAULT 64,
    txt_header_custom_html           TEXT         DEFAULT NULL,

    -- ── Body / Columns (stored as JSONB array) ─────────────────
    jsonb_columns                    JSONB        DEFAULT '[
        {"key":"item_code","visible":true,"order":1,"widthPct":14},
        {"key":"item_name","visible":true,"order":2,"widthPct":34},
        {"key":"unit","visible":true,"order":3,"widthPct":10},
        {"key":"qty","visible":true,"order":4,"widthPct":10},
        {"key":"unit_price","visible":true,"order":5,"widthPct":16},
        {"key":"amount","visible":true,"order":6,"widthPct":16}
    ]',
    bln_show_subtotal                BOOLEAN      DEFAULT TRUE,
    bln_show_tax                     BOOLEAN      DEFAULT TRUE,
    bln_show_discount                BOOLEAN      DEFAULT TRUE,
    bln_show_grand_total             BOOLEAN      DEFAULT TRUE,

    -- ── Footer ─────────────────────────────────────────────────
    txt_terms_text                   TEXT         DEFAULT E'50% advance payment required\nWarranty: 1 year on all products\nInstallation within 5 working days',
    txt_footer_note                  TEXT         DEFAULT 'Thank you for your business.',
    bln_show_signature               BOOLEAN      DEFAULT TRUE,
    vchr_signature_url               VARCHAR(500) DEFAULT NULL,
    int_signature_width              INTEGER      DEFAULT 180,
    int_signature_height             INTEGER      DEFAULT 56,

    -- ── QR Code ────────────────────────────────────────────────
    bln_qr_enabled                   BOOLEAN      DEFAULT FALSE,
    vchr_qr_link                     VARCHAR(500) DEFAULT NULL,
    vchr_qr_label                    VARCHAR(100) DEFAULT 'Scan to Pay',
    txt_footer_custom_html           TEXT         DEFAULT NULL,

    -- ── Timestamps ─────────────────────────────────────────────
    tim_created_at                   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at                   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update tim_updated_at on row change
CREATE OR REPLACE FUNCTION fn_update_print_model_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tim_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_print_model_settings_timestamp ON tbl_print_model_settings;
CREATE TRIGGER trg_update_print_model_settings_timestamp
    BEFORE UPDATE ON tbl_print_model_settings
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_print_model_settings_timestamp();
