# Price Calculations Explained

## Understanding dbl_subtotal and Total Amount Calculation

---

## Field Definitions

### In tbl_quotation and tbl_invoice:

| Field Name | Meaning | Example |
|------------|---------|---------|
| `dbl_subtotal` | Sum of all item prices (before tax & discount) | ₹30,000 |
| `dbl_tax_percent` | Tax percentage (GST, VAT, etc.) | 18% |
| `dbl_tax_amount` | Tax amount calculated | ₹5,400 |
| `dbl_discount_amount` | Discount in currency | ₹2,000 |
| `dbl_total_amount` | Final amount to pay | ₹33,400 |

---

## Calculation Formula

```
Step 1: Calculate Subtotal
dbl_subtotal = SUM(all items' dbl_total_price)

Step 2: Calculate Tax Amount
dbl_tax_amount = dbl_subtotal × (dbl_tax_percent / 100)

Step 3: Calculate Total Amount
dbl_total_amount = dbl_subtotal + dbl_tax_amount - dbl_discount_amount
```

---

## Example 1: Simple Quotation

### Items:
```
Item 1: Cement Bags
  - Quantity: 100 bags
  - Unit Price: ₹350
  - Total: ₹35,000

Item 2: Steel Bars
  - Quantity: 500 kg
  - Unit Price: ₹65
  - Total: ₹32,500

Item 3: Bricks
  - Quantity: 5000 pieces
  - Unit Price: ₹8.50
  - Total: ₹42,500
```

### Calculation:
```
dbl_subtotal = 35,000 + 32,500 + 42,500 = ₹110,000

Tax (18% GST):
dbl_tax_amount = 110,000 × 0.18 = ₹19,800

Discount:
dbl_discount_amount = ₹5,000

Final Total:
dbl_total_amount = 110,000 + 19,800 - 5,000 = ₹124,800
```

---

## Example 2: Invoice with Different Values

### Items:
```
Item 1: Paint
  - Quantity: 10 cans
  - Unit Price: ₹4,500
  - Total: ₹45,000

Item 2: Labor
  - Quantity: 5 days
  - Unit Price: ₹800
  - Total: ₹4,000
```

### Calculation:
```
dbl_subtotal = 45,000 + 4,000 = ₹49,000

Tax (18% GST):
dbl_tax_amount = 49,000 × 0.18 = ₹8,820

No Discount:
dbl_discount_amount = ₹0

Final Total:
dbl_total_amount = 49,000 + 8,820 - 0 = ₹57,820
```

---

## Database Storage vs Display

### Stored in Database:
```sql
dbl_subtotal = 110000.00
dbl_tax_percent = 18.00
dbl_tax_amount = 19800.00
dbl_discount_amount = 5000.00
dbl_total_amount = 124800.00
```

### Display on Frontend:
```
Subtotal:        ₹1,10,000.00
Tax (18% GST):   ₹19,800.00
Discount:        -₹5,000.00
--------------------------------
Total Amount:    ₹1,24,800.00
```

---

## Backend Calculation Function (Pseudocode)

```python
def calculate_quotation_totals(items, tax_percent, discount_amount):
    """
    Calculate subtotal, tax, and total for quotation/invoice
    """
    # Step 1: Calculate subtotal from all items
    subtotal = sum(item.dbl_quantity * item.dbl_unit_price for item in items)

    # Step 2: Calculate tax amount
    tax_amount = subtotal * (tax_percent / 100)

    # Step 3: Calculate total
    total_amount = subtotal + tax_amount - discount_amount

    return {
        'dbl_subtotal': round(subtotal, 2),
        'dbl_tax_amount': round(tax_amount, 2),
        'dbl_total_amount': round(total_amount, 2)
    }
```

---

## Frontend Calculation (JavaScript)

```javascript
function calculateTotals(items, taxPercent, discountAmount) {
    // Step 1: Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
        return sum + (item.dbl_quantity * item.dbl_unit_price);
    }, 0);

    // Step 2: Calculate tax
    const taxAmount = subtotal * (taxPercent / 100);

    // Step 3: Calculate total
    const totalAmount = subtotal + taxAmount - discountAmount;

    return {
        dbl_subtotal: Math.round(subtotal * 100) / 100,
        dbl_tax_amount: Math.round(taxAmount * 100) / 100,
        dbl_total_amount: Math.round(totalAmount * 100) / 100
    };
}
```

---

## Important Notes

### 1. **Item Level Calculation**
Each item in `tbl_quotation_item` or `tbl_invoice_item`:
```
dbl_total_price = dbl_quantity × dbl_unit_price
```

### 2. **Document Level Calculation**
The document (quotation/invoice) totals:
```
dbl_subtotal = SUM of all items' dbl_total_price
dbl_tax_amount = dbl_subtotal × (dbl_tax_percent / 100)
dbl_total_amount = dbl_subtotal + dbl_tax_amount - dbl_discount_amount
```

### 3. **Rounding**
Always round to 2 decimal places for currency values.

### 4. **Validation**
```
✓ dbl_subtotal >= 0
✓ dbl_tax_percent >= 0 and <= 100
✓ dbl_tax_amount >= 0
✓ dbl_discount_amount >= 0
✓ dbl_total_amount >= 0
```

---

## SQL Query to Verify Calculations

```sql
-- Verify quotation calculations
SELECT
    q.vchr_quotation_number,
    q.dbl_subtotal,
    SUM(qi.dbl_total_price) as calculated_subtotal,
    q.dbl_tax_percent,
    q.dbl_tax_amount,
    ROUND(q.dbl_subtotal * (q.dbl_tax_percent / 100), 2) as calculated_tax,
    q.dbl_discount_amount,
    q.dbl_total_amount,
    ROUND(q.dbl_subtotal + q.dbl_tax_amount - q.dbl_discount_amount, 2) as calculated_total
FROM tbl_quotation q
INNER JOIN tbl_quotation_item qi ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
GROUP BY q.pk_bint_quotation_id;
```

---

## Date Fields Explanation

### New Fields Added:

| Field | Purpose | Example |
|-------|---------|---------|
| `dat_quotation_date` | Official date on the quotation document | 2025-12-01 |
| `dat_invoice_date` | Official date on the invoice document | 2025-12-10 |
| `tim_created_at` | System timestamp when record was created | 2025-12-01 10:30:45 |
| `tim_updated_at` | System timestamp when record was last edited | 2025-12-05 14:22:10 |

### Why Both?

- **`dat_quotation_date` / `dat_invoice_date`**: User-controlled, appears on printed documents
- **`tim_created_at`**: System-controlled, for audit trail
- **`tim_updated_at`**: System-controlled, tracks last modification

---

**Version**: 2.0
**Last Updated**: 2025-12-11
