ALTER TABLE tbl_print_model_settings
    ADD COLUMN IF NOT EXISTS vchr_qr_image_path VARCHAR(500) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS txt_footer_side_html TEXT DEFAULT NULL;
