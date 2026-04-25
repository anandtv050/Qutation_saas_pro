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
    pk_bint_user_id             BIGSERIAL PRIMARY KEY,
    vchr_email                  VARCHAR(255) UNIQUE NOT NULL,
    vchr_username               VARCHAR(100) NOT NULL,
    vchr_password_hash          VARCHAR(255) NOT NULL,
    vchr_business_name          VARCHAR(200),
    vchr_phone                  VARCHAR(20),
    txt_address                 TEXT,
    vchr_currency_code          VARCHAR(10) DEFAULT 'INR',
    vchr_gst_number             VARCHAR(50),
    tim_created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    bln_is_active               BOOLEAN      DEFAULT TRUE,
    bln_email_verified          BOOLEAN      DEFAULT FALSE,
    vchr_reset_token            VARCHAR(255),
    tim_reset_token_expiry      TIMESTAMP,
    fk_bint_service_id          BIGINT,                                     -- Business service type (CCTV, Electrical, etc.)
    tim_last_heartbeat          TIMESTAMP    DEFAULT NULL,
    tim_last_login              TIMESTAMP    DEFAULT NULL,
    -- Plan assignment (replaces tbl_subscription; admin manages these)
    fk_bint_plan_id             BIGINT,                                     -- Current subscription plan (FK added after tbl_subscription_plan is created)
    vchr_plan_status            VARCHAR(20)  DEFAULT 'trial'
                                CHECK (vchr_plan_status IN ('trial','active','past_due','canceled','expired','paused')),
    dat_plan_start_date         DATE         DEFAULT CURRENT_DATE,          -- When this user first got a plan
    dat_plan_end_date           DATE,                                       -- When current plan expires / needs renewal
    bln_cancel_at_period_end    BOOLEAN      DEFAULT FALSE,                 -- Customer requested cancel but still has access
    dat_canceled_at             DATE,                                       -- When cancel was requested
    vchr_cancel_reason          TEXT,                                       -- Retention analytics
    vchr_razorpay_customer_id   VARCHAR(100)                                -- Future: Razorpay customer reference
);

CREATE INDEX idx_email ON tbl_user(vchr_email);
CREATE INDEX idx_username ON tbl_user(vchr_username);
CREATE INDEX idx_user_plan ON tbl_user(fk_bint_plan_id);
CREATE INDEX idx_user_plan_active ON tbl_user(fk_bint_plan_id, vchr_plan_status, dat_plan_end_date);

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

-- Auto-update tim_updated_at on row change (reuses generic update_timestamp())
CREATE TRIGGER trg_update_print_model_settings_timestamp
    BEFORE UPDATE ON tbl_print_model_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();


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
    pk_bint_plan_id           BIGSERIAL PRIMARY KEY,                          -- Plan ID (auto)
    vchr_plan_name            VARCHAR(50)    NOT NULL UNIQUE,                 -- Internal key: 'free_trial', 'standard', 'premium'
    vchr_display_name         VARCHAR(100)   NOT NULL,                        -- User-facing name: 'Free', 'Standard', 'Premium'
    txt_description           TEXT,                                           -- Short tagline shown on pricing page
    dbl_price_monthly         DECIMAL(10,2)  DEFAULT 0.00,                    -- Monthly price (0 for free)
    dbl_price_yearly          DECIMAL(10,2)  DEFAULT 0.00,                    -- Yearly price (usually discounted)
    vchr_currency             VARCHAR(10)    DEFAULT 'INR',                   -- Currency code (INR, USD, etc.)
    vchr_offer_label          VARCHAR(100),                                   -- Offer name: 'Early Bird Offer', 'Launch Special' (NULL = no offer)
    dbl_offer_price_monthly   DECIMAL(10,2),                                  -- Discounted monthly price when offer active
    dbl_offer_price_yearly    DECIMAL(10,2),                                  -- Discounted yearly price when offer active
    bln_offer_active          BOOLEAN        DEFAULT FALSE,                   -- Toggle offer display/charging on/off
    dat_offer_valid_until     DATE,                                           -- Offer expiry date (NULL = no expiry)
    int_trial_days            INTEGER        DEFAULT 0,                       -- Free trial length (7 for free_trial plan)
    int_grace_period_days     INTEGER        DEFAULT 0,                       -- Grace days after expiry before hard block
    jsonb_features_display    JSONB          DEFAULT '[]',                    -- Feature bullets for pricing page UI
    int_sort_order            INTEGER        DEFAULT 0,                       -- Display order on pricing page (1=first)
    bln_is_public             BOOLEAN        DEFAULT TRUE,                    -- Show on public pricing page (false = hidden/enterprise)
    bln_active                BOOLEAN        DEFAULT TRUE,                    -- Plan available for new signups
    tim_created_at            TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,       -- Plan creation time
    tim_updated_at            TIMESTAMP      DEFAULT CURRENT_TIMESTAMP        -- Last modified (auto via trigger)
);

CREATE TRIGGER trg_subscription_plan_updated
BEFORE UPDATE ON tbl_subscription_plan
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

INSERT INTO tbl_subscription_plan
    (vchr_plan_name, vchr_display_name, txt_description, dbl_price_monthly, dbl_price_yearly, vchr_offer_label, dbl_offer_price_monthly, dbl_offer_price_yearly, bln_offer_active, dat_offer_valid_until, int_trial_days, int_grace_period_days, int_sort_order, jsonb_features_display)
VALUES
    ('free_trial', 'Free',     'Get started free',       0.00,    0.00,     NULL,                NULL,    NULL,     FALSE, NULL,         7, 0, 1, '[{"label":"Unlimited Quotations","included":true},{"label":"Unlimited Invoices","included":true},{"label":"AI Quick Create","included":true,"note":"1/day"},{"label":"Warranty","included":false},{"label":"Reports","included":false},{"label":"Print Customization","included":false}]'),
    ('standard',   'Standard', 'For growing businesses', 1999.00, 19999.00, 'Early Bird Offer',  999.00,  9999.00,  TRUE,  '2026-06-30', 0, 3, 2, '[{"label":"Everything in Free","included":true},{"label":"Warranty Certificates","included":true},{"label":"Dashboard Analytics","included":true},{"label":"Reports (read-only)","included":true},{"label":"Print Customization","included":true,"note":"3/month"},{"label":"AI Quick Create","included":true,"note":"Unlimited"}]'),
    ('premium',    'Premium',  'Full power, no limits',  3999.00, 39999.00, 'Early Bird Offer',  1999.00, 19999.00, TRUE,  '2026-06-30', 0, 7, 3, '[{"label":"Everything in Standard","included":true},{"label":"Full Reports with Export","included":true},{"label":"Unlimited Print Templates","included":true},{"label":"Priority Support","included":true}]');


-- =====================================================
-- Link tbl_user.fk_bint_plan_id → tbl_subscription_plan (B2B: plan lives on user)
-- =====================================================
ALTER TABLE tbl_user ADD CONSTRAINT fk_user_plan
    FOREIGN KEY (fk_bint_plan_id) REFERENCES tbl_subscription_plan(pk_bint_plan_id) ON DELETE SET NULL;


-- =====================================================
-- Table 14: tbl_payment
-- =====================================================
CREATE TABLE tbl_payment (
    pk_bint_payment_id            BIGSERIAL PRIMARY KEY,                                           -- Payment ID (auto)
    fk_bint_user_id               BIGINT        NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,  -- Who paid
    vchr_payment_type             VARCHAR(20)   NOT NULL DEFAULT 'subscription'                   -- What the payment is for
                                  CHECK (vchr_payment_type IN ('subscription','upgrade','downgrade','one_time','refund')),
    dbl_amount                    DECIMAL(10,2) NOT NULL,                                          -- Amount paid
    vchr_currency                 VARCHAR(10)   DEFAULT 'INR',                                     -- Currency code
    vchr_status                   VARCHAR(20)   NOT NULL DEFAULT 'pending'                        -- Payment state
                                  CHECK (vchr_status IN ('pending','captured','failed','refunded')),
    vchr_payment_method           VARCHAR(20)   DEFAULT 'razorpay',                                -- How: razorpay, upi, bank_transfer, cash
    vchr_razorpay_payment_id      VARCHAR(100)  UNIQUE,                                            -- Razorpay payment ID (online)
    vchr_razorpay_order_id        VARCHAR(100)  UNIQUE,                                            -- Razorpay order ID (online)
    vchr_razorpay_signature       VARCHAR(255),                                                    -- Razorpay signature for verification
    jsonb_gateway_response        JSONB,                                                           -- Raw gateway response for debugging
    vchr_manual_reference         VARCHAR(200),                                                    -- UPI txn ID / bank ref (for manual payments)
    bln_is_refund                 BOOLEAN       DEFAULT FALSE,                                     -- TRUE if this row IS a refund entry
    fk_bint_refunded_payment_id   BIGINT        REFERENCES tbl_payment(pk_bint_payment_id),        -- Link back to original payment (if refund)
    dbl_amount_refunded           DECIMAL(10,2) DEFAULT 0.00,                                      -- How much refunded from this payment
    txt_failure_reason            TEXT,                                                            -- Why payment failed (from gateway)
    txt_notes                     TEXT,                                                            -- Admin notes on this payment
    tim_paid_at                   TIMESTAMP,                                                       -- When payment was captured (NULL if pending)
    tim_created_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,                         -- Payment row created
    tim_updated_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP                          -- Last modified (auto via trigger)
);

CREATE INDEX idx_payment_user   ON tbl_payment(fk_bint_user_id);
CREATE INDEX idx_payment_status ON tbl_payment(vchr_status);

CREATE TRIGGER trg_payment_updated
BEFORE UPDATE ON tbl_payment
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- =====================================================
-- Table 15: tbl_module (RBAC module master)
-- =====================================================
CREATE TABLE tbl_module (
    pk_bint_module_id         BIGSERIAL PRIMARY KEY,                          -- Module ID (auto)
    vchr_module_key           VARCHAR(50)    NOT NULL UNIQUE,                 -- Code key used in backend: 'quotation', 'ai', etc.
    vchr_module_code          VARCHAR(10)    NOT NULL UNIQUE,                 -- Short code: QTN, INV, AIC (for docs/reports)
    vchr_display_name         VARCHAR(100)   NOT NULL,                        -- Full name: 'Quotations', 'Quick Create'
    txt_description           VARCHAR(255),                                   -- What this module does (tooltip/help)
    vchr_icon                 VARCHAR(50),                                    -- Lucide icon name for UI
    vchr_path                 VARCHAR(100)   DEFAULT '',                      -- Frontend route path: '/quotations/new'
    vchr_label                VARCHAR(100)   DEFAULT '',                      -- Short sidebar label
    bln_show_in_sidebar       BOOLEAN        DEFAULT TRUE,                    -- Display in main nav sidebar
    bln_is_admin_only         BOOLEAN        DEFAULT FALSE,                   -- Only admin (user_id=1) can access
    int_sort_order            INTEGER        DEFAULT 0,                       -- Display order in sidebar
    bln_active                BOOLEAN        DEFAULT TRUE                     -- Module enabled globally
);

INSERT INTO tbl_module
    (vchr_module_key, vchr_module_code, vchr_display_name, txt_description, vchr_icon, vchr_path, vchr_label, bln_show_in_sidebar, bln_is_admin_only, int_sort_order)
VALUES
    ('dashboard',      'DSH', 'Dashboard',      'Main dashboard with stats',       'Home',      '/dashboard',      'Home',           true,  false, 1),
    ('quotation',      'QTN', 'Quotations',     'Create and manage quotations',    'FilePlus',  '/quotations/new', 'New Quote',      true,  false, 2),
    ('invoice',        'INV', 'Invoices',        'Create and manage invoices',      'Receipt',   '/invoices/new',   'Invoices',       false, false, 3),
    ('inventory',      'ITM', 'Inventory',       'Manage product inventory',        'Package',   '/inventory',      'Inventory',      true,  false, 4),
    ('ai',             'AIC', 'Quick Create',    'AI-powered quotation generation', 'Brain',     '',                'Quick Create',   false, false, 5),
    ('warranty',       'WRN', 'Warranty',        'Warranty certificate generation', 'Shield',    '/warranty',       'Warranty',       false, false, 6),
    ('reports',        'RPT', 'Reports',         'Financial reports and analytics', 'BarChart3', '/reports',         'Reports',        true,  false, 7),
    ('print_settings', 'PRT', 'Print Settings',  'Custom print formats',           'Printer',   '/print-settings', 'Print Settings', true,  true,  8);


-- =====================================================
-- Table 16: tbl_plan_module (Plan-level module permissions)
-- 0 = blocked | -1 = unlimited | >0 = limit per quota_period
-- =====================================================
CREATE TABLE tbl_plan_module (
    pk_bint_id                BIGSERIAL PRIMARY KEY,                          -- Row ID (auto)
    fk_bint_plan_id           BIGINT         NOT NULL REFERENCES tbl_subscription_plan(pk_bint_plan_id) ON DELETE CASCADE,  -- Which plan
    fk_bint_module_id         BIGINT         NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,           -- Which module
    int_create                INTEGER        NOT NULL DEFAULT 0,              -- Create permission: 0=blocked, -1=unlimited, >0=limit per period
    int_read                  INTEGER        NOT NULL DEFAULT 0,              -- Read permission (view/list)
    int_update                INTEGER        NOT NULL DEFAULT 0,              -- Update/edit permission
    int_delete                INTEGER        NOT NULL DEFAULT 0,              -- Delete permission
    int_print                 INTEGER        NOT NULL DEFAULT 0,              -- Print/export permission
    vchr_quota_period         VARCHAR(20)    DEFAULT NULL CHECK (vchr_quota_period IN ('daily','monthly','total')),  -- When numeric limits reset (NULL = no quota)
    UNIQUE(fk_bint_plan_id, fk_bint_module_id)
);

CREATE INDEX idx_plan_module_plan   ON tbl_plan_module(fk_bint_plan_id);
CREATE INDEX idx_plan_module_module ON tbl_plan_module(fk_bint_module_id);

-- Seed plan_module permissions
DO $$
DECLARE
    v_free BIGINT; v_std BIGINT; v_prm BIGINT;
    v_dsh BIGINT; v_qtn BIGINT; v_inv BIGINT; v_itm BIGINT;
    v_ai  BIGINT; v_wrn BIGINT; v_rpt BIGINT; v_prt BIGINT;
BEGIN
    SELECT pk_bint_plan_id INTO v_free FROM tbl_subscription_plan WHERE vchr_plan_name = 'free_trial';
    SELECT pk_bint_plan_id INTO v_std  FROM tbl_subscription_plan WHERE vchr_plan_name = 'standard';
    SELECT pk_bint_plan_id INTO v_prm  FROM tbl_subscription_plan WHERE vchr_plan_name = 'premium';
    SELECT pk_bint_module_id INTO v_dsh FROM tbl_module WHERE vchr_module_key = 'dashboard';
    SELECT pk_bint_module_id INTO v_qtn FROM tbl_module WHERE vchr_module_key = 'quotation';
    SELECT pk_bint_module_id INTO v_inv FROM tbl_module WHERE vchr_module_key = 'invoice';
    SELECT pk_bint_module_id INTO v_itm FROM tbl_module WHERE vchr_module_key = 'inventory';
    SELECT pk_bint_module_id INTO v_ai  FROM tbl_module WHERE vchr_module_key = 'ai';
    SELECT pk_bint_module_id INTO v_wrn FROM tbl_module WHERE vchr_module_key = 'warranty';
    SELECT pk_bint_module_id INTO v_rpt FROM tbl_module WHERE vchr_module_key = 'reports';
    SELECT pk_bint_module_id INTO v_prt FROM tbl_module WHERE vchr_module_key = 'print_settings';

    -- FREE:  create read update delete print  period
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_dsh,   0, -1,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_qtn,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_inv,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_itm,  -1, -1, -1, -1,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_ai,    1, -1,  0,  0,  0, 'daily');
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_wrn,   0,  0,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_rpt,   0,  0,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_prt,   0,  0,  0,  0,  0, NULL);

    -- STANDARD:
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_dsh,  -1, -1,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_qtn,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_inv,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_itm,  -1, -1, -1, -1,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_ai,   -1, -1,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_wrn,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_rpt,  -1, -1,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_prt,   3, -1, -1,  0, -1, 'monthly');

    -- PREMIUM:
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_dsh,  -1, -1, -1, -1,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_qtn,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_inv,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_itm,  -1, -1, -1, -1,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_ai,   -1, -1,  0,  0,  0, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_wrn,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_rpt,  -1, -1, -1, -1, -1, NULL);
    INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_prt,  -1, -1, -1, -1, -1, NULL);
END $$;


-- =====================================================
-- Table 17: tbl_user_module_override (Per-user permission override)
-- Overrides plan permissions for specific (user, module) pairs.
-- If a row exists here (not expired), it fully replaces the plan's permission.
-- If no row, fall back to tbl_plan_module.
-- =====================================================
CREATE TABLE tbl_user_module_override (
    pk_bint_id            BIGSERIAL PRIMARY KEY,                                                         -- Override ID (auto)
    fk_bint_user_id       BIGINT      NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,   -- User getting the override
    fk_bint_module_id     BIGINT      NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE, -- Which module
    int_create            INTEGER     NOT NULL DEFAULT 0,                                                -- 0=blocked, -1=unlimited, >0=limit
    int_read              INTEGER     NOT NULL DEFAULT 0,
    int_update            INTEGER     NOT NULL DEFAULT 0,
    int_delete            INTEGER     NOT NULL DEFAULT 0,
    int_print             INTEGER     NOT NULL DEFAULT 0,
    vchr_quota_period     VARCHAR(20) DEFAULT NULL CHECK (vchr_quota_period IN ('daily','monthly','total')),  -- Quota window
    dat_expires_at        DATE,                                                                           -- NULL = permanent; date = auto-expires
    txt_reason            TEXT,                                                                           -- Why admin created this (audit)
    fk_bint_created_by    BIGINT      REFERENCES tbl_user(pk_bint_user_id),                              -- Admin who created it
    tim_created_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fk_bint_user_id, fk_bint_module_id)                                                          -- One override per user per module
);

CREATE INDEX idx_override_user ON tbl_user_module_override(fk_bint_user_id);
-- Note: UNIQUE(fk_bint_user_id, fk_bint_module_id) already creates an index for fast lookups.
-- A partial index filtering by dat_expires_at cannot use CURRENT_DATE (not IMMUTABLE).

CREATE TRIGGER trg_user_module_override_updated
BEFORE UPDATE ON tbl_user_module_override
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- =====================================================
-- Table 18: tbl_module_usage (Event log per user per module)
-- =====================================================
CREATE TABLE tbl_module_usage (
    pk_bint_id                    BIGSERIAL PRIMARY KEY,                                          -- Event ID (auto)
    fk_bint_user_id               BIGINT      NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,  -- Who performed the action
    fk_bint_module_id             BIGINT      NOT NULL REFERENCES tbl_module(pk_bint_module_id),  -- Which module
    vchr_action                   VARCHAR(20) NOT NULL,                                           -- Action: 'create', 'read', 'update', 'delete', 'print'
    vchr_resource_type            VARCHAR(50),                                                    -- Type of thing acted on: 'quotation', 'invoice'
    vchr_resource_id              VARCHAR(100),                                                   -- ID of the specific resource (optional)
    int_quantity                  INTEGER     NOT NULL DEFAULT 1,                                 -- Count (for bulk ops); usually 1
    jsonb_metadata                JSONB,                                                          -- Extra context: IP, device, request details
    tim_occurred_at               TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP                  -- When the action happened (used for quota windows)
);

CREATE INDEX idx_usage_check ON tbl_module_usage(fk_bint_user_id, fk_bint_module_id, vchr_action, tim_occurred_at DESC);


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
-- DB Functions: Permission System (B2B — plan lives on tbl_user)
-- =====================================================

-- Check permission + quota for a user action
CREATE OR REPLACE FUNCTION fn_check_permission(
    p_user_id    BIGINT,
    p_module_key VARCHAR(50),
    p_action     VARCHAR(20)
) RETURNS TABLE (
    int_permission    INTEGER,
    vchr_quota_period VARCHAR(20),
    int_quota_used    INTEGER,
    bln_is_allowed    BOOLEAN
) AS $$
DECLARE
    v_plan_id  BIGINT;
    v_mod_id   BIGINT;
    v_perm     INTEGER;
    v_period   VARCHAR(20);
    v_used     INTEGER;
    v_pstart   TIMESTAMP;
BEGIN
    SELECT u.fk_bint_plan_id INTO v_plan_id
    FROM tbl_user u
    WHERE u.pk_bint_user_id = p_user_id
      AND u.vchr_plan_status IN ('active','trial')
      AND u.dat_plan_end_date >= CURRENT_DATE;

    IF v_plan_id IS NULL THEN
        RETURN QUERY SELECT 0, NULL::VARCHAR, 0, FALSE;
        RETURN;
    END IF;

    SELECT pk_bint_module_id INTO v_mod_id
    FROM tbl_module WHERE vchr_module_key = p_module_key AND bln_active = TRUE;

    IF v_mod_id IS NULL THEN
        RETURN QUERY SELECT 0, NULL::VARCHAR, 0, FALSE;
        RETURN;
    END IF;

    -- Check per-user override first (wins over plan if not expired)
    EXECUTE format('SELECT int_%s, vchr_quota_period FROM tbl_user_module_override
                    WHERE fk_bint_user_id = $1 AND fk_bint_module_id = $2
                      AND (dat_expires_at IS NULL OR dat_expires_at >= CURRENT_DATE)', p_action)
    INTO v_perm, v_period USING p_user_id, v_mod_id;

    -- If no override, fall back to plan_module
    IF v_perm IS NULL THEN
        EXECUTE format('SELECT int_%s, vchr_quota_period FROM tbl_plan_module WHERE fk_bint_plan_id = $1 AND fk_bint_module_id = $2', p_action)
        INTO v_perm, v_period USING v_plan_id, v_mod_id;
    END IF;

    IF v_perm IS NULL OR v_perm = 0 THEN
        RETURN QUERY SELECT 0, NULL::VARCHAR, 0, FALSE;
        RETURN;
    END IF;

    IF v_perm = -1 THEN
        RETURN QUERY SELECT -1, NULL::VARCHAR, 0, TRUE;
        RETURN;
    END IF;

    IF v_period = 'daily' THEN v_pstart := date_trunc('day', NOW());
    ELSIF v_period = 'monthly' THEN v_pstart := date_trunc('month', NOW());
    ELSE v_pstart := '2000-01-01'::TIMESTAMP;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_used
    FROM tbl_module_usage
    WHERE fk_bint_user_id = p_user_id
      AND fk_bint_module_id = v_mod_id
      AND vchr_action = p_action
      AND tim_occurred_at >= v_pstart;

    RETURN QUERY SELECT v_perm, v_period, v_used, (v_used < v_perm);
END;
$$ LANGUAGE plpgsql;


-- Record a usage event
CREATE OR REPLACE FUNCTION fn_record_usage(
    p_user_id       BIGINT,
    p_module_key    VARCHAR(50),
    p_action        VARCHAR(20),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id   VARCHAR(100) DEFAULT NULL,
    p_metadata      JSONB DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE v_mod_id BIGINT;
BEGIN
    SELECT pk_bint_module_id INTO v_mod_id
    FROM tbl_module WHERE vchr_module_key = p_module_key;

    INSERT INTO tbl_module_usage
        (fk_bint_user_id, fk_bint_module_id, vchr_action, vchr_resource_type, vchr_resource_id, jsonb_metadata)
    VALUES (p_user_id, v_mod_id, p_action, p_resource_type, p_resource_id, p_metadata);

    RETURN (SELECT COUNT(*)::INTEGER FROM tbl_module_usage
            WHERE fk_bint_user_id = p_user_id AND fk_bint_module_id = v_mod_id
              AND vchr_action = p_action AND tim_occurred_at >= date_trunc('day', NOW()));
END;
$$ LANGUAGE plpgsql;


-- Get all permissions for sidebar (call at login)
CREATE OR REPLACE FUNCTION fn_get_user_permissions(p_user_id BIGINT)
RETURNS TABLE(
    module_key      VARCHAR(50),
    module_code     VARCHAR(10),
    display_name    VARCHAR(100),
    icon            VARCHAR(50),
    path            VARCHAR(100),
    label           VARCHAR(100),
    show_in_sidebar BOOLEAN,
    is_admin_only   BOOLEAN,
    sort_order      INTEGER,
    perm_create     INTEGER,
    perm_read       INTEGER,
    perm_update     INTEGER,
    perm_delete     INTEGER,
    perm_print      INTEGER,
    quota_period    VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.vchr_module_key, m.vchr_module_code, m.vchr_display_name,
        m.vchr_icon, m.vchr_path, m.vchr_label,
        m.bln_show_in_sidebar, m.bln_is_admin_only, m.int_sort_order,
        COALESCE(o.int_create, pm.int_create) AS perm_create,
        COALESCE(o.int_read,   pm.int_read)   AS perm_read,
        COALESCE(o.int_update, pm.int_update) AS perm_update,
        COALESCE(o.int_delete, pm.int_delete) AS perm_delete,
        COALESCE(o.int_print,  pm.int_print)  AS perm_print,
        COALESCE(o.vchr_quota_period, pm.vchr_quota_period) AS quota_period
    FROM tbl_user u
    JOIN tbl_plan_module pm ON pm.fk_bint_plan_id = u.fk_bint_plan_id
    JOIN tbl_module m ON m.pk_bint_module_id = pm.fk_bint_module_id AND m.bln_active = TRUE
    LEFT JOIN tbl_user_module_override o
        ON o.fk_bint_user_id = p_user_id
       AND o.fk_bint_module_id = m.pk_bint_module_id
       AND (o.dat_expires_at IS NULL OR o.dat_expires_at >= CURRENT_DATE)
    WHERE u.pk_bint_user_id = p_user_id
      AND u.vchr_plan_status IN ('active','trial')
      AND u.dat_plan_end_date >= CURRENT_DATE
    ORDER BY m.int_sort_order;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- End of Schema — 19 Tables + 3 Functions (B2B: tbl_subscription dropped, plan lives on tbl_user)
-- =====================================================
