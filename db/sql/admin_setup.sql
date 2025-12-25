-- =====================================================
-- Admin User Setup Script
-- Run this AFTER schema.sql to create the admin user
-- =====================================================
-- Admin Credentials:
--   Email: admin@quotely.com
--   Password: letsGo#B25
--   User ID: 1 (always admin)
-- =====================================================

-- Insert admin user (pk_bint_user_id = 1)
INSERT INTO tbl_user (
    vchr_email,
    vchr_username,
    vchr_password_hash,
    vchr_business_name,
    vchr_phone,
    txt_address,
    vchr_currency_code
) VALUES (
    'admin@quotely.com',
    'Admin',
    '$2b$12$qPU1ZJUKCdtOYJPfebl0ueoYS4TbPoHzWSl2QsM0NQTWSCWv5AVjG',  -- bcrypt hash of 'letsGo#B25'
    'Quotely Admin',
    NULL,
    NULL,
    'INR'
) ON CONFLICT (vchr_email) DO NOTHING;

-- Verify admin user was created
-- SELECT pk_bint_user_id, vchr_email, vchr_username FROM tbl_user WHERE pk_bint_user_id = 1;

-- =====================================================
-- NOTES:
-- 1. User ID 1 is ALWAYS the admin user
-- 2. Only admin can create new users via /user/add
-- 3. Admin cannot be deleted
-- 4. To reset password, generate new hash using:
--    python -c "from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(pwd_context.hash('NEW_PASSWORD'))"
-- =====================================================
