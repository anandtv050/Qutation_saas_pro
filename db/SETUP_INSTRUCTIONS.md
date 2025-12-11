# Database Setup Instructions

## Quick Setup with blankDb.py

### Step 1: Install Dependencies

```bash
cd db
pip install -r requirements.txt
```

### Step 2: Configure Database

Edit `config.yaml` and update your database credentials:

```yaml
# Database Configuration
DB_HOST: localhost
DB_PORT: 3306
DB_NAME: quotation_saas_pro
DB_USER: root
DB_PASSWORD: your_password_here
```

### Step 3: Run the Script

```bash
python blankDb.py
```

This will:
1. Create the database `quotation_saas_pro`
2. Execute `sql/schema.sql` to create all tables
3. Show you the list of created tables

---

## What the Script Does

```
blankDb.py
    ↓
Reads config.yaml
    ↓
Connects to MySQL
    ↓
Creates database (if not exists)
    ↓
Executes sql/schema.sql
    ↓
Creates all 8 tables:
  - tbl_user
  - tbl_inventory
  - tbl_raw_input
  - tbl_ai_response
  - tbl_quotation
  - tbl_quotation_item
  - tbl_invoice
  - tbl_invoice_item
```

---

## Files Structure

```
db/
├── blankDb.py              # Main setup script
├── config.yaml             # Database configuration
├── requirements.txt        # Python dependencies
├── sql/
│   └── schema.sql         # Database schema
└── SETUP_INSTRUCTIONS.md  # This file
```

---

## Expected Output

```
============================================================
BlankDB - Database Setup Script
============================================================

Loading configuration...
✓ Configuration loaded
  Host: localhost
  Database: quotation_saas_pro

Creating database 'quotation_saas_pro'...
✓ Database 'quotation_saas_pro' created successfully!

Reading schema file 'sql/schema.sql'...
Executing schema...
✓ Schema executed successfully!

Created tables:
  - tbl_user
  - tbl_inventory
  - tbl_raw_input
  - tbl_ai_response
  - tbl_quotation
  - tbl_quotation_item
  - tbl_invoice
  - tbl_invoice_item

============================================================
✓ Database setup completed successfully!
============================================================
```

---

## Troubleshooting

### Error: "Access denied for user"
- Check your `DB_USER` and `DB_PASSWORD` in `config.yaml`
- Make sure MySQL is running

### Error: "Can't connect to MySQL server"
- Verify MySQL is running: `mysql --version`
- Check `DB_HOST` and `DB_PORT` in `config.yaml`

### Error: "mysql.connector not found"
- Install dependencies: `pip install -r requirements.txt`

### Error: "schema.sql not found"
- Make sure you're running the script from the `db` directory
- Check that `sql/schema.sql` exists

---

## Manual Setup (Alternative)

If you prefer manual setup:

```bash
# 1. Login to MySQL
mysql -u root -p

# 2. Create database
CREATE DATABASE quotation_saas_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. Use database
USE quotation_saas_pro;

# 4. Execute schema
SOURCE sql/schema.sql;

# 5. Verify tables
SHOW TABLES;
```

---

## Next Steps

After database setup:

1. ✅ Database created with clean naming convention
2. 🔄 Update `config.yaml` with production credentials (if deploying)
3. 🔄 Set up backend API (Flask/FastAPI)
4. 🔄 Build frontend (React/Vue)

---

**Version**: 1.0
**Last Updated**: 2025-12-11
