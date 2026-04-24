# Operational Cash (Pemasukan & Pengeluaran) API Reference

Base URL:

- Local/dev: `http://localhost:8000`
- API prefix: `/api/expenses`

---

## 1) Purpose

Track **operational company cash**: **pemasukan** (`INCOME`) and **pengeluaran** (`EXPENSE`), in whole **Rupiah**, with categories, optional attachments, and date-range summaries.

This is separate from **inventory stock** and **purchase/sales order stock effects**, but entries may **optionally link** to a `SalesOrder` (pemasukan) or `PurchaseInOrder` (pengeluaran) for reporting—at most one link per row.

---

## 2) Auth & permissions

Uses **`FinanceAccess`** (same as other finance-sensitive areas):

- **Read** (`GET`, etc.): Admin, Finance, Warehouse, Sales, Owner
- **Write** (`POST`, `PUT`, `PATCH`, `DELETE`): Admin, Finance, Owner

---

## 3) Pagination

List endpoints: `page`, `page_size` (default 20, max 100), response shape `count`, `next`, `previous`, `results`.

---

## 4) Categories — `/api/expenses/categories/`

Each category is either **income** or **expense** (`entry_kind`). Entries must use a category whose `entry_kind` matches the entry `direction`.

Fields:

- `name`, `slug` (auto-generated on create if omitted), `entry_kind` (`INCOME` | `EXPENSE`)
- `description`, `sort_order`, `is_active`
- Audit: `created_at`, `updated_at`, `created_by`, `updated_by`

CRUD: standard ViewSet.

Filters: `entry_kind`, `is_active`, `slug`

Search: `name`, `slug`, `description`

Ordering: `name`, `sort_order`, `entry_kind`, `created_at`, `updated_at`

---

## 5) Cash entries — `/api/expenses/entries/`

Ledger lines for operational cash.

Fields:

- `direction`: `INCOME` (pemasukan) or `EXPENSE` (pengeluaran)
- `category` (ID): must be active and `category.entry_kind == direction`
- `amount_idr` (integer, ≥ 1)
- `occurred_on` (date)
- `description` (required)
- `reference` (optional string, e.g. invoice / PO)
- `sales_order` (optional ID): allowed only when `direction=INCOME`; read-only `sales_order_code`
- `purchase_in_order` (optional ID): allowed only when `direction=EXPENSE`; read-only `purchase_in_order_code`
- `attachment`: read-only in JSON; upload via dedicated endpoint

Filters: `direction`, `category`, `occurred_on`, `occurred_on_from`, `occurred_on_to`, `created_by`, `sales_order`, `purchase_in_order`

Search: `description`, `reference`, `category__name`, `sales_order__order_code`, `purchase_in_order__order_code`

Ordering: `occurred_on`, `amount_idr`, `direction`, `created_at`, `updated_at`

### Upload attachment (bukti / lampiran)

- **POST** `/api/expenses/entries/{id}/upload-attachment/`
- `Content-Type: multipart/form-data`
- Field name: **`attachment`** (file)

---

## 6) Summary — `/api/expenses/summary/`

- **GET** `/api/expenses/summary/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- Same **Finance** permission rules as above.

Returns `code` + `data`:

- `income`: `{ total_idr, line_count }` for `direction=INCOME` in range
- `expense`: `{ total_idr, line_count }` for `direction=EXPENSE` in range
- `net_cash_idr`: income total minus expense total
- `by_category`: grouped rows with `category_id`, `category__name`, `direction`, `total_idr`, `lines`

---

## 7) Full report — `/api/expenses/report/`

- **GET** `/api/expenses/report/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=json`
- Query **`format`**: `json` (default), `csv`, or `pdf`.
- Same **Finance** permission rules as other expenses endpoints.

**JSON** (`format=json`): `data` includes the summary fields plus:

- `by_day`: per-date `income_idr`, `expense_idr`, `net_idr`
- `linked_breakdown`: counts/totals for rows linked to sales orders, purchase-in orders, both neither, and invalid (should be zero)
- `entries`: up to **500** entry rows (same shape as list serializer fields relevant to reporting)

**CSV** (`format=csv`): UTF-8 with BOM; one row per entry (includes order codes and creator username).

**PDF** (`format=pdf`): downloadable attachment; summary, daily totals, and a truncated detail table.

---

## 8) Seed default categories

From the backend project root (with Django settings loaded):

```bash
python manage.py seed_operational_categories
```

Idempotent: skips categories whose `slug` already exists.

---

## 9) Industry notes

- **Single ledger table** with `direction` keeps reporting simple and indexed for range queries.
- **`PROTECT`** on category prevents deleting categories that still have entries.
- **Whole IDR** amounts match other modules (`base_price_idr`, order totals).
- For **double-entry** accounting or GL posting, extend later with journal links; this module stays **operational cashbook** level.
- **Order FKs** use `SET_NULL` if the order is deleted; the check constraint enforces **at most one** of `sales_order` / `purchase_in_order`.
