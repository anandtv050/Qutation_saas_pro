-- Migration: Simple warranty support (quotation-item based)
-- No separate warranty certificate tables.

-- 1) Inventory default warranty fields
ALTER TABLE tbl_inventory
    ADD COLUMN IF NOT EXISTS int_warranty_years INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS int_warranty_months INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS int_warranty_days INTEGER DEFAULT 0;

-- 2) Quotation item warranty + implementation tracking
ALTER TABLE tbl_quotation_item
    ADD COLUMN IF NOT EXISTS int_warranty_years INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS int_warranty_months INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS int_warranty_days INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dat_implementation_date DATE,
    ADD COLUMN IF NOT EXISTS dat_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS bln_manual_expiry_override BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_warranty_non_negative'
    ) THEN
        ALTER TABLE tbl_inventory
            ADD CONSTRAINT chk_inventory_warranty_non_negative
            CHECK (
                int_warranty_years >= 0
                AND int_warranty_months >= 0
                AND int_warranty_days >= 0
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_quotation_item_warranty_non_negative'
    ) THEN
        ALTER TABLE tbl_quotation_item
            ADD CONSTRAINT chk_quotation_item_warranty_non_negative
            CHECK (
                int_warranty_years >= 0
                AND int_warranty_months >= 0
                AND int_warranty_days >= 0
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_quotation_item_expiry_after_impl'
    ) THEN
        ALTER TABLE tbl_quotation_item
            ADD CONSTRAINT chk_quotation_item_expiry_after_impl
            CHECK (
                dat_expiry_date IS NULL
                OR dat_implementation_date IS NULL
                OR dat_expiry_date >= dat_implementation_date
            );
    END IF;
END $$;
