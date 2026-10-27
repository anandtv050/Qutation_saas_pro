-- Migration (2026-10-27): Google sign-in, self-serve onboarding.
-- Everything changed in schema.sql since the last live deploy, in one file.
-- Safe to re-run.

-- 1. Google sign-in (account without a password)
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_google_sub VARCHAR(64);
ALTER TABLE tbl_user ALTER COLUMN vchr_password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_google_sub
    ON tbl_user(vchr_google_sub) WHERE vchr_google_sub IS NOT NULL;

-- 2. Onboarding state + attribution on the user (nullable / defaulted: existing users untouched)
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS bln_needs_onboarding BOOLEAN DEFAULT FALSE;  -- TRUE only for new Google signups until the wizard is finished or skipped
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_onboarded_at     TIMESTAMP DEFAULT NULL;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_signup_trade    VARCHAR(60) DEFAULT NULL; -- trade picked in the editor/wizard, e.g. 'cctv'
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS vchr_signup_source   VARCHAR(60) DEFAULT NULL; -- ?src= (header, hero, ...)
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_first_pdf_at     TIMESTAMP DEFAULT NULL;   -- first quotation PDF generated

-- 3. One seeded catalogue item per (user, code); only SMP-* codes, user-created items are never constrained
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_user_seed_code
    ON tbl_inventory(fk_bint_user_id, vchr_item_code)
    WHERE vchr_item_code LIKE 'SMP-%';
