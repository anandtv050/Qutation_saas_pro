# Database Structure - Quotation SaaS Pro
## With Clean Naming Convention (v2.0)

---

## Table 1: tbl_user

```sql
┌─────────────────────────────────────────────────────────────┐
│                        tbl_user                             │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_user_id          BIGINT PK AUTO_INCREMENT          │
│  vchr_username            VARCHAR(100) UNIQUE NOT NULL      │
│  vchr_password_hash       VARCHAR(255) NOT NULL             │
│  vchr_business_name       VARCHAR(200)                      │
│  vchr_phone               VARCHAR(20)                       │
│  txt_address              TEXT                              │
│  vchr_currency_code       VARCHAR(10) DEFAULT 'INR'         │
│  vchr_gst_number          VARCHAR(50)                       │
│  tim_created_at           TIMESTAMP DEFAULT NOW()           │
│  tim_updated_at           TIMESTAMP DEFAULT NOW()           │
└─────────────────────────────────────────────────────────────┘
```

**Indexes:**
- `PK_user` on `pk_bint_user_id`
- `UQ_user_username` on `vchr_username`

---

## Table 2: tbl_inventory

```sql
┌─────────────────────────────────────────────────────────────┐
│                     tbl_inventory                           │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_inventory_id     BIGINT PK AUTO_INCREMENT          │
│  fk_bint_user_id          BIGINT NOT NULL                   │
│  vchr_item_code           VARCHAR(50)                       │
│  vchr_item_name           VARCHAR(200) NOT NULL             │
│  vchr_category            VARCHAR(100)                      │
│  vchr_unit                VARCHAR(20) DEFAULT 'piece'       │
│  dbl_unit_price           DECIMAL(12,2) NOT NULL            │
│  int_stock_qty            INT DEFAULT 0                     │
│  txt_description          TEXT                              │
│  tim_created_at           TIMESTAMP DEFAULT NOW()           │
│  tim_updated_at           TIMESTAMP DEFAULT NOW()           │
└─────────────────────────────────────────────────────────────┘
```

**Foreign Keys:**
- `FK_inventory_user`: `fk_bint_user_id` → `tbl_user(pk_bint_user_id)`

**Indexes:**
- `PK_inventory` on `pk_bint_inventory_id`
- `FK_inventory_user` on `fk_bint_user_id`
- `IDX_inventory_item_code` on `vchr_item_code`

---

## Table 3: tbl_raw_input
**(Immutable — never edit)**

```sql
┌─────────────────────────────────────────────────────────────┐
│                     tbl_raw_input                           │
│  (Immutable — never edit)                                   │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_raw_input_id     BIGINT PK AUTO_INCREMENT          │
│  fk_bint_user_id          BIGINT NOT NULL                   │
│  vchr_customer_name       VARCHAR(200)                      │
│  vchr_customer_phone      VARCHAR(20)                       │
│  txt_customer_address     TEXT                              │
│  txt_site_notes           TEXT NOT NULL                     │
│  tim_cre ated_at           TIMESTAMP DEFAULT NOW()           │
└─────────────────────────────────────────────────────────────┘
```

**Foreign Keys:**
- `FK_raw_input_user`: `fk_bint_user_id` → `tbl_user(pk_bint_user_id)`

**Indexes:**
- `PK_raw_input` on `pk_bint_raw_input_id`
- `FK_raw_input_user` on `fk_bint_user_id`

---

## Table 4: tbl_ai_response
**(Immutable — never edit)**

```sql
┌─────────────────────────────────────────────────────────────┐
│                    tbl_ai_response                          │
│  (Immutable — never edit)                                   │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_ai_response_id   BIGINT PK AUTO_INCREMENT          │
│  fk_bint_raw_input_id     BIGINT NOT NULL                   │
│  fk_bint_user_id          BIGINT NOT NULL                   │
│  json_ai_response         JSON NOT NULL                     │
│  vchr_prompt_version      VARCHAR(50)                       │
│  vchr_model_used          VARCHAR(50)                       │
│  tim_created_at           TIMESTAMP DEFAULT NOW()           │
└─────────────────────────────────────────────────────────────┘
```

**Foreign Keys:**
- `FK_ai_response_raw_input`: `fk_bint_raw_input_id` → `tbl_raw_input(pk_bint_raw_input_id)`
- `FK_ai_response_user`: `fk_bint_user_id` → `tbl_user(pk_bint_user_id)`

**Indexes:**
- `PK_ai_response` on `pk_bint_ai_response_id`
- `FK_ai_response_raw_input` on `fk_bint_raw_input_id`
- `FK_ai_response_user` on `fk_bint_user_id`

---

## Table 5: tbl_quotation
**(Mutable — user can edit)**

```sql
┌─────────────────────────────────────────────────────────────┐
│                     tbl_quotation                           │
│  (Mutable — user can edit)                                  │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_quotation_id     BIGINT PK AUTO_INCREMENT          │
│  fk_bint_user_id          BIGINT NOT NULL                   │
│  fk_bint_ai_response_id   BIGINT NULL                       │
│  vchr_quotation_number    VARCHAR(50) UNIQUE NOT NULL       │
│  dat_quotation_date       DATE NOT NULL                     │
│  vchr_customer_name       VARCHAR(200) NOT NULL             │
│  vchr_customer_phone      VARCHAR(20)                       │
│  txt_customer_address     TEXT                              │
│  dbl_subtotal             DECIMAL(12,2) DEFAULT 0           │
│  dbl_tax_percent          DECIMAL(5,2) DEFAULT 0            │
│  dbl_tax_amount           DECIMAL(12,2) DEFAULT 0           │
│  dbl_discount_amount      DECIMAL(12,2) DEFAULT 0           │
│  dbl_total_amount         DECIMAL(12,2) DEFAULT 0           │
│  txt_notes                TEXT                              │
│  vchr_status              VARCHAR(20) DEFAULT 'draft'       │
│  dat_valid_until          DATE                              │
│  tim_created_at           TIMESTAMP DEFAULT NOW()           │
│  tim_updated_at           TIMESTAMP DEFAULT NOW()           │
└─────────────────────────────────────────────────────────────┘
```

**Status Values:** `draft`, `sent`, `approved`, `rejected`, `converted`

**Foreign Keys:**
- `FK_quotation_user`: `fk_bint_user_id` → `tbl_user(pk_bint_user_id)`
- `FK_quotation_ai_response`: `fk_bint_ai_response_id` → `tbl_ai_response(pk_bint_ai_response_id)` ON DELETE SET NULL

**Indexes:**
- `PK_quotation` on `pk_bint_quotation_id`
- `UQ_quotation_number` on `vchr_quotation_number`
- `FK_quotation_user` on `fk_bint_user_id`
- `IDX_quotation_status` on `vchr_status`
- `IDX_quotation_created` on `tim_created_at`

---

## Table 6: tbl_quotation_item

```sql
┌─────────────────────────────────────────────────────────────┐
│                   tbl_quotation_item                        │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_quotation_item_id  BIGINT PK AUTO_INCREMENT        │
│  fk_bint_quotation_id       BIGINT NOT NULL                 │
│  fk_bint_inventory_id       BIGINT NULL                     │
│  vchr_item_code             VARCHAR(50)                     │
│  vchr_item_name             VARCHAR(200) NOT NULL           │
│  vchr_unit                  VARCHAR(20)                     │
│  dbl_quantity               DECIMAL(10,2) NOT NULL          │
│  dbl_unit_price             DECIMAL(12,2) NOT NULL          │
│  dbl_total_price            DECIMAL(12,2) NOT NULL          │
│  int_sort_order             INT DEFAULT 0                   │
└─────────────────────────────────────────────────────────────┘
```

**Foreign Keys:**
- `FK_quotation_item_quotation`: `fk_bint_quotation_id` → `tbl_quotation(pk_bint_quotation_id)` ON DELETE CASCADE
- `FK_quotation_item_inventory`: `fk_bint_inventory_id` → `tbl_inventory(pk_bint_inventory_id)` ON DELETE SET NULL

**Indexes:**
- `PK_quotation_item` on `pk_bint_quotation_item_id`
- `FK_quotation_item_quotation` on `fk_bint_quotation_id`
- `FK_quotation_item_inventory` on `fk_bint_inventory_id`

---

## Table 7: tbl_invoice

```sql
┌─────────────────────────────────────────────────────────────┐
│                      tbl_invoice                            │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_invoice_id       BIGINT PK AUTO_INCREMENT          │
│  fk_bint_user_id          BIGINT NOT NULL                   │
│  fk_bint_quotation_id     BIGINT NULL                       │
│  vchr_invoice_number      VARCHAR(50) UNIQUE NOT NULL       │
│  dat_invoice_date         DATE NOT NULL                     │
│  vchr_customer_name       VARCHAR(200) NOT NULL             │
│  vchr_customer_phone      VARCHAR(20)                       │
│  txt_customer_address     TEXT                              │
│  dbl_subtotal             DECIMAL(12,2) DEFAULT 0           │
│  dbl_tax_percent          DECIMAL(5,2) DEFAULT 0            │
│  dbl_tax_amount           DECIMAL(12,2) DEFAULT 0           │
│  dbl_discount_amount      DECIMAL(12,2) DEFAULT 0           │
│  dbl_total_amount         DECIMAL(12,2) DEFAULT 0           │
│  txt_notes                TEXT                              │
│  vchr_payment_status      VARCHAR(20) DEFAULT 'pending'     │
│  dat_due_date             DATE                              │
│  tim_created_at           TIMESTAMP DEFAULT NOW()           │
│  tim_updated_at           TIMESTAMP DEFAULT NOW()           │
└─────────────────────────────────────────────────────────────┘
```

**Payment Status Values:** `pending`, `partial`, `paid`, `overdue`

**Foreign Keys:**
- `FK_invoice_user`: `fk_bint_user_id` → `tbl_user(pk_bint_user_id)`
- `FK_invoice_quotation`: `fk_bint_quotation_id` → `tbl_quotation(pk_bint_quotation_id)` ON DELETE SET NULL

**Indexes:**
- `PK_invoice` on `pk_bint_invoice_id`
- `UQ_invoice_number` on `vchr_invoice_number`
- `FK_invoice_user` on `fk_bint_user_id`
- `IDX_invoice_payment_status` on `vchr_payment_status`
- `IDX_invoice_due_date` on `dat_due_date`
- `IDX_invoice_created` on `tim_created_at`

---

## Table 8: tbl_invoice_item

```sql
┌─────────────────────────────────────────────────────────────┐
│                    tbl_invoice_item                         │
├─────────────────────────────────────────────────────────────┤
│  pk_bint_invoice_item_id  BIGINT PK AUTO_INCREMENT          │
│  fk_bint_invoice_id       BIGINT NOT NULL                   │
│  fk_bint_inventory_id     BIGINT NULL                       │
│  vchr_item_code           VARCHAR(50)                       │
│  vchr_item_name           VARCHAR(200) NOT NULL             │
│  vchr_unit                VARCHAR(20)                       │
│  dbl_quantity             DECIMAL(10,2) NOT NULL            │
│  dbl_unit_price           DECIMAL(12,2) NOT NULL            │
│  dbl_total_price          DECIMAL(12,2) NOT NULL            │
│  int_sort_order           INT DEFAULT 0                     │
└─────────────────────────────────────────────────────────────┘
```

**Foreign Keys:**
- `FK_invoice_item_invoice`: `fk_bint_invoice_id` → `tbl_invoice(pk_bint_invoice_id)` ON DELETE CASCADE
- `FK_invoice_item_inventory`: `fk_bint_inventory_id` → `tbl_inventory(pk_bint_inventory_id)` ON DELETE SET NULL

**Indexes:**
- `PK_invoice_item` on `pk_bint_invoice_item_id`
- `FK_invoice_item_invoice` on `fk_bint_invoice_id`
- `FK_invoice_item_inventory` on `fk_bint_inventory_id`

---

## Entity Relationship Diagram (ERD) Summary

```
tbl_user (1) ──→ (N) tbl_inventory
tbl_user (1) ──→ (N) tbl_raw_input
tbl_user (1) ──→ (N) tbl_ai_response
tbl_user (1) ──→ (N) tbl_quotation
tbl_user (1) ──→ (N) tbl_invoice

tbl_raw_input (1) ──→ (N) tbl_ai_response

tbl_ai_response (1) ──→ (0..1) tbl_quotation

tbl_quotation (1) ──→ (N) tbl_quotation_item
tbl_quotation (1) ──→ (0..1) tbl_invoice

tbl_invoice (1) ──→ (N) tbl_invoice_item

tbl_inventory (1) ──→ (N) tbl_quotation_item (optional link)
tbl_inventory (1) ──→ (N) tbl_invoice_item (optional link)
```

---

## Key Design Decisions

1. **Separate Item Tables**: `tbl_quotation_item` and `tbl_invoice_item` are separate for independent editing and historical accuracy

2. **Immutable Tables**: `tbl_raw_input` and `tbl_ai_response` never change - they maintain audit trail

3. **Optional Inventory Link**: Items can reference inventory OR be standalone (flexibility)

4. **Cascade Deletes**: Deleting quotation/invoice removes its items automatically

5. **SET NULL on Delete**: Deleting quotation doesn't delete invoice; deleting inventory doesn't delete items

---

**Version**: 2.0 (With Naming Convention)
**Last Updated**: 2025-12-11
