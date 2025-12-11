# Database Setup Guide

## 📁 Files in this directory

### 🎯 Start Here:
1. **VISUAL_GUIDE.md** - 👀 Visual explanations with diagrams (START HERE!)
2. **UPDATES_SUMMARY.md** - 📋 Summary of latest changes and what's new

### 📖 Documentation:
3. **naming_convention.md** - Complete naming convention documentation
4. **dbStructure_updated.md** - Database structure with new naming convention
5. **calculations_explained.md** - How subtotal, tax, and total are calculated

### 💾 SQL Files:
6. **schema.sql** - SQL script to create all tables
7. **sample_data.sql** - Sample data for testing

### 📦 Archive:
8. **dbStructure.md** - Old structure (for reference)

---

## Quick Start

### Step 1: Create Database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE quotation_saas_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quotation_saas_pro;
```

### Step 2: Run Schema

```bash
mysql -u root -p quotation_saas_pro < schema.sql
```

Or from MySQL prompt:
```sql
USE quotation_saas_pro;
SOURCE schema.sql;
```

### Step 3: Load Sample Data (Optional)

```bash
mysql -u root -p quotation_saas_pro < sample_data.sql
```

Or from MySQL prompt:
```sql
USE quotation_saas_pro;
SOURCE sample_data.sql;
```

---

## Naming Convention Summary

| Data Type | Prefix | Example |
|-----------|--------|---------|
| Primary Key | `pk_bint_` | `pk_bint_user_id` |
| Foreign Key | `fk_bint_` | `fk_bint_user_id` |
| VARCHAR | `vchr_` | `vchr_username` |
| TEXT | `txt_` | `txt_description` |
| JSON | `json_` | `json_ai_response` |
| DATE | `dat_` | `dat_valid_until` |
| TIMESTAMP | `tim_` | `tim_created_at` |
| INTEGER | `int_` | `int_stock_qty` |
| DECIMAL | `dbl_` | `dbl_unit_price` |
| BOOLEAN | `bool_` | `bool_is_active` |

---

## Database Connection (.env)

Add to your `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=quotation_saas_pro
DB_USER=root
DB_PASSWORD=your_password
DB_CHARSET=utf8mb4
```

---

## Table List

1. **tbl_user** - User accounts
2. **tbl_inventory** - Product/service catalog
3. **tbl_raw_input** - Raw AI input (immutable)
4. **tbl_ai_response** - AI-generated responses (immutable)
5. **tbl_quotation** - Quotations (editable)
6. **tbl_quotation_item** - Quotation line items
7. **tbl_invoice** - Invoices (editable)
8. **tbl_invoice_item** - Invoice line items

---

## Common Queries

### Get all quotations with items for a user

```sql
SELECT
    q.pk_bint_quotation_id,
    q.vchr_quotation_number,
    q.vchr_customer_name,
    q.dbl_total_amount,
    q.vchr_status,
    qi.vchr_item_name,
    qi.dbl_quantity,
    qi.dbl_unit_price,
    qi.dbl_total_price
FROM tbl_quotation q
INNER JOIN tbl_quotation_item qi
    ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
WHERE q.fk_bint_user_id = ?
ORDER BY q.tim_created_at DESC, qi.int_sort_order ASC;
```

### Get all invoices with payment status

```sql
SELECT
    i.pk_bint_invoice_id,
    i.vchr_invoice_number,
    i.vchr_customer_name,
    i.dbl_total_amount,
    i.vchr_payment_status,
    i.dat_due_date,
    i.tim_created_at
FROM tbl_invoice i
WHERE i.fk_bint_user_id = ?
ORDER BY i.tim_created_at DESC;
```

### Convert quotation to invoice

```sql
-- 1. Create invoice from quotation
INSERT INTO tbl_invoice (
    fk_bint_user_id,
    fk_bint_quotation_id,
    vchr_invoice_number,
    vchr_customer_name,
    vchr_customer_phone,
    txt_customer_address,
    dbl_subtotal,
    dbl_tax_percent,
    dbl_tax_amount,
    dbl_discount_amount,
    dbl_total_amount,
    txt_notes,
    vchr_payment_status,
    dat_due_date
)
SELECT
    fk_bint_user_id,
    pk_bint_quotation_id,
    CONCAT('INV-', DATE_FORMAT(NOW(), '%Y-%m-'), LPAD(LAST_INSERT_ID(), 3, '0')),
    vchr_customer_name,
    vchr_customer_phone,
    txt_customer_address,
    dbl_subtotal,
    dbl_tax_percent,
    dbl_tax_amount,
    dbl_discount_amount,
    dbl_total_amount,
    txt_notes,
    'pending',
    DATE_ADD(NOW(), INTERVAL 30 DAY)
FROM tbl_quotation
WHERE pk_bint_quotation_id = ?;

-- 2. Copy items from quotation to invoice
INSERT INTO tbl_invoice_item (
    fk_bint_invoice_id,
    fk_bint_inventory_id,
    vchr_item_code,
    vchr_item_name,
    vchr_unit,
    dbl_quantity,
    dbl_unit_price,
    dbl_total_price,
    int_sort_order
)
SELECT
    LAST_INSERT_ID(),
    fk_bint_inventory_id,
    vchr_item_code,
    vchr_item_name,
    vchr_unit,
    dbl_quantity,
    dbl_unit_price,
    dbl_total_price,
    int_sort_order
FROM tbl_quotation_item
WHERE fk_bint_quotation_id = ?;

-- 3. Update quotation status
UPDATE tbl_quotation
SET vchr_status = 'converted'
WHERE pk_bint_quotation_id = ?;
```

---

## Testing the Database

### Test user credentials (from sample_data.sql)

- Username: `demo_user`
- Password: (hash for 'password123' - implement hashing in backend)

### Verify installation

```sql
-- Check tables
SHOW TABLES;

-- Check sample data
SELECT COUNT(*) FROM tbl_user;
SELECT COUNT(*) FROM tbl_inventory;
SELECT COUNT(*) FROM tbl_quotation;
SELECT COUNT(*) FROM tbl_invoice;

-- Test a join query
SELECT q.vchr_quotation_number, COUNT(qi.pk_bint_quotation_item_id) as item_count
FROM tbl_quotation q
LEFT JOIN tbl_quotation_item qi ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
GROUP BY q.pk_bint_quotation_id;
```

---

## Backup & Restore

### Backup

```bash
mysqldump -u root -p quotation_saas_pro > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
mysql -u root -p quotation_saas_pro < backup_20251211.sql
```

---

## Next Steps

1. ✅ Database schema created with clean naming convention
2. 🔄 Set up backend API with Flask/FastAPI
3. 🔄 Create frontend with React/Vue
4. 🔄 Implement authentication
5. 🔄 Build CRUD operations for all tables
6. 🔄 Create report generation functionality

---

**Version**: 2.0
**Last Updated**: 2025-12-11
