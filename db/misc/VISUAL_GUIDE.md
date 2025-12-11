# Visual Guide - Database Structure

## 🎯 Quick Understanding

---

## 📊 Calculation Flow

```
┌─────────────────────────────────────────────────────┐
│               QUOTATION / INVOICE                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Items:                                             │
│  ┌────────────────────────────────────┐            │
│  │ Item 1: Cement   100 × ₹350  =  ₹35,000  │      │
│  │ Item 2: Steel    200 × ₹65   =  ₹13,000  │      │
│  │ Item 3: Bricks  5000 × ₹8.50 =  ₹42,500  │      │
│  └────────────────────────────────────┘            │
│                                                     │
│  ┌────────────────────────────────────┐            │
│  │ dbl_subtotal (sum of items)  ₹90,500      │     │
│  │                                    │             │
│  │ + Tax (18% of subtotal)     ₹16,290      │     │
│  │   (dbl_tax_amount)           │             │
│  │                                    │             │
│  │ - Discount                  -₹3,000       │     │
│  │   (dbl_discount_amount)      │             │
│  │                                    │             │
│  │ ═══════════════════════════════════       │     │
│  │ = TOTAL AMOUNT             ₹1,03,790      │     │
│  │   (dbl_total_amount)         │             │
│  └────────────────────────────────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🗓️ Date Fields Explained

```
┌─────────────────────────────────────────────────┐
│            QUOTATION DOCUMENT                   │
│                                                 │
│  Quotation No: QT-2025-001                      │
│  Date: 2025-12-01  ← dat_quotation_date        │
│                       (User enters this)        │
│  Valid Until: 2025-12-31                        │
│                                                 │
│  [Customer Details]                             │
│  [Items List]                                   │
│  [Total: ₹1,03,790]                             │
│                                                 │
│  Created: 2025-12-01 10:30:45 ← tim_created_at │
│           (System generates)                    │
│  Updated: 2025-12-05 14:20:10 ← tim_updated_at │
│           (System updates)                      │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Quotation to Invoice Conversion

```
┌──────────────────┐
│   QUOTATION      │
│   QT-2025-001    │
│   Date: Dec 1    │
│   Items: 3       │
│   Total: ₹90,500 │
│   Status: SENT   │
└────────┬─────────┘
         │
         │ Customer Approved
         │ Convert to Invoice
         ↓
┌────────────────────┐
│     INVOICE        │
│   INV-2025-001     │
│   Date: Dec 10     │ ← NEW DATE (not same as quotation)
│   Items: 3         │ ← COPIED from quotation
│   Total: ₹90,500   │ ← Can be edited if needed
│   Status: PENDING  │
│   Due: Jan 15      │
└────────────────────┘
```

**Why Separate Item Tables?**
- Quotation items can be edited independently
- Invoice items can be edited independently
- 1-year-old quotation can be converted with current prices
- Historical accuracy maintained

---

## 📋 Naming Convention Visual

```
┌─────────────────────────────────────────────────┐
│  COLUMN NAME STRUCTURE                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  pk_bint_user_id                                │
│  │   │    │   │                                 │
│  │   │    │   └─→ Descriptive name             │
│  │   │    └─────→ Table reference              │
│  │   └──────────→ Data type (bigint)           │
│  └──────────────→ Purpose (primary key)        │
│                                                 │
│  vchr_customer_name                             │
│  │     │                                        │
│  │     └─────────→ Descriptive name            │
│  └───────────────→ Data type (varchar)         │
│                                                 │
│  dbl_total_amount                               │
│  │   │                                          │
│  │   └───────────→ Descriptive name            │
│  └───────────────→ Data type (decimal/double)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Prefix Guide:**
```
pk_bint_  → Primary Key (BIGINT)
fk_bint_  → Foreign Key (BIGINT)
vchr_     → VARCHAR
txt_      → TEXT
json_     → JSON
dat_      → DATE
tim_      → TIMESTAMP
int_      → INTEGER
dbl_      → DECIMAL/DOUBLE
bool_     → BOOLEAN
```

---

## 🔗 Relationships Diagram

```
tbl_user (Users)
    │
    ├─→ tbl_inventory (Products/Services)
    │
    ├─→ tbl_raw_input (AI Input - Immutable)
    │       │
    │       └─→ tbl_ai_response (AI Output - Immutable)
    │               │
    │               └─→ tbl_quotation (Optional link)
    │
    ├─→ tbl_quotation (Quotations - Editable)
    │       │
    │       ├─→ tbl_quotation_item (Quotation Items)
    │       │       │
    │       │       └─→ tbl_inventory (Optional link)
    │       │
    │       └─→ tbl_invoice (Converted to Invoice)
    │
    └─→ tbl_invoice (Invoices - Editable)
            │
            └─→ tbl_invoice_item (Invoice Items)
                    │
                    └─→ tbl_inventory (Optional link)
```

---

## 📊 Data Flow Example

### Step 1: User Creates Raw Input
```
tbl_raw_input
├─ Customer: "Rajesh Kumar"
├─ Phone: "+91-9988776655"
└─ Notes: "Need 100 bags cement, 200kg steel..."
```

### Step 2: AI Processes Input
```
tbl_ai_response
└─ JSON: {
     items: [
       {name: "Cement", qty: 100, price: 350},
       {name: "Steel", qty: 200, price: 65}
     ]
   }
```

### Step 3: Create Quotation
```
tbl_quotation
├─ Number: QT-2025-001
├─ Date: 2025-12-01
├─ Customer: Rajesh Kumar
├─ Status: draft
└─ Items (in tbl_quotation_item):
    ├─ Cement: 100 × ₹350 = ₹35,000
    └─ Steel: 200 × ₹65 = ₹13,000

Calculations:
├─ Subtotal: ₹48,000
├─ Tax (18%): ₹8,640
├─ Discount: -₹2,000
└─ Total: ₹54,640
```

### Step 4: Convert to Invoice
```
tbl_invoice
├─ Number: INV-2025-001
├─ Date: 2025-12-10  (NEW date)
├─ Customer: Rajesh Kumar
├─ Payment Status: pending
├─ Due Date: 2026-01-15
└─ Items (copied to tbl_invoice_item):
    ├─ Cement: 100 × ₹350 = ₹35,000
    └─ Steel: 200 × ₹65 = ₹13,000

Same calculations:
├─ Subtotal: ₹48,000
├─ Tax (18%): ₹8,640
├─ Discount: -₹2,000
└─ Total: ₹54,640

(Can be edited after creation!)
```

---

## ✅ Key Benefits

```
┌────────────────────────────────────────────┐
│  ✅ Self-Documenting                       │
│     vchr_customer_name tells you it's      │
│     a VARCHAR field                        │
│                                            │
│  ✅ Easy to Search                         │
│     Type "dat_" to see all date fields     │
│                                            │
│  ✅ Historical Accuracy                    │
│     Separate item tables preserve history  │
│                                            │
│  ✅ Flexible Editing                       │
│     Edit quotations and invoices freely    │
│                                            │
│  ✅ Clean Reports                          │
│     Simple joins for reporting             │
└────────────────────────────────────────────┘
```

---

## 🎯 Summary

**What is dbl_subtotal?**
→ Sum of all items (before tax & discount)

**What are dat_quotation_date and dat_invoice_date?**
→ Official document dates (user-controlled)

**Why separate item tables?**
→ Independent editing + historical accuracy

**Why the prefixes?**
→ Self-documenting code + better IDE support

---

**Version**: 2.0
**Last Updated**: 2025-12-11
