-- =====================================================
-- Migration: Advance Receipt (advance/partial payment receipts
-- issued against a quotation, e.g. "Cash Receipt" paper form)
-- =====================================================

CREATE TABLE IF NOT EXISTS tbl_advance_receipt (
    pk_bint_advance_receipt_id BIGSERIAL PRIMARY KEY,
    fk_bint_user_id            BIGINT NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_quotation_id       BIGINT NOT NULL REFERENCES tbl_quotation(pk_bint_quotation_id) ON DELETE CASCADE,
    vchr_receipt_number        VARCHAR(50)  NOT NULL,
    dat_receipt_date           DATE         NOT NULL,
    vchr_received_from         VARCHAR(200) NOT NULL,
    dbl_amount_paid            DECIMAL(12,2) NOT NULL CHECK (dbl_amount_paid > 0),
    txt_payment_for            TEXT,
    vchr_payment_mode          VARCHAR(20)  DEFAULT 'cash',   -- cash|cheque|upi|account|other
    vchr_received_by           VARCHAR(200),
    dbl_amount_due_snapshot    DECIMAL(12,2),   -- balance BEFORE this receipt (frozen at issue time)
    dbl_balance_snapshot       DECIMAL(12,2),   -- balance AFTER this receipt (frozen at issue time)
    vchr_status                VARCHAR(20)  DEFAULT 'issued', -- issued|void
    tim_created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_advance_receipt_number ON tbl_advance_receipt(fk_bint_user_id, vchr_receipt_number);
CREATE INDEX IF NOT EXISTS idx_advance_receipt_quotation ON tbl_advance_receipt(fk_bint_quotation_id);

DROP TRIGGER IF EXISTS trg_advance_receipt_updated_at ON tbl_advance_receipt;
CREATE TRIGGER trg_advance_receipt_updated_at
BEFORE UPDATE ON tbl_advance_receipt
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- RBAC: register the module + grant it the same way "warranty" is granted per plan
DO $$
DECLARE
    v_free BIGINT; v_std BIGINT; v_prm BIGINT; v_arc BIGINT;
BEGIN
    INSERT INTO tbl_module
        (vchr_module_key, vchr_module_code, vchr_display_name, txt_description, vchr_icon, vchr_path, vchr_label, bln_show_in_sidebar, bln_is_admin_only, int_sort_order)
    VALUES
        ('advance_receipt', 'ARC', 'Advance Receipt', 'Advance/partial payment receipts against a quotation', 'Receipt', '/advance-receipts', 'Receipts', false, false, 9)
    ON CONFLICT (vchr_module_key) DO NOTHING;

    SELECT pk_bint_module_id INTO v_arc FROM tbl_module WHERE vchr_module_key = 'advance_receipt';
    SELECT pk_bint_plan_id INTO v_free FROM tbl_subscription_plan WHERE vchr_plan_name = 'free_trial';
    SELECT pk_bint_plan_id INTO v_std  FROM tbl_subscription_plan WHERE vchr_plan_name = 'standard';
    SELECT pk_bint_plan_id INTO v_prm  FROM tbl_subscription_plan WHERE vchr_plan_name = 'premium';

    IF v_arc IS NOT NULL THEN
        IF v_free IS NOT NULL THEN
            INSERT INTO tbl_plan_module VALUES (DEFAULT, v_free, v_arc, 0, 0, 0, 0, 0, NULL)
            ON CONFLICT (fk_bint_plan_id, fk_bint_module_id) DO NOTHING;
        END IF;
        IF v_std IS NOT NULL THEN
            INSERT INTO tbl_plan_module VALUES (DEFAULT, v_std, v_arc, -1, -1, -1, -1, -1, NULL)
            ON CONFLICT (fk_bint_plan_id, fk_bint_module_id) DO NOTHING;
        END IF;
        IF v_prm IS NOT NULL THEN
            INSERT INTO tbl_plan_module VALUES (DEFAULT, v_prm, v_arc, -1, -1, -1, -1, -1, NULL)
            ON CONFLICT (fk_bint_plan_id, fk_bint_module_id) DO NOTHING;
        END IF;
    END IF;
END $$;
