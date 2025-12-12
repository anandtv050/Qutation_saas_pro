-- =====================================================
-- Quotation SaaS Pro - Database Schema (PostgreSQL)
-- Version: 2.0 (With Clean Naming Convention)
-- Date: 2025-12-11
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
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
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    txt_description TEXT,
    tim_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    vchr_quotation_number VARCHAR(50) UNIQUE NOT NULL,
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

CREATE INDEX idx_quotation_number ON tbl_quotation(vchr_quotation_number);
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
    int_sort_order INTEGER DEFAULT 0,

    FOREIGN KEY (fk_bint_quotation_id) REFERENCES tbl_quotation(pk_bint_quotation_id) ON DELETE CASCADE,
    FOREIGN KEY (fk_bint_inventory_id) REFERENCES tbl_inventory(pk_bint_inventory_id) ON DELETE SET NULL
);

CREATE INDEX idx_quotation_item_quotation_id ON tbl_quotation_item(fk_bint_quotation_id);

-- =====================================================
-- Table 7: tbl_invoice
-- =====================================================
CREATE TABLE tbl_invoice (
    pk_bint_invoice_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id BIGINT NOT NULL,
    fk_bint_quotation_id BIGINT NULL,
    vchr_invoice_number VARCHAR(50) UNIQUE NOT NULL,
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

CREATE INDEX idx_invoice_number ON tbl_invoice(vchr_invoice_number);
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
-- End of Schema
-- =====================================================
