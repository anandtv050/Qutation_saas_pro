-- Migration: Add plan-specific module display names to plan module permissions

ALTER TABLE tbl_plan_module
    ADD COLUMN IF NOT EXISTS vchr_display_name VARCHAR(255);

UPDATE tbl_plan_module pm
SET vchr_display_name = (
    SELECT m.vchr_display_name
    FROM tbl_module m
    WHERE m.pk_bint_module_id = pm.fk_bint_module_id
)
WHERE vchr_display_name IS NULL;
