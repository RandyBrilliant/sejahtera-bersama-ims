# Purchase & Sales API Reference (Frontend Guide)

Base URL:

- Local/dev: `http://localhost:8000`
- API prefix: `/api/purchase`

Full base: `http://localhost:8000/api/purchase`

---

## 1) Auth

All endpoints require authentication (JWT cookie or Bearer), same as account/inventory.

---

## 2) Roles & permissions (summary)

| Resource | Read | Create / update | Delete | Verify payment & order | Upload bukti TF |
|----------|------|-----------------|--------|------------------------|-----------------|
| Customers | All internal roles | Sales, Admin, Owner | **Admin, Owner only** | — | — |
| Customer product prices (harga khusus) | All internal roles | **Admin, Owner only** | Admin, Owner | — | — |
| Purchase in orders (bahan / supplier) | All internal roles | **Warehouse, Admin, Owner** | Draft/cancelled only | **Owner only** (`verify`) | Warehouse, Admin, Owner |
| Sales orders (penjualan / order keluar) | All internal roles | **Sales, Admin, Owner** | Draft/cancelled only | **Owner only** (`verify`) | Sales, Admin, Owner |

Owner = `LEADERSHIP` role or Django superuser.

---

## 3) Order status values

Common for purchase-in and sales orders:

- `DRAFT`
- `SUBMITTED`
- `AWAITING_PAYMENT`
- `PAYMENT_PROOF_UPLOADED` (set automatically after upload bukti)
- `VERIFIED` (owner only, via `verify` action; applies stock movement)
- `CANCELLED` (via `cancel` action; not allowed after `VERIFIED`)

Do not set `VERIFIED` via normal PATCH; use the `verify` action.

---

## 4) Pagination

List endpoints use the same pagination as inventory:

- `page`, `page_size` (default 20, max 100)
- Response: `count`, `next`, `previous`, `results`

---

## 5) Product pricing (sales)

Resolution order for **sales order line** `unit_price_idr` when omitted or null:

1. Explicit `unit_price_idr` in the line payload (sales negotiation)
2. Active `CustomerProductPrice` for that customer + packaging (admin special price)
3. `ProductPackaging.list_price_idr` (default jual), if set
4. Fallback: `ProductPackaging.base_price_idr` (harga dasar / cost reference)

Admin sets per-customer prices via **Customer product prices** API. Set `list_price_idr` on packaging in inventory for a global default selling price.

---

## 6) Endpoints

### 6.1 Customers — `/api/purchase/customers/`

CRUD: `GET`, `POST`, `GET /{id}/`, `PUT`, `PATCH`, `DELETE`

Filters: `is_active`, `name__icontains`, `phone__icontains`, `tax_id__icontains`

Search: `name`, `company_name`, `phone`, `email`, `tax_id`

Create example:

```json
{
  "name": "Warung Makmur",
  "company_name": "PT Makmur",
  "phone": "081234567890",
  "email": "order@example.com",
  "address": "Jl. Contoh No. 1",
  "tax_id": "",
  "notes": "",
  "is_active": true
}
```

---

### 6.2 Customer product prices (harga khusus) — `/api/purchase/customer-product-prices/`

**Write: Admin / Owner only.**  
Read: all internal roles.

Filters: `customer`, `product_packaging`, `is_active`

Create example:

```json
{
  "customer": 1,
  "product_packaging": 4,
  "selling_price_idr": 22000,
  "note": "Harga kontrak Q2",
  "is_active": true
}
```

Unique per `(customer, product_packaging)`.

---

### 6.3 Purchase in orders (order masuk — bahan baku) — `/api/purchase/purchase-in-orders/`

**Create / update: Warehouse, Admin, Owner.**

Nested `lines` on create and full update:

- `ingredient_inventory` (ID)
- `quantity` (decimal string)
- `unit_cost_idr` (integer IDR)

Create example:

```json
{
  "supplier_name": "CV Tepung Jaya",
  "supplier_phone": "021-000000",
  "status": "DRAFT",
  "invoice_number": "",
  "invoice_date": null,
  "due_date": null,
  "tax_amount_idr": 0,
  "notes": "",
  "lines": [
    {
      "ingredient_inventory": 1,
      "quantity": "50.000",
      "unit_cost_idr": 12000
    }
  ]
}
```

Response includes auto-generated `order_code` (e.g. `PI-20260424-0001`), `subtotal_idr`, `total_idr`.

#### Upload bukti transfer

- **POST** `/api/purchase/purchase-in-orders/{id}/upload-payment-proof/`
- `Content-Type: multipart/form-data`
- Field name: **`payment_proof`** (file)

Sets status to `PAYMENT_PROOF_UPLOADED` and stores `payment_proof_uploaded_at`.

#### Owner verify (terima barang + tambah stok bahan)

- **POST** `/api/purchase/purchase-in-orders/{id}/verify/`
- **Owner only**

Requires status `PAYMENT_PROOF_UPLOADED`, or `AWAITING_PAYMENT` with file already uploaded.  
Creates **ingredient stock IN** movements and increases `IngredientInventory.remaining_stock` for each line.

#### Cancel

- **POST** `/api/purchase/purchase-in-orders/{id}/cancel/`

Not allowed when status is `VERIFIED`.

#### Delete

- **DELETE** `/api/purchase/purchase-in-orders/{id}/`

Only when status is `DRAFT` or `CANCELLED`.

---

### 6.4 Sales orders (order keluar — penjualan) — `/api/purchase/sales-orders/`

**Create / update: Sales, Admin, Owner.**

Nested `lines`:

- `product_packaging` (ID)
- `quantity` (decimal string)
- `unit_price_idr` (optional; if omitted, resolved from customer special price → list price → base price)

Create example:

```json
{
  "customer": 1,
  "status": "DRAFT",
  "invoice_number": "INV-2026-001",
  "invoice_date": "2026-04-24",
  "due_date": "2026-05-01",
  "tax_amount_idr": 0,
  "notes": "",
  "lines": [
    {
      "product_packaging": 4,
      "quantity": "30.000",
      "unit_price_idr": 20000
    }
  ]
}
```

Auto `order_code` e.g. `SO-20260424-0001`.

#### Upload bukti transfer

- **POST** `/api/purchase/sales-orders/{id}/upload-payment-proof/`
- Multipart field **`payment_proof`**

#### Owner verify (pengurangan stok produk)

- **POST** `/api/purchase/sales-orders/{id}/verify/`
- **Owner only**

Validates sufficient `ProductPackaging.remaining_stock` for every line before applying any change.  
Creates **product stock OUT** movements and decreases stock.

#### Download invoice PDF (sales)

- **GET** `/api/purchase/sales-orders/{id}/invoice-pdf/`
- Auth: same as sales order **read** (all internal roles).
- Response: `application/pdf` attachment, filename `{order_code}-invoice.pdf`.
- Includes customer header, line items (variant, packaging, mass), subtotal, tax, total.
- Not generated for status `CANCELLED` (`400`).

#### Cancel / delete

Same pattern as purchase-in orders.

---

## 7) Invoicing fields

Both order types support:

- `invoice_number`
- `invoice_date`
- `due_date`
- `subtotal_idr` (read-only, computed from lines)
- `tax_amount_idr` (writable; included in `total_idr`)
- `total_idr` (read-only, `subtotal_idr + tax_amount_idr`)

---

## 8) Media / file URLs

With `DEBUG=True`, uploaded files are served under `MEDIA_URL` (see Django settings). Frontend should build absolute URLs from the relative `payment_proof` path returned in JSON when needed.

---

## 9) Notes

- Stock is only adjusted when the owner calls **`verify`** on the respective order.
- Finance and sales can **read** purchase-in and sales orders for reporting.
- Customer special prices are the primary way for **admin** to give a customer a different selling price than others.

---

## 10) Sales revenue report (verified orders only)

- **GET** `/api/purchase/reports/sales-revenue/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- Auth: **Finance, Admin, Owner** (and superuser) only — not exposed to warehouse/sales by default.
- Filters **verified** sales orders where **`verified_at`** falls within the range (inclusive by calendar day in server timezone).

Success payload (`code` + `data`):

- `summary`: `verified_order_count`, `total_revenue_idr`, `total_subtotal_idr`, `total_tax_idr`
- `by_customer`: list of `{ customer_id, customer__name, orders, revenue_idr }` sorted by revenue descending
- `by_packaging`: list of `{ product_packaging_id, product_packaging__label, product_packaging__product__variant_name, total_quantity, revenue_idr }` sorted by revenue descending

Example:

```json
{
  "code": "success",
  "data": {
    "start_date": "2026-04-01",
    "end_date": "2026-04-30",
    "summary": {
      "verified_order_count": 42,
      "total_revenue_idr": 125000000,
      "total_subtotal_idr": 120000000,
      "total_tax_idr": 5000000
    },
    "by_customer": [],
    "by_packaging": []
  }
}
```

---

## 11) Dependency: PDF generation

Backend uses **ReportLab** (`reportlab` in `requirements.txt`) for invoice PDFs. Ensure dependencies are installed in deployment environments (`pip install -r requirements.txt`).
