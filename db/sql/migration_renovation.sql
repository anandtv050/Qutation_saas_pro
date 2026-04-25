-- =====================================================
-- MIGRATION: Master → Current Schema
-- Brings a live DB (master branch shape) up to the new schema:
--   - B2B mode (drops tbl_subscription, plan lives on tbl_user)
--   - New permission model (override table, quota_period, event-log usage)
--   - Offer pricing on plans
--   - Payment table reshape (refunds, payment_type, paid_at)
--
-- Run once against a live DB. Idempotent (safe to re-run).
-- =====================================================

BEGIN;


-- =====================================================
-- 1. tbl_user — add plan ownership columns (B2B: plan lives on user)
-- =====================================================
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS fk_bint_plan_id             BIGINT;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_plan_status            VARCHAR(20) DEFAULT 'trial';
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS dat_plan_start_date         DATE        DEFAULT CURRENT_DATE;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS dat_plan_end_date           DATE;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS bln_cancel_at_period_end    BOOLEAN     DEFAULT FALSE;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS dat_canceled_at             DATE;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_cancel_reason          TEXT;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_razorpay_customer_id   VARCHAR(100);


-- =====================================================
-- 2. tbl_subscription_plan — add new columns, backfill, drop old columns
-- =====================================================
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS txt_description           TEXT;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS vchr_currency             VARCHAR(10)  DEFAULT 'INR';
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS int_trial_days            INTEGER      DEFAULT 0;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS int_grace_period_days     INTEGER      DEFAULT 0;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS jsonb_features_display    JSONB        DEFAULT '[]';
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS int_sort_order            INTEGER      DEFAULT 0;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS bln_is_public             BOOLEAN      DEFAULT TRUE;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS tim_updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS vchr_offer_label          VARCHAR(100);
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS dbl_offer_price_monthly   DECIMAL(10,2);
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS dbl_offer_price_yearly    DECIMAL(10,2);
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS bln_offer_active          BOOLEAN      DEFAULT FALSE;
ALTER TABLE tbl_subscription_plan ADD COLUMN IF NOT EXISTS dat_offer_valid_until     DATE;

-- Backfill metadata + Early Bird offer for the 3 seeded plans (only if values are NULL/default)
UPDATE tbl_subscription_plan SET
    txt_description        = COALESCE(txt_description, 'Get started free'),
    int_trial_days         = COALESCE(NULLIF(int_trial_days, 0), 7),
    int_grace_period_days  = COALESCE(NULLIF(int_grace_period_days, 0), 0),
    int_sort_order         = COALESCE(NULLIF(int_sort_order, 0), 1),
    jsonb_features_display = COALESCE(NULLIF(jsonb_features_display, '[]'::jsonb),
        '[{"label":"Unlimited Quotations","included":true},{"label":"Unlimited Invoices","included":true},{"label":"AI Quick Create","included":true,"note":"1/day"},{"label":"Warranty","included":false},{"label":"Reports","included":false},{"label":"Print Customization","included":false}]'::jsonb)
WHERE vchr_plan_name = 'free_trial';

UPDATE tbl_subscription_plan SET
    txt_description         = COALESCE(txt_description, 'For growing businesses'),
    int_grace_period_days   = COALESCE(NULLIF(int_grace_period_days, 0), 3),
    int_sort_order          = COALESCE(NULLIF(int_sort_order, 0), 2),
    jsonb_features_display  = COALESCE(NULLIF(jsonb_features_display, '[]'::jsonb),
        '[{"label":"Everything in Free","included":true},{"label":"Warranty Certificates","included":true},{"label":"Dashboard Analytics","included":true},{"label":"Reports (read-only)","included":true},{"label":"Print Customization","included":true,"note":"3/month"},{"label":"AI Quick Create","included":true,"note":"Unlimited"}]'::jsonb),
    vchr_offer_label        = COALESCE(vchr_offer_label, 'Early Bird Offer'),
    dbl_offer_price_monthly = COALESCE(dbl_offer_price_monthly, 999.00),
    dbl_offer_price_yearly  = COALESCE(dbl_offer_price_yearly, 9999.00),
    bln_offer_active        = TRUE,
    dat_offer_valid_until   = COALESCE(dat_offer_valid_until, '2026-06-30')
WHERE vchr_plan_name = 'standard';

UPDATE tbl_subscription_plan SET
    txt_description         = COALESCE(txt_description, 'Full power, no limits'),
    int_grace_period_days   = COALESCE(NULLIF(int_grace_period_days, 0), 7),
    int_sort_order          = COALESCE(NULLIF(int_sort_order, 0), 3),
    jsonb_features_display  = COALESCE(NULLIF(jsonb_features_display, '[]'::jsonb),
        '[{"label":"Everything in Standard","included":true},{"label":"Full Reports with Export","included":true},{"label":"Unlimited Print Templates","included":true},{"label":"Priority Support","included":true}]'::jsonb),
    vchr_offer_label        = COALESCE(vchr_offer_label, 'Early Bird Offer'),
    dbl_offer_price_monthly = COALESCE(dbl_offer_price_monthly, 1999.00),
    dbl_offer_price_yearly  = COALESCE(dbl_offer_price_yearly, 19999.00),
    bln_offer_active        = TRUE,
    dat_offer_valid_until   = COALESCE(dat_offer_valid_until, '2026-06-30')
WHERE vchr_plan_name = 'premium';

-- Drop legacy hardcoded-limit columns
ALTER TABLE tbl_subscription_plan DROP COLUMN IF EXISTS int_max_quotations_per_month;
ALTER TABLE tbl_subscription_plan DROP COLUMN IF EXISTS int_max_users;
ALTER TABLE tbl_subscription_plan DROP COLUMN IF EXISTS bln_ai_enabled;
ALTER TABLE tbl_subscription_plan DROP COLUMN IF EXISTS int_ai_calls_per_day;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_subscription_plan_updated ON tbl_subscription_plan;
CREATE TRIGGER trg_subscription_plan_updated
BEFORE UPDATE ON tbl_subscription_plan
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- =====================================================
-- 3. tbl_module — add vchr_module_code (short codes for docs/reports)
-- =====================================================
ALTER TABLE tbl_module ADD COLUMN IF NOT EXISTS vchr_module_code VARCHAR(10);

UPDATE tbl_module SET vchr_module_code = 'DSH' WHERE vchr_module_key = 'dashboard'      AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'QTN' WHERE vchr_module_key = 'quotation'      AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'INV' WHERE vchr_module_key = 'invoice'        AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'ITM' WHERE vchr_module_key = 'inventory'      AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'AIC' WHERE vchr_module_key = 'ai'             AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'WRN' WHERE vchr_module_key = 'warranty'       AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'RPT' WHERE vchr_module_key = 'reports'        AND vchr_module_code IS NULL;
UPDATE tbl_module SET vchr_module_code = 'PRT' WHERE vchr_module_key = 'print_settings' AND vchr_module_code IS NULL;

ALTER TABLE tbl_module ALTER COLUMN vchr_module_code SET NOT NULL;
DO $$ BEGIN
    ALTER TABLE tbl_module ADD CONSTRAINT uq_module_code UNIQUE (vchr_module_code);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;


-- =====================================================
-- 4. tbl_plan_module — replace daily/monthly limits with vchr_quota_period
-- =====================================================
ALTER TABLE tbl_plan_module ADD COLUMN IF NOT EXISTS vchr_quota_period VARCHAR(20);

DO $$ BEGIN
    ALTER TABLE tbl_plan_module ADD CONSTRAINT chk_quota_period
        CHECK (vchr_quota_period IN ('daily','monthly','total'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migrate existing limit columns into single vchr_quota_period (if they still exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tbl_plan_module' AND column_name='int_daily_limit') THEN
        UPDATE tbl_plan_module SET vchr_quota_period = 'daily', int_create = int_daily_limit
        WHERE int_daily_limit > 0;
        UPDATE tbl_plan_module SET vchr_quota_period = 'monthly', int_create = int_monthly_limit
        WHERE int_monthly_limit > 0
          AND (int_daily_limit IS NULL OR int_daily_limit <= 0)
          AND vchr_quota_period IS NULL;
    END IF;
END $$;

ALTER TABLE tbl_plan_module DROP COLUMN IF EXISTS int_daily_limit;
ALTER TABLE tbl_plan_module DROP COLUMN IF EXISTS int_monthly_limit;
ALTER TABLE tbl_plan_module DROP COLUMN IF EXISTS vchr_display_name;
ALTER TABLE tbl_plan_module ALTER COLUMN int_read SET DEFAULT 0;


-- =====================================================
-- 5. tbl_module_usage — aggregated counters → event log
-- =====================================================
DROP INDEX IF EXISTS idx_module_usage_lookup;

-- Drop the compound UNIQUE constraint (auto-generated name varies by Postgres)
DO $$
DECLARE v_conname TEXT;
BEGIN
    SELECT conname INTO v_conname
    FROM pg_constraint
    WHERE conrelid = 'tbl_module_usage'::regclass AND contype = 'u'
    LIMIT 1;
    IF v_conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE tbl_module_usage DROP CONSTRAINT %I', v_conname);
    END IF;
END $$;

-- Rename vchr_operation → vchr_action (only if old column still exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tbl_module_usage' AND column_name='vchr_operation')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='tbl_module_usage' AND column_name='vchr_action') THEN
        ALTER TABLE tbl_module_usage RENAME COLUMN vchr_operation TO vchr_action;
    END IF;
END $$;

ALTER TABLE tbl_module_usage ADD COLUMN IF NOT EXISTS vchr_resource_type  VARCHAR(50);
ALTER TABLE tbl_module_usage ADD COLUMN IF NOT EXISTS vchr_resource_id    VARCHAR(100);
ALTER TABLE tbl_module_usage ADD COLUMN IF NOT EXISTS int_quantity        INTEGER     NOT NULL DEFAULT 1;
ALTER TABLE tbl_module_usage ADD COLUMN IF NOT EXISTS jsonb_metadata      JSONB;
ALTER TABLE tbl_module_usage ADD COLUMN IF NOT EXISTS tim_occurred_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill timestamps from old period column (if still exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tbl_module_usage' AND column_name='dat_period_start') THEN
        UPDATE tbl_module_usage SET tim_occurred_at = dat_period_start::timestamp;
    END IF;
END $$;

ALTER TABLE tbl_module_usage DROP COLUMN IF EXISTS int_count;
ALTER TABLE tbl_module_usage DROP COLUMN IF EXISTS dat_period_start;

CREATE INDEX IF NOT EXISTS idx_usage_check
    ON tbl_module_usage(fk_bint_user_id, fk_bint_module_id, vchr_action, tim_occurred_at DESC);


-- =====================================================
-- 6. tbl_user_module_override — NEW table for per-user permission overrides
-- =====================================================
CREATE TABLE IF NOT EXISTS tbl_user_module_override (
    pk_bint_id            BIGSERIAL PRIMARY KEY,
    fk_bint_user_id       BIGINT      NOT NULL REFERENCES tbl_user(pk_bint_user_id) ON DELETE CASCADE,
    fk_bint_module_id     BIGINT      NOT NULL REFERENCES tbl_module(pk_bint_module_id) ON DELETE CASCADE,
    int_create            INTEGER     NOT NULL DEFAULT 0,
    int_read              INTEGER     NOT NULL DEFAULT 0,
    int_update            INTEGER     NOT NULL DEFAULT 0,
    int_delete            INTEGER     NOT NULL DEFAULT 0,
    int_print             INTEGER     NOT NULL DEFAULT 0,
    vchr_quota_period     VARCHAR(20) DEFAULT NULL CHECK (vchr_quota_period IN ('daily','monthly','total')),
    dat_expires_at        DATE,
    txt_reason            TEXT,
    fk_bint_created_by    BIGINT      REFERENCES tbl_user(pk_bint_user_id),
    tim_created_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    tim_updated_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fk_bint_user_id, fk_bint_module_id)
);

CREATE INDEX IF NOT EXISTS idx_override_user ON tbl_user_module_override(fk_bint_user_id);

DROP TRIGGER IF EXISTS trg_user_module_override_updated ON tbl_user_module_override;
CREATE TRIGGER trg_user_module_override_updated
BEFORE UPDATE ON tbl_user_module_override
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- =====================================================
-- 7. tbl_payment — add new columns, drop legacy, add constraints/triggers
-- =====================================================
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS vchr_payment_type           VARCHAR(20)   DEFAULT 'subscription';
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS jsonb_gateway_response      JSONB;
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS bln_is_refund               BOOLEAN       DEFAULT FALSE;
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS fk_bint_refunded_payment_id BIGINT        REFERENCES tbl_payment(pk_bint_payment_id);
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS dbl_amount_refunded         DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS txt_failure_reason          TEXT;
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS tim_paid_at                 TIMESTAMP;
ALTER TABLE tbl_payment ADD COLUMN IF NOT EXISTS tim_updated_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tbl_payment ALTER COLUMN vchr_payment_type SET NOT NULL;
ALTER TABLE tbl_payment ALTER COLUMN vchr_status       SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE tbl_payment ADD CONSTRAINT chk_payment_type
        CHECK (vchr_payment_type IN ('subscription','upgrade','downgrade','one_time','refund'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE tbl_payment ADD CONSTRAINT chk_payment_status
        CHECK (vchr_status IN ('pending','captured','failed','refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE tbl_payment ADD CONSTRAINT uq_razorpay_payment_id UNIQUE (vchr_razorpay_payment_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE tbl_payment ADD CONSTRAINT uq_razorpay_order_id UNIQUE (vchr_razorpay_order_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_payment_status ON tbl_payment(vchr_status);

DROP TRIGGER IF EXISTS trg_payment_updated ON tbl_payment;
CREATE TRIGGER trg_payment_updated
BEFORE UPDATE ON tbl_payment
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- =====================================================
-- 8. Migrate tbl_subscription rows → tbl_user plan columns, then DROP tbl_subscription
-- =====================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tbl_subscription') THEN
        UPDATE tbl_user u SET
            fk_bint_plan_id            = s.fk_bint_plan_id,
            vchr_plan_status           = s.vchr_status,
            dat_plan_start_date        = s.dat_start_date,
            dat_plan_end_date          = s.dat_end_date,
            vchr_razorpay_customer_id  = s.vchr_razorpay_customer_id
        FROM tbl_subscription s
        WHERE s.fk_bint_user_id = u.pk_bint_user_id
          AND s.pk_bint_subscription_id = (
              SELECT MAX(pk_bint_subscription_id) FROM tbl_subscription
              WHERE fk_bint_user_id = u.pk_bint_user_id
          );
    END IF;
END $$;

-- Drop legacy columns/indexes on tbl_payment that linked to tbl_subscription
ALTER TABLE tbl_payment DROP COLUMN IF EXISTS fk_bint_subscription_id;
ALTER TABLE tbl_payment DROP COLUMN IF EXISTS int_recorded_by;
DROP INDEX IF EXISTS idx_payment_sub;

-- Drop tbl_subscription and its trigger function
DROP TABLE IF EXISTS tbl_subscription CASCADE;
DROP FUNCTION IF EXISTS fn_update_subscription_timestamp() CASCADE;

-- Add FK + CHECK + indexes on tbl_user (now that tbl_subscription is gone)
DO $$ BEGIN
    ALTER TABLE tbl_user ADD CONSTRAINT fk_user_plan
        FOREIGN KEY (fk_bint_plan_id) REFERENCES tbl_subscription_plan(pk_bint_plan_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE tbl_user ADD CONSTRAINT chk_user_plan_status
        CHECK (vchr_plan_status IN ('trial','active','past_due','canceled','expired','paused'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_plan        ON tbl_user(fk_bint_plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_active ON tbl_user(fk_bint_plan_id, vchr_plan_status, dat_plan_end_date);


-- =====================================================
-- 9. Drop legacy tbl_user_module_permission (replaced by tbl_user_module_override)
-- =====================================================
DROP TABLE IF EXISTS tbl_user_module_permission CASCADE;


-- =====================================================
-- 10. DB Functions: fn_check_permission, fn_record_usage, fn_get_user_permissions
-- All read plan from tbl_user (B2B), check override first then fall back to plan_module.
-- =====================================================

-- Drop the deprecated cron-style expiry function (live date filter handles it now)
DROP FUNCTION IF EXISTS fn_expire_subscriptions() CASCADE;

-- Replace redundant print-settings timestamp trigger with the generic update_timestamp()
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='fn_update_print_model_settings_timestamp') THEN
        DROP TRIGGER IF EXISTS trg_update_print_model_settings_timestamp ON tbl_print_model_settings;
        DROP FUNCTION IF EXISTS fn_update_print_model_settings_timestamp() CASCADE;
        CREATE TRIGGER trg_update_print_model_settings_timestamp
            BEFORE UPDATE ON tbl_print_model_settings
            FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
END $$;

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

    -- Override wins if present and not expired
    EXECUTE format('SELECT int_%s, vchr_quota_period FROM tbl_user_module_override
                    WHERE fk_bint_user_id = $1 AND fk_bint_module_id = $2
                      AND (dat_expires_at IS NULL OR dat_expires_at >= CURRENT_DATE)', p_action)
    INTO v_perm, v_period USING p_user_id, v_mod_id;

    -- Else fall back to the plan
    IF v_perm IS NULL THEN
        EXECUTE format('SELECT int_%s, vchr_quota_period FROM tbl_plan_module
                        WHERE fk_bint_plan_id = $1 AND fk_bint_module_id = $2', p_action)
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


CREATE OR REPLACE FUNCTION fn_record_usage(
    p_user_id       BIGINT,
    p_module_key    VARCHAR(50),
    p_action        VARCHAR(20),
    p_resource_type VARCHAR(50)  DEFAULT NULL,
    p_resource_id   VARCHAR(100) DEFAULT NULL,
    p_metadata      JSONB        DEFAULT NULL
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


COMMIT;


-- =====================================================
-- POST-MIGRATION SANITY CHECKS (run manually if you want)
-- =====================================================
-- 1. Plan columns on tbl_user populated:
--    SELECT pk_bint_user_id, vchr_email, fk_bint_plan_id, vchr_plan_status, dat_plan_end_date FROM tbl_user;
--
-- 2. tbl_subscription gone:
--    \dt tbl_subscription   -- should error "Did not find any relation"
--
-- 3. Permission lookup works:
--    SELECT * FROM fn_check_permission(2, 'quotation', 'read');
--    SELECT * FROM fn_get_user_permissions(2);
--
-- 4. No legacy tables:
--    \dt tbl_user_module_permission  -- should not exist
--    \df fn_update_subscription_timestamp -- should not exist
--    \df fn_expire_subscriptions     -- should not exist
