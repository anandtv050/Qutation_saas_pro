-- =====================================================
-- Quotation SaaS Pro - Database Schema (PostgreSQL)
-- Version: 2.0 (With Clean Naming Convention)
-- Date: 2025-12-11
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS tbl_user_settings CASCADE;
DROP TABLE IF EXISTS tbl_settings CASCADE;
DROP TABLE IF EXISTS tbl_module_usage CASCADE;
DROP TABLE IF EXISTS tbl_plan_module CASCADE;
DROP TABLE IF EXISTS tbl_user_module_permission CASCADE;
DROP TABLE IF EXISTS tbl_module CASCADE;
DROP TABLE IF EXISTS tbl_payment CASCADE;
DROP TABLE IF EXISTS tbl_subscription CASCADE;
DROP TABLE IF EXISTS tbl_subscription_plan CASCADE;
DROP TABLE IF EXISTS tbl_service CASCADE;
DROP TABLE IF EXISTS tbl_print_model_settings CASCADE;
DROP TABLE IF EXISTS tbl_document_counter CASCADE;
DROP TABLE IF EXISTS tbl_invoice_item CASCADE;
DROP TABLE IF EXISTS tbl_invoice CASCADE;
DROP TABLE IF EXISTS tbl_quotation_item CASCADE;
DROP TABLE IF EXISTS tbl_quotation CASCADE;
DROP TABLE IF EXISTS tbl_ai_response CASCADE;
DROP TABLE IF EXISTS tbl_raw_input CASCADE;
DROP TABLE IF EXISTS tbl_inventory CASCADE;
DROP TABLE IF EXISTS tbl_user CASCADE;

-- =====================================================
-- Table 1: tbl_user
-- =====================================================
CREATE TABLE tbl_user (
    pk_bint_user_id BIGSERIAL PRIMARY KEY,
    vchr_email VARCHAR(255) UNIQUE NOT NULL,
    vchr_username VARCHAR(100) NOT NULL,
    vchr_password_hash VARCHAR(255) NOT NULL,
    vchr_business_name VARCHAR(200),
    vchr_phone VARCHAR(20),
    txt_address TEXT,
    vchr_currency_code VARCHAR(10) DEFAULT 'INR',
    vchr_gst_number VARCHAR(50),
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bln_is_active BOOLEAN DEFAULT TRUE,
    bln_email_verified BOOLEAN DEFAULT FALSE,
    vchr_reset_token VARCHAR(255),
    tim_reset_token_expiry TIMESTAMP,
    fk_bint_service_id BIGINT,
    tim_last_heartbeat TIMESTAMP DEFAULT NULL,
    tim_last_login TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_email ON tbl_user(vchr_email);
CREATE INDEX idx_username ON tbl_user(vchr_username);

-- Trigger for auto-updating tim_updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tim_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_updated_at
BEFORE UPDATE ON tbl_user
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- Table 2: tbl_inventory
-- =====================================================
CREATE TABLE tbl_inventory (
    pk_bint_inventory_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL,
    vchr_item_code VARCHAR(50),
    vchr_item_name VARCHAR(200) NOT NULL,
    vchr_category VARCHAR(100),
    vchr_unit VARCHAR(20) DEFAULT 'piece',
    dbl_unit_price DECIMAL(12,2) NOT NULL,
    int_stock_qty INTEGER DEFAULT 0,
    int_warranty_years INTEGER DEFAULT 0 CHECK (int_warranty_years >= 0),
    int_warranty_months INTEGER DEFAULT 0 CHECK (int_warranty_months >= 0),
    int_warranty_days INTEGER DEFAULT 0 CHECK (int_warranty_days >= 0),
    txt_description TEXT,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT NULL,

    FOREIGN KEY (fk_bint_user_id) REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE
);

CREATE INDEX idx_inventory_user_id ON tbl_inventory(fk_bint_user_id);
CREATE INDEX idx_item_code ON tbl_inventory(vchr_item_code);
CREATE INDEX idx_item_name ON tbl_inventory(vchr_item_name);

CREATE TRIGGER trg_inventory_updated_at
BEFORE UPDATE ON tbl_inventory
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- Table 3: tbl_raw_input (Immutable - never edit)
-- =====================================================
CREATE TABLE tbl_raw_input (
    pk_bint_raw_input_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL,
    vchr_customer_name VARCHAR(200),
    vchr_customer_phone VARCHAR(20),
    txt_customer_address TEXT,
    txt_site_notes TEXT NOT NULL,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (fk_bint_user_id) REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE
);

CREATE INDEX idx_raw_input_user_id ON tbl_raw_input(fk_bint_user_id);
CREATE INDEX idx_raw_input_created_at ON tbl_raw_input(tim_created_at);

-- =====================================================
-- Table 4: tbl_ai_response (Immutable - never edit)
-- =====================================================
CREATE TABLE tbl_ai_response (
    pk_bint_ai_response_id BIGSERIAL PRIMARY KEY,
    fk_bint_raw_input_id BIGINT NOT NULL,
    fk_bint_user_id BIGINT NOT NULL,
    json_ai_response JSONB NOT NULL,
    vchr_prompt_version VARCHAR(50),
    vchr_model_used VARCHAR(50),
    int_tokens_input INTEGER DEFAULT 0,
    int_tokens_output INTEGER DEFAULT 0,
    dbl_cost_inr DECIMAL(10,6) DEFAULT 0.00,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (fk_bint_raw_input_id) REFERENCES tbl_raw_input(pk_bint_raw_input_id) ON DELETE CASCADE,
    FOREIGN KEY (fk_bint_user_id) REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_response_raw_input_id ON tbl_ai_response(fk_bint_raw_input_id);
CREATE INDEX idx_ai_response_user_id ON tbl_ai_response(fk_bint_user_id);
CREATE INDEX idx_ai_response_created_at ON tbl_ai_response(tim_created_at);

-- =====================================================
-- Table 5: tbl_quotation (Mutable - user can edit)
-- =====================================================
CREATE TABLE tbl_quotation (
    pk_bint_quotation_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL,
    fk_bint_ai_response_id BIGINT NULL,
    vchr_quotation_number VARCHAR(50) NOT NULL,
    dat_quotation_date DATE NOT NULL,
    vchr_customer_name VARCHAR(200) NOT NULL,
    vchr_customer_phone VARCHAR(20),
    txt_customer_address TEXT,
    dbl_subtotal DECIMAL(12,2) DEFAULT 0.00,
    dbl_tax_percent DECIMAL(5,2) DEFAULT 0.00,
    dbl_tax_amount DECIMAL(12,2) DEFAULT 0.00,
    dbl_discount_amount DECIMAL(12,2) DEFAULT 0.00,
    dbl_total_amount DECIMAL(12,2) DEFAULT 0.00,
    txt_notes TEXT,
    vchr_status VARCHAR(20) DEFAULT 'draft',
    dat_valid_until DATE,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (fk_bint_user_id) REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    FOREIGN KEY (fk_bint_ai_response_id) REFERENCES tbl_ai_response(pk_bint_ai_response_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_quotation_number ON tbl_quotation(fk_bint_user_id, vchr_quotation_number);
CREATE INDEX idx_quotation_status ON tbl_quotation(vchr_status);
CREATE INDEX idx_quotation_created_at ON tbl_quotation(tim_created_at);

CREATE TRIGGER trg_quotation_updated_at
BEFORE UPDATE ON tbl_quotation
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- Table 6: tbl_quotation_item
-- =====================================================
CREATE TABLE tbl_quotation_item (
    pk_bint_quotation_item_id BIGSERIAL PRIMARY KEY,
    fk_bint_quotation_id BIGINT NOT NULL,
    fk_bint_inventory_id BIGINT NULL,
    vchr_item_code VARCHAR(50),
    vchr_item_name VARCHAR(200) NOT NULL,
    vchr_unit VARCHAR(20),
    dbl_quantity DECIMAL(10,2) NOT NULL,
    dbl_unit_price DECIMAL(12,2) NOT NULL,
    dbl_total_price DECIMAL(12,2) NOT NULL,
    int_warranty_years INTEGER DEFAULT 0 CHECK (int_warranty_years >= 0),
    int_warranty_months INTEGER DEFAULT 0 CHECK (int_warranty_months >= 0),
    int_warranty_days INTEGER DEFAULT 0 CHECK (int_warranty_days >= 0),
    dat_implementation_date DATE,
    dat_expiry_date DATE,
    bln_manual_expiry_override BOOLEAN DEFAULT FALSE,
    int_sort_order INTEGER DEFAULT 0,

    FOREIGN KEY (fk_bint_quotation_id) REFERENCES tbl_quotation(pk_bint_quotation_id) ON DELETE CASCADE,
    FOREIGN KEY (fk_bint_inventory_id) REFERENCES tbl_inventory(pk_bint_inventory_id) ON DELETE SET NULL,
    CONSTRAINT chk_quotation_item_expiry_after_impl
        CHECK (
            dat_expiry_date IS NULL
            OR dat_implementation_date IS NULL
            OR dat_expiry_date >= dat_implementation_date
        )
);

CREATE INDEX idx_quotation_item_quotation_id ON tbl_quotation_item(fk_bint_quotation_id);

-- =====================================================
-- Table 7: tbl_invoice
-- =====================================================
CREATE TABLE tbl_invoice (
    pk_bint_invoice_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL,
    fk_bint_quotation_id BIGINT NULL,
    vchr_invoice_number VARCHAR(50) NOT NULL,
    dat_invoice_date DATE NOT NULL,
    vchr_customer_name VARCHAR(200) NOT NULL,
    vchr_customer_phone VARCHAR(20),
    txt_customer_address TEXT,
    dbl_subtotal DECIMAL(12,2) DEFAULT 0.00,
    dbl_tax_percent DECIMAL(5,2) DEFAULT 0.00,
    dbl_tax_amount DECIMAL(12,2) DEFAULT 0.00,
    dbl_discount_amount DECIMAL(12,2) DEFAULT 0.00,
    dbl_total_amount DECIMAL(12,2) DEFAULT 0.00,
    txt_notes TEXT,
    vchr_payment_status VARCHAR(20) DEFAULT 'pending',
    dat_due_date DATE,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (fk_bint_user_id) REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    FOREIGN KEY (fk_bint_quotation_id) REFERENCES tbl_quotation(pk_bint_quotation_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_invoice_number ON tbl_invoice(fk_bint_user_id, vchr_invoice_number);
CREATE INDEX idx_invoice_payment_status ON tbl_invoice(vchr_payment_status);
CREATE INDEX idx_invoice_created_at ON tbl_invoice(tim_created_at);

CREATE TRIGGER trg_invoice_updated_at
BEFORE UPDATE ON tbl_invoice
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- Table 8: tbl_invoice_item
-- =====================================================
CREATE TABLE tbl_invoice_item (
    pk_bint_invoice_item_id BIGSERIAL PRIMARY KEY,
    fk_bint_invoice_id BIGINT NOT NULL,
    fk_bint_inventory_id BIGINT NULL,
    vchr_item_code VARCHAR(50),
    vchr_item_name VARCHAR(200) NOT NULL,
    vchr_unit VARCHAR(20),
    dbl_quantity DECIMAL(10,2) NOT NULL,
    dbl_unit_price DECIMAL(12,2) NOT NULL,
    dbl_total_price DECIMAL(12,2) NOT NULL,
    int_sort_order INTEGER DEFAULT 0,

    FOREIGN KEY (fk_bint_invoice_id) REFERENCES tbl_invoice(pk_bint_invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (fk_bint_inventory_id) REFERENCES tbl_inventory(pk_bint_inventory_id) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_item_invoice_id ON tbl_invoice_item(fk_bint_invoice_id);


-- =====================================================
-- Table 9: tbl_document_counter (For Quotation & Invoice)
-- =====================================================

-- no need of primary key becaus  Because this table should be uniquely identified by:(user + document_type + year)
CREATE TABLE tbl_document_counter(
    fk_bint_user_id BIGINT NOT NULL,
    vchr_document_type VARCHAR(20) NOT NULL , -- INVOICE | QUOTATION
    int_year INTEGER NOT NULL,
    int_last_number INTEGER NOT NULL,

    PRIMARY KEY (fk_bint_user_id, vchr_document_type, int_year),

    FOREIGN KEY (fk_bint_user_id) REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE
);

-- =====================================================
-- Table 10: tbl_print_model_settings
-- =====================================================
CREATE TABLE tbl_print_model_settings (
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

CREATE TRIGGER trg_update_print_model_settings_timestamp
    BEFORE UPDATE ON tbl_print_model_settings
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_print_model_settings_timestamp();


-- =====================================================
-- NEW TABLES (Added for Subscription, Service, RBAC, Settings)
-- =====================================================


-- =====================================================
-- Table 11: tbl_service (Business types with AI prompts)
-- =====================================================
CREATE TABLE tbl_service (
    pk_bint_service_id BIGSERIAL PRIMARY KEY,
    vchr_service_name VARCHAR(100) NOT NULL UNIQUE,
    vchr_display_name VARCHAR(200) NOT NULL,
    txt_description TEXT,
    txt_ai_prompt TEXT,
    bln_ai_ready BOOLEAN DEFAULT FALSE,
    bln_active BOOLEAN DEFAULT TRUE,
    int_sort_order INTEGER DEFAULT 0,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_service_updated_at
BEFORE UPDATE ON tbl_service
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

INSERT INTO tbl_service (vchr_service_name, vchr_display_name, txt_description, bln_ai_ready, bln_active, int_sort_order)
VALUES
    ('cctv', 'CCTV & Security', 'CCTV installation, surveillance systems, security solutions', true, true, 1),
    ('electrical', 'Electrical Works', 'Electrical wiring, panel installation, power systems', false, true, 2),
    ('solar', 'Solar Energy', 'Solar panel installation, inverters, battery systems', false, true, 3),
    ('networking', 'Networking & IT', 'Network setup, server installation, IT infrastructure', false, true, 4),
    ('general', 'General Services', 'General trading, products, and services', false, true, 99);

-- Link user to service
ALTER TABLE tbl_user ADD CONSTRAINT fk_user_service FOREIGN KEY (fk_bint_service_id) REFERENCES tbl_service(pk_bint_service_id) ON DELETE SET NULL;


-- =====================================================
-- Table 12: tbl_subscription_plan
-- =====================================================
CREATE TABLE tbl_subscription_plan (
    pk_bint_plan_id BIGSERIAL PRIMARY KEY,
    vchr_plan_name VARCHAR(50) NOT NULL UNIQUE,
    vchr_display_name VARCHAR(100) NOT NULL,
    dbl_price_monthly DECIMAL(10,2) DEFAULT 0.00,
    dbl_price_yearly DECIMAL(10,2) DEFAULT 0.00,
    int_max_quotations_per_month INTEGER DEFAULT 10,
    int_max_users INTEGER DEFAULT 1,
    bln_ai_enabled BOOLEAN DEFAULT FALSE,
    int_ai_calls_per_day INTEGER DEFAULT -1,
    bln_active BOOLEAN DEFAULT TRUE,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tbl_subscription_plan (vchr_plan_name, vchr_display_name, dbl_price_monthly, dbl_price_yearly, int_max_quotations_per_month, int_max_users, bln_ai_enabled, int_ai_calls_per_day)
VALUES
    ('free_trial', 'Free', 0.00, 0.00, -1, 1, true, 1),
    ('standard', 'Standard', 1999.00, 19999.00, -1, 1, true, -1),
    ('premium', 'Premium', 3999.00, 39999.00, -1, 3, true, -1);


-- =====================================================
-- Table 13: tbl_subscription
-- =====================================================
CREATE TABLE tbl_subscription (
    pk_bint_subscription_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_plan_id BIGINT NOT NULL REFERENCES tbl_subscription_plan(pk_bint_plan_id),
    vchr_status VARCHAR(20) NOT NULL DEFAULT 'trial',
    dat_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dat_end_date DATE NOT NULL,
    vchr_razorpay_subscription_id VARCHAR(100),
    vchr_razorpay_customer_id VARCHAR(100),
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_user ON tbl_subscription(fk_bint_user_id);
CREATE INDEX idx_subscription_status ON tbl_subscription(vchr_status);

CREATE OR REPLACE FUNCTION fn_update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tim_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscription_updated_at
BEFORE UPDATE ON tbl_subscription
FOR EACH ROW EXECUTE FUNCTION fn_update_subscription_timestamp();


-- =====================================================
-- Table 14: tbl_payment
-- =====================================================
CREATE TABLE tbl_payment (
    pk_bint_payment_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_subscription_id BIGINT REFERENCES tbl_subscription(pk_bint_subscription_id),
    vchr_payment_method VARCHAR(20) DEFAULT 'razorpay',
    vchr_razorpay_payment_id VARCHAR(100),
    vchr_razorpay_order_id VARCHAR(100),
    vchr_razorpay_signature VARCHAR(255),
    vchr_manual_reference VARCHAR(200),
    txt_notes TEXT,
    dbl_amount DECIMAL(10,2) NOT NULL,
    vchr_currency VARCHAR(10) DEFAULT 'INR',
    vchr_status VARCHAR(20) DEFAULT 'pending',
    int_recorded_by BIGINT,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_user ON tbl_payment(fk_bint_user_id);


-- =====================================================
-- Table 15: tbl_module (RBAC module master)
-- =====================================================
CREATE TABLE tbl_module (
    pk_bint_module_id BIGSERIAL PRIMARY KEY,
    vchr_module_key VARCHAR(50) NOT NULL UNIQUE,
    vchr_display_name VARCHAR(100) NOT NULL,
    txt_description VARCHAR(255),
    vchr_icon VARCHAR(50),
    vchr_path VARCHAR(100) DEFAULT '',
    vchr_label VARCHAR(100) DEFAULT '',
    bln_show_in_sidebar BOOLEAN DEFAULT TRUE,
    bln_is_admin_only BOOLEAN DEFAULT FALSE,
    int_sort_order INTEGER DEFAULT 0,
    bln_active BOOLEAN DEFAULT TRUE
);

INSERT INTO tbl_module (vchr_module_key, vchr_display_name, txt_description, vchr_icon, vchr_path, vchr_label, bln_show_in_sidebar, bln_is_admin_only, int_sort_order)
VALUES
    ('dashboard',       'Dashboard',        'Main dashboard with stats',        'Home',       '/dashboard',       'Home',            true,  false, 1),
    ('quotation',       'Quotations',       'Create and manage quotations',     'FilePlus',   '/quotations/new',  'New Quote',       true,  false, 2),
    ('invoice',         'Invoices',         'Create and manage invoices',       'Receipt',    '/invoices/new',    'Invoices',        false, false, 3),
    ('inventory',       'Inventory',        'Manage product inventory',         'Package',    '/inventory',       'Inventory',       true,  false, 4),
    ('ai',              'Quick Create',     'AI-powered quotation generation',  'Brain',      '',                 'Quick Create',    false, false, 5),
    ('warranty',        'Warranty',         'Warranty certificate generation',  'Shield',     '/warranty',        'Warranty',        false, false, 6),
    ('reports',         'Reports',          'Financial reports and analytics',  'BarChart3',  '/reports',         'Reports',         true,  false, 7),
    ('print_settings',  'Print Settings',   'Custom print formats',            'Printer',    '/print-settings',  'Print Settings',  true,  true,  8);


-- =====================================================
-- Table 16: tbl_user_module_permission (RBAC per user)
-- =====================================================
CREATE TABLE tbl_user_module_permission (
    pk_bint_permission_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_module_id BIGINT NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,
    bln_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE (fk_bint_user_id, fk_bint_module_id)
);

CREATE INDEX idx_user_module_perm_user ON tbl_user_module_permission(fk_bint_user_id);


-- =====================================================
-- Table 17: tbl_plan_module (Plan-level module permissions)
-- One row per plan x module. Rules: 0=blocked, -1=unlimited, >0=limit
-- =====================================================
CREATE TABLE tbl_plan_module (
    pk_bint_id BIGSERIAL PRIMARY KEY,
    fk_bint_plan_id BIGINT NOT NULL REFERENCES tbl_subscription_plan(pk_bint_plan_id) ON DELETE CASCADE,
    fk_bint_module_id BIGINT NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,
    int_create INTEGER NOT NULL DEFAULT 0,
    int_read INTEGER NOT NULL DEFAULT -1,
    int_update INTEGER NOT NULL DEFAULT 0,
    int_delete INTEGER NOT NULL DEFAULT 0,
    int_print INTEGER NOT NULL DEFAULT 0,
    int_monthly_limit INTEGER NOT NULL DEFAULT -1,
    int_daily_limit INTEGER NOT NULL DEFAULT -1,
    vchr_display_name VARCHAR(255),
    UNIQUE(fk_bint_plan_id, fk_bint_module_id)
);

CREATE INDEX idx_plan_module_plan ON tbl_plan_module(fk_bint_plan_id);
CREATE INDEX idx_plan_module_module ON tbl_plan_module(fk_bint_module_id);

-- Seed plan_module permissions
DO $$
DECLARE
    v_free_id BIGINT;
    v_standard_id BIGINT;
    v_premium_id BIGINT;
    v_mod_dashboard BIGINT;
    v_mod_quotation BIGINT;
    v_mod_invoice BIGINT;
    v_mod_inventory BIGINT;
    v_mod_ai BIGINT;
    v_mod_warranty BIGINT;
    v_mod_reports BIGINT;
    v_mod_print BIGINT;
BEGIN
    SELECT pk_bint_plan_id INTO v_free_id FROM tbl_subscription_plan WHERE vchr_plan_name = 'free_trial';
    SELECT pk_bint_plan_id INTO v_standard_id FROM tbl_subscription_plan WHERE vchr_plan_name = 'standard';
    SELECT pk_bint_plan_id INTO v_premium_id FROM tbl_subscription_plan WHERE vchr_plan_name = 'premium';

    SELECT pk_bint_module_id INTO v_mod_dashboard FROM tbl_module WHERE vchr_module_key = 'dashboard';
    SELECT pk_bint_module_id INTO v_mod_quotation FROM tbl_module WHERE vchr_module_key = 'quotation';
    SELECT pk_bint_module_id INTO v_mod_invoice FROM tbl_module WHERE vchr_module_key = 'invoice';
    SELECT pk_bint_module_id INTO v_mod_inventory FROM tbl_module WHERE vchr_module_key = 'inventory';
    SELECT pk_bint_module_id INTO v_mod_ai FROM tbl_module WHERE vchr_module_key = 'ai';
    SELECT pk_bint_module_id INTO v_mod_warranty FROM tbl_module WHERE vchr_module_key = 'warranty';
    SELECT pk_bint_module_id INTO v_mod_reports FROM tbl_module WHERE vchr_module_key = 'reports';
    SELECT pk_bint_module_id INTO v_mod_print FROM tbl_module WHERE vchr_module_key = 'print_settings';

    -- FREE: Limited AI (5/day), unlimited manual quotation/invoice, no warranty/reports/print
    INSERT INTO tbl_plan_module (fk_bint_plan_id, fk_bint_module_id, int_create, int_read, int_update, int_delete, int_print, int_daily_limit, int_monthly_limit) VALUES
        (v_free_id, v_mod_dashboard,  0,  0,  0,  0,  0, -1, -1),
        (v_free_id, v_mod_quotation, -1, -1, -1, -1, -1, -1, -1),
        (v_free_id, v_mod_invoice,   -1, -1, -1, -1, -1, -1, -1),
        (v_free_id, v_mod_inventory, -1, -1, -1, -1,  0, -1, -1),
        (v_free_id, v_mod_ai,       -1, -1,  0,  0,  0,  1, -1),
        (v_free_id, v_mod_warranty,   0,  0,  0,  0,  0, -1, -1),
        (v_free_id, v_mod_reports,    0,  0,  0,  0,  0, -1, -1),
        (v_free_id, v_mod_print,      0,  0,  0,  0,  0, -1, -1);

    -- STANDARD: Unlimited everything, warranty, dashboard, limited print (3/month)
    INSERT INTO tbl_plan_module (fk_bint_plan_id, fk_bint_module_id, int_create, int_read, int_update, int_delete, int_print, int_daily_limit, int_monthly_limit) VALUES
        (v_standard_id, v_mod_dashboard, -1, -1,  0,  0,  0, -1, -1),
        (v_standard_id, v_mod_quotation, -1, -1, -1, -1, -1, -1, -1),
        (v_standard_id, v_mod_invoice,   -1, -1, -1, -1, -1, -1, -1),
        (v_standard_id, v_mod_inventory, -1, -1, -1, -1,  0, -1, -1),
        (v_standard_id, v_mod_ai,        -1, -1,  0,  0,  0, -1, -1),
        (v_standard_id, v_mod_warranty,  -1, -1, -1, -1, -1, -1, -1),
        (v_standard_id, v_mod_reports,   -1, -1,  0,  0,  0, -1, -1),
        (v_standard_id, v_mod_print,     -1, -1, -1,  0, -1, -1,  3);

    -- PREMIUM: Everything unlimited
    INSERT INTO tbl_plan_module (fk_bint_plan_id, fk_bint_module_id, int_create, int_read, int_update, int_delete, int_print, int_daily_limit, int_monthly_limit) VALUES
        (v_premium_id, v_mod_dashboard, -1, -1, -1, -1,  0, -1, -1),
        (v_premium_id, v_mod_quotation, -1, -1, -1, -1, -1, -1, -1),
        (v_premium_id, v_mod_invoice,   -1, -1, -1, -1, -1, -1, -1),
        (v_premium_id, v_mod_inventory, -1, -1, -1, -1,  0, -1, -1),
        (v_premium_id, v_mod_ai,        -1, -1,  0,  0,  0, -1, -1),
        (v_premium_id, v_mod_warranty,  -1, -1, -1, -1, -1, -1, -1),
        (v_premium_id, v_mod_reports,   -1, -1, -1, -1, -1, -1, -1),
        (v_premium_id, v_mod_print,     -1, -1, -1, -1, -1, -1, -1);
END $$;


-- =====================================================
-- Table 18: tbl_module_usage (Tracks usage per user per module)
-- =====================================================
CREATE TABLE tbl_module_usage (
    pk_bint_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_module_id BIGINT NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,
    vchr_operation VARCHAR(20) NOT NULL,
    int_count INTEGER NOT NULL DEFAULT 0,
    dat_period_start DATE NOT NULL,
    UNIQUE(fk_bint_user_id, fk_bint_module_id, vchr_operation, dat_period_start)
);

CREATE INDEX idx_module_usage_lookup ON tbl_module_usage(fk_bint_user_id, fk_bint_module_id, vchr_operation, dat_period_start);


-- =====================================================
-- Table 19: tbl_settings (Global defaults per module)
-- =====================================================
CREATE TABLE tbl_settings (
    pk_bint_setting_id BIGSERIAL PRIMARY KEY,
    vchr_module VARCHAR(50) NOT NULL DEFAULT 'global',
    vchr_key VARCHAR(100) NOT NULL,
    vchr_value TEXT,
    vchr_type VARCHAR(20) DEFAULT 'string',
    vchr_label VARCHAR(200),
    txt_description VARCHAR(500),
    int_sort_order INTEGER DEFAULT 0,
    UNIQUE (vchr_module, vchr_key)
);

INSERT INTO tbl_settings (vchr_module, vchr_key, vchr_value, vchr_type, vchr_label, txt_description, int_sort_order) VALUES
    ('quotation', 'default_validity_days', '30', 'number', 'Default Validity (days)', 'How many days a quotation is valid by default', 1),
    ('quotation', 'default_tax_percent', '18', 'number', 'Default Tax %', 'Default GST percentage applied to quotations', 2),
    ('quotation', 'show_warranty_column', 'true', 'boolean', 'Show Warranty Column', 'Show warranty info in quotation items', 3),
    ('invoice', 'default_due_days', '30', 'number', 'Default Due Days', 'Payment due days from invoice date', 1),
    ('invoice', 'default_payment_terms', 'Net 30', 'string', 'Default Payment Terms', 'Default payment terms text', 2),
    ('ai', 'temperature', '0.3', 'number', 'AI Temperature', 'Lower = more consistent, Higher = more creative (0.0-1.0)', 1),
    ('ai', 'max_tokens', '2000', 'number', 'Max Tokens', 'Maximum response length from AI', 2),
    ('inventory', 'default_unit', 'Nos', 'string', 'Default Unit', 'Default unit for new inventory items', 1),
    ('inventory', 'show_stock_qty', 'true', 'boolean', 'Show Stock Quantity', 'Track stock quantities in inventory', 2),
    ('global', 'company_name', 'Quotely', 'string', 'Company Name', 'Your company/brand name', 1),
    ('global', 'default_currency', 'INR', 'string', 'Default Currency', 'Default currency code', 2),
    ('global', 'date_format', 'DD/MM/YYYY', 'string', 'Date Format', 'Date display format', 3);


-- =====================================================
-- Table 20: tbl_user_settings (Per-user overrides)
-- =====================================================
CREATE TABLE tbl_user_settings (
    pk_bint_user_setting_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    vchr_key VARCHAR(100) NOT NULL,
    vchr_value TEXT,
    UNIQUE (fk_bint_user_id, vchr_key)
);

CREATE INDEX idx_user_settings_user ON tbl_user_settings(fk_bint_user_id);


-- =====================================================
-- End of Schema — 20 Tables
-- =====================================================
