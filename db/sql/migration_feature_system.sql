-- =====================================================
-- Migration: Plan-Module Permission System
-- Run this on EXISTING database that already has base tables
-- For FRESH database, use schema.sql instead (has everything)
-- Rules: 0 = blocked, -1 = unlimited, > 0 = limit
-- =====================================================

-- =====================================================
-- Step 1: Add missing columns to existing tables
-- =====================================================

-- tbl_service (if not exists)
CREATE TABLE IF NOT EXISTS tbl_service (
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
    ('cctv', 'CCTV & Security', 'CCTV installation, surveillance systems, security solutions', false, true, 1),
    ('electrical', 'Electrical Works', 'Electrical wiring, panel installation, power systems', false, true, 2),
    ('solar', 'Solar Energy', 'Solar panel installation, inverters, battery systems', false, true, 3),
    ('networking', 'Networking & IT', 'Network setup, server installation, IT infrastructure', false, true, 4),
    ('general', 'General Services', 'General trading, products, and services', false, true, 99)
ON CONFLICT (vchr_service_name) DO NOTHING;

-- tbl_user: add missing columns
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS fk_bint_service_id BIGINT;
-- Add FK constraint (safe: DO NOTHING if exists)
DO $$ BEGIN
    ALTER TABLE tbl_user ADD CONSTRAINT fk_user_service FOREIGN KEY (fk_bint_service_id) REFERENCES tbl_service(pk_bint_service_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_last_heartbeat TIMESTAMP DEFAULT NULL;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_last_login TIMESTAMP DEFAULT NULL;

-- tbl_subscription_plan (if not exists)
CREATE TABLE IF NOT EXISTS tbl_subscription_plan (
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
    ('standard', 'Standard', 1999.00, 19999.00, -1, 1, true, -1)
ON CONFLICT (vchr_plan_name) DO NOTHING;

-- tbl_subscription (if not exists)
CREATE TABLE IF NOT EXISTS tbl_subscription (
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

CREATE INDEX IF NOT EXISTS idx_subscription_user ON tbl_subscription(fk_bint_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON tbl_subscription(vchr_status);

CREATE OR REPLACE FUNCTION fn_update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tim_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_subscription_updated_at
    BEFORE UPDATE ON tbl_subscription
    FOR EACH ROW EXECUTE FUNCTION fn_update_subscription_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tbl_payment (if not exists)
CREATE TABLE IF NOT EXISTS tbl_payment (
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

CREATE INDEX IF NOT EXISTS idx_payment_user ON tbl_payment(fk_bint_user_id);

-- tbl_module (if not exists — with all columns)
CREATE TABLE IF NOT EXISTS tbl_module (
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
    ('print_settings',  'Print Settings',   'Custom print formats',            'Printer',    '/print-settings',  'Print Settings',  true,  true,  8)
ON CONFLICT (vchr_module_key) DO NOTHING;

-- tbl_user_module_permission (if not exists)
CREATE TABLE IF NOT EXISTS tbl_user_module_permission (
    pk_bint_permission_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_module_id BIGINT NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,
    bln_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE (fk_bint_user_id, fk_bint_module_id)
);

CREATE INDEX IF NOT EXISTS idx_user_module_perm_user ON tbl_user_module_permission(fk_bint_user_id);

-- tbl_settings (if not exists)
CREATE TABLE IF NOT EXISTS tbl_settings (
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
    ('global', 'date_format', 'DD/MM/YYYY', 'string', 'Date Format', 'Date display format', 3)
ON CONFLICT (vchr_module, vchr_key) DO NOTHING;

-- tbl_user_settings (if not exists)
CREATE TABLE IF NOT EXISTS tbl_user_settings (
    pk_bint_user_setting_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    vchr_key VARCHAR(100) NOT NULL,
    vchr_value TEXT,
    UNIQUE (fk_bint_user_id, vchr_key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON tbl_user_settings(fk_bint_user_id);

-- tbl_user: email verification + password reset
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS bln_is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS bln_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_reset_token VARCHAR(255);
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_reset_token_expiry TIMESTAMP;

-- Update module paths and labels for sidebar
UPDATE tbl_module SET vchr_path = '/dashboard',      vchr_label = 'Home'           WHERE vchr_module_key = 'dashboard'      AND vchr_path = '';
UPDATE tbl_module SET vchr_path = '/quotations/new',  vchr_label = 'New Quote'      WHERE vchr_module_key = 'quotation'      AND vchr_path = '';
UPDATE tbl_module SET vchr_path = '/invoices/new',    vchr_label = 'Invoices',       bln_show_in_sidebar = false WHERE vchr_module_key = 'invoice' AND vchr_path = '';
UPDATE tbl_module SET vchr_path = '/inventory',       vchr_label = 'Inventory'      WHERE vchr_module_key = 'inventory'      AND vchr_path = '';
UPDATE tbl_module SET vchr_path = '',                 vchr_label = 'Quick Create',   bln_show_in_sidebar = false WHERE vchr_module_key = 'ai' AND vchr_label = '';
UPDATE tbl_module SET vchr_path = '/warranty',        vchr_label = 'Warranty',       bln_show_in_sidebar = false WHERE vchr_module_key = 'warranty' AND vchr_path = '';
UPDATE tbl_module SET vchr_path = '/reports',         vchr_label = 'Reports'        WHERE vchr_module_key = 'reports'        AND vchr_path = '';
UPDATE tbl_module SET vchr_path = '/print-settings',  vchr_label = 'Print Settings', bln_is_admin_only = true WHERE vchr_module_key = 'print_settings' AND vchr_path = '';

-- Fix multi-tenant uniqueness (quotation/invoice number unique per user, not global)
ALTER TABLE tbl_quotation DROP CONSTRAINT IF EXISTS tbl_quotation_vchr_quotation_number_key;
ALTER TABLE tbl_invoice DROP CONSTRAINT IF EXISTS tbl_invoice_vchr_invoice_number_key;
DROP INDEX IF EXISTS idx_quotation_number;
DROP INDEX IF EXISTS idx_invoice_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_number ON tbl_quotation(fk_bint_user_id, vchr_quotation_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number ON tbl_invoice(fk_bint_user_id, vchr_invoice_number);

-- =====================================================
-- Step 2: Create new tables
-- =====================================================

CREATE TABLE IF NOT EXISTS tbl_plan_module (
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
    UNIQUE(fk_bint_plan_id, fk_bint_module_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_module_plan ON tbl_plan_module(fk_bint_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_module_module ON tbl_plan_module(fk_bint_module_id);

CREATE TABLE IF NOT EXISTS tbl_module_usage (
    pk_bint_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_module_id BIGINT NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,
    vchr_operation VARCHAR(20) NOT NULL,
    int_count INTEGER NOT NULL DEFAULT 0,
    dat_period_start DATE NOT NULL,
    UNIQUE(fk_bint_user_id, fk_bint_module_id, vchr_operation, dat_period_start)
);

CREATE INDEX IF NOT EXISTS idx_module_usage_lookup ON tbl_module_usage(fk_bint_user_id, fk_bint_module_id, vchr_operation, dat_period_start);

-- =====================================================
-- Step 3: Insert premium plan (if not exists)
-- =====================================================
INSERT INTO tbl_subscription_plan (
    vchr_plan_name, vchr_display_name, dbl_price_monthly, dbl_price_yearly,
    int_max_quotations_per_month, int_max_users, bln_ai_enabled, int_ai_calls_per_day
) VALUES ('premium', 'Premium', 3999.00, 39999.00, -1, 3, true, -1)
ON CONFLICT (vchr_plan_name) DO NOTHING;

-- =====================================================
-- Step 4: Seed plan_module permissions
-- =====================================================
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

    -- Clear existing (safe to re-run)
    DELETE FROM tbl_plan_module WHERE fk_bint_plan_id IN (v_free_id, v_standard_id, v_premium_id);

    -- FREE: Limited AI (1/day), unlimited manual quotation/invoice, no warranty/reports/print
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
-- End of Migration
-- =====================================================
