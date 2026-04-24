# Inventory API Reference (Frontend Guide)

Base URL:

- Local/dev: `http://localhost:8000`
- API prefix: `/api/inventory`

Full base endpoint: `http://localhost:8000/api/inventory`

---

## 1) Auth & Response Format

All inventory endpoints require authenticated user (`IsAuthenticated`).

The project uses:

- Cookie JWT auth for web (`credentials: "include"`)
- Bearer token auth for API/mobile (`Authorization: Bearer <access_token>`)

### Success payload

```json
{
  "code": "success",
  "detail": "Optional message",
  "data": {}
}
```

### Error payload

```json
{
  "detail": "Data tidak valid. Periksa field yang dilampirkan.",
  "code": "validation_error",
  "errors": {
    "field_name": ["error message"]
  }
}
```

---

## 2) Data Model Overview

### Product domain (bawang goreng)

- `Product`: master per bawang goreng variant/type (`variant_name`)
- `ProductPackaging`: packaging per product variant (mass, stock, base purchase price in IDR)

### Ingredient domain

- `Ingredient`: master bahan baku (tepung, minyak, bawang, plastik, kotak)
- `IngredientInventory`: stock snapshot per ingredient

Audit fields available in all resources:

- `created_at`, `updated_at`
- `created_by`, `updated_by` (mini user object)

---

## 3) Endpoints

## 3.1 Inventory Summary

- **GET** `/api/inventory/summary/`
- Auth required: **Yes**

Returns aggregated calculations for dashboard:

```json
{
  "code": "success",
  "data": {
    "products": {
      "total_packaging": 6,
      "active_packaging": 5,
      "total_product_stock": "215.500",
      "total_product_stock_value_idr": "17325000.000"
    },
    "ingredients": {
      "total_ingredient_items": 8,
      "low_stock_items": 2,
      "total_ingredient_stock": "482.000"
    }
  }
}
```

### Daily recap by production date

- **GET** `/api/inventory/summary/daily/?date=YYYY-MM-DD`
- Auth required: **Yes**

Returns grouped recap for one date:

- total ingredients used (grouped by ingredient)
- total packages produced (grouped by packaging)
- total bonus packages
- estimated production value in IDR

Example response:

```json
{
  "code": "success",
  "data": {
    "date": "2026-04-24",
    "summary": {
      "total_ingredients_used": "31.500",
      "total_packages_produced": "200.000",
      "total_bonus_packages": "5.000",
      "total_packages_output": "205.000",
      "estimated_production_value_idr": "3125000.000"
    },
    "ingredient_usage": [
      {
        "ingredient_inventory": 1,
        "ingredient_name": "Bawang",
        "unit": "KG",
        "total_used": "25.000"
      }
    ],
    "packaging_output": [
      {
        "product_packaging": 4,
        "variant_name": "Original",
        "packaging_label": "Pouch 250g",
        "base_price_idr": 15000,
        "total_produced": "120.000",
        "total_bonus": "5.000",
        "total_output": "125.000",
        "estimated_value_idr": "1875000.000"
      }
    ]
  }
}
```

### Range recap for reporting

- **GET** `/api/inventory/summary/range/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- Auth required: **Yes**
- Recommended for finance/admin/owner periodic reporting.

Returns grouped totals in selected range:

- total batches
- total ingredients used
- total produced packages
- total bonus packages
- total output packages
- estimated production value in IDR

Example response:

```json
{
  "code": "success",
  "data": {
    "start_date": "2026-04-01",
    "end_date": "2026-04-30",
    "summary": {
      "total_batches": 22,
      "total_ingredients_used": "655.500",
      "total_packages_produced": "5100.000",
      "total_bonus_packages": "140.000",
      "total_packages_output": "5240.000",
      "estimated_production_value_idr": "81200000.000"
    },
    "ingredient_usage": [
      {
        "ingredient_inventory": 1,
        "ingredient_name": "Bawang",
        "unit": "KG",
        "total_used": "420.000"
      }
    ],
    "packaging_output": [
      {
        "product_packaging": 4,
        "variant_name": "Original",
        "packaging_label": "Pouch 250g",
        "base_price_idr": 15000,
        "total_produced": "2100.000",
        "total_bonus": "65.000",
        "total_output": "2165.000",
        "estimated_value_idr": "32475000.000"
      }
    ]
  }
}
```

---

## 3.2 Products (`/api/inventory/products/`)

CRUD:

- `GET /`
- `POST /`
- `GET /{id}/`
- `PUT /{id}/`
- `PATCH /{id}/`
- `DELETE /{id}/`

Search:

- `search` on `name`, `variant_name`

Ordering:

- `ordering=name|variant_name|created_at|updated_at`

Filtering examples:

- `?is_active=true`
- `?variant_name__icontains=pedas`
- `?created_by=1`
- `?created_at_from=2026-04-01T00:00:00Z`
- `?created_at_to=2026-04-30T23:59:59Z`

Create example:

```json
{
  "name": "Bawang Goreng",
  "variant_name": "Original",
  "is_active": true
}
```

### Product packaging summary

- **GET** `/api/inventory/products/{id}/packaging-summary/`

Returns:

```json
{
  "code": "success",
  "data": {
    "total_packaging": 3,
    "active_packaging": 3,
    "total_stock": "125.000",
    "stock_value_idr": "9375000.000"
  }
}
```

---

## 3.3 Product Packaging (`/api/inventory/product-packaging/`)

CRUD:

- `GET /`
- `POST /`
- `GET /{id}/`
- `PUT /{id}/`
- `PATCH /{id}/`
- `DELETE /{id}/`

Search:

- `search` on `label`, `sku`, `product__name`, `product__variant_name`

Ordering:

- `ordering=label|net_mass_grams|remaining_stock|base_price_idr|created_at|updated_at`

Filtering examples:

- `?product=3`
- `?is_active=true`
- `?sku__icontains=BG-ORG`
- `?net_mass_grams__gte=250`
- `?base_price_idr__lte=50000`
- `?min_remaining_stock=10`
- `?max_remaining_stock=100`

Create example:

```json
{
  "product": 3,
  "label": "Pouch 250g",
  "net_mass_grams": 250,
  "remaining_stock": "50.000",
  "base_price_idr": 18000,
  "sku": "BG-ORG-250",
  "is_active": true
}
```

Response includes computed:

- `stock_value_idr` = `remaining_stock * base_price_idr`

---

## 3.4 Ingredients (`/api/inventory/ingredients/`)

CRUD:

- `GET /`
- `POST /`
- `GET /{id}/`
- `PUT /{id}/`
- `PATCH /{id}/`
- `DELETE /{id}/`

Search:

- `search` on `name`

Ordering:

- `ordering=name|created_at|updated_at`

Filtering examples:

- `?default_unit=KG`
- `?is_active=true`
- `?name__icontains=bawang`

Create example:

```json
{
  "name": "Bawang",
  "default_unit": "KG",
  "is_active": true
}
```

---

## 3.5 Ingredient Inventory (`/api/inventory/ingredient-inventory/`)

CRUD:

- `GET /`
- `POST /`
- `GET /{id}/`
- `PUT /{id}/`
- `PATCH /{id}/`
- `DELETE /{id}/`

Search:

- `search` on `ingredient__name`

Ordering:

- `ordering=remaining_stock|minimum_stock|created_at|updated_at`

Filtering examples:

- `?ingredient=1`
- `?minimum_stock__gte=10`
- `?min_remaining_stock=20`
- `?max_remaining_stock=100`
- `?is_below_minimum=true`

Create example:

```json
{
  "ingredient": 1,
  "remaining_stock": "120.000",
  "minimum_stock": "25.000"
}
```

Response includes computed:

- `is_below_minimum` boolean

---

## 3.6 Ingredient Stock Movements (`/api/inventory/ingredient-stock-movements/`)

Use this ledger for manual stock in/out ingredient adjustments. Every create updates ingredient stock automatically.

Methods:

- `GET /`
- `POST /`
- `GET /{id}/`

Write note:

- Update/delete are intentionally disabled (ledger is immutable).

Create example:

```json
{
  "ingredient_inventory": 2,
  "movement_type": "OUT",
  "quantity": "5.000",
  "note": "Pemakaian tambahan untuk produksi",
  "movement_at": "2026-04-24T16:00:00Z"
}
```

Business rules:

- `OUT` cannot exceed current stock.
- Creating movement auto-updates `ingredient_inventory.remaining_stock`.

---

## 3.7 Product Stock Movements (`/api/inventory/product-stock-movements/`)

Use this ledger for manual product stock in/out adjustments. Every create updates product packaging stock automatically.

Methods:

- `GET /`
- `POST /`
- `GET /{id}/`

Create example:

```json
{
  "product_packaging": 7,
  "movement_type": "IN",
  "quantity": "20.000",
  "bonus_quantity": "2.000",
  "note": "Penyesuaian hasil produksi bonus",
  "movement_at": "2026-04-24T17:00:00Z"
}
```

Business rules:

- `OUT` cannot exceed current stock.
- `bonus_quantity` only allowed for `IN`.
- For `IN`, stock increment = `quantity + bonus_quantity`.

---

## 3.8 Production Batches (`/api/inventory/production-batches/`)

This is the daily staff input endpoint:

- ingredient used
- packages produced
- bonus packages produced

Methods:

- `GET /`
- `POST /`
- `GET /{id}/`

### Create daily production batch

```json
{
  "production_date": "2026-04-24",
  "shift_label": "Shift Pagi",
  "note": "Produksi reguler",
  "ingredient_usages_input": [
    { "ingredient_inventory": 1, "quantity_used": "25.000" },
    { "ingredient_inventory": 2, "quantity_used": "6.500" }
  ],
  "packaging_outputs_input": [
    { "product_packaging": 4, "quantity_produced": "120.000", "bonus_quantity": "5.000" },
    { "product_packaging": 5, "quantity_produced": "80.000", "bonus_quantity": "0.000" }
  ]
}
```

Automatic processing on create (single transaction):

1. Deduct ingredient stocks (`OUT`)
2. Add product packaging stocks (`IN` + bonus)
3. Write ingredient movement logs
4. Write product movement logs

Validation rules:

- Minimum one ingredient usage and one packaging output.
- No duplicate ingredient/packaging row in one batch.
- Ingredient stock must be sufficient.

Role usage guidance:

- Warehouse/Admin/Owner: create production input (write access)
- Finance/Sales: monitor and report (read-only)

---

## 4) Notes for Frontend

- List endpoints use page-number pagination:
  - Query params: `page`, `page_size`
  - Default `page_size`: `20`
  - Maximum `page_size`: `100`
- Pagination response format:

```json
{
  "count": 125,
  "next": "http://localhost:8000/api/inventory/products/?page=2",
  "previous": null,
  "results": []
}
```

- Use pagination params (`page`, `page_size`) for list endpoints.
- Keep all numeric stock values as strings when using decimals in JSON.
- Price uses integer Rupiah (`base_price_idr`) with no decimal.
- `created_by`/`updated_by` are auto-filled by backend from current auth user.
