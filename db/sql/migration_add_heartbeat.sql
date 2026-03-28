-- Migration: Add heartbeat and login tracking to tbl_user
-- Run this on your existing database

ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_last_heartbeat TIMESTAMP DEFAULT NULL;
ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS tim_last_login TIMESTAMP DEFAULT NULL;
