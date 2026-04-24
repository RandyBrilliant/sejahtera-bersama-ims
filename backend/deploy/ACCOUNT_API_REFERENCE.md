# Account API Reference (Frontend Guide)

Base URL:

- Local/dev: `http://localhost:8000`
- API prefix: `/api/account`

Full base endpoint: `http://localhost:8000/api/account`

---

## 1) Auth Model

This backend supports both:

- **Cookie auth (web frontend)** via HTTP-only cookies set by login/refresh
- **Bearer token auth (mobile/API clients)** via `Authorization: Bearer <access_token>`

Authentication class order:

1. Cookie-aware JWT auth
2. Standard JWT bearer auth
3. Session auth

So for web frontend, you can rely on cookies after login and call API with `credentials: "include"`.

### Cookies used

From current settings, token cookie keys are:

- Access cookie: `ims_access` (or `JWT_ACCESS_COOKIE_NAME` env)
- Refresh cookie: `ims_refresh` (or `JWT_REFRESH_COOKIE_NAME` env)

---

## 2) Standard Response Format

### Success

```json
{
  "code": "success",
  "detail": "Optional message",
  "data": {}
}
```

### Error

```json
{
  "detail": "Human readable message",
  "code": "validation_error",
  "errors": {
    "field_name": ["error message"]
  }
}
```

Common error codes:

- `validation_error`
- `not_found`
- `permission_denied`
- `method_not_allowed`
- `delete_not_allowed`
- `already_deactivated`
- `already_activated`
- `profile_updated`
- `reset_password_success`

---

## 3) Roles

Possible user role values:

- `ADMIN`
- `WAREHOUSE_STAFF`
- `SALES_STAFF`
- `FINANCE_STAFF`
- `LEADERSHIP` (owner-level access)

Notes:

- `LEADERSHIP` and Django `superuser` are treated as owner.
- Only owner can assign `LEADERSHIP` role to users.

---

## 4) Endpoints

## 4.1 Auth - Login

- **POST** `/api/account/auth/login/`
- Auth required: **No**
- Throttled: **Yes** (`auth` scope)

Request body:

```json
{
  "username": "admin",
  "password": "your-password"
}
```

Success `200`:

```json
{
  "code": "success",
  "detail": "Login berhasil.",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "full_name": "Admin User",
      "role": "ADMIN",
      "is_active": true
    },
    "access": "<jwt_access>",
    "refresh": "<jwt_refresh>"
  }
}
```

Error `401`:

```json
{
  "detail": "Username atau password salah.",
  "code": "permission_denied"
}
```

Frontend notes:

- Web app: save nothing manually if you rely on cookies; server already sets cookie.
- Mobile/API: use returned `access`/`refresh` directly.

---

## 4.2 Auth - Refresh Token

- **POST** `/api/account/auth/refresh/`
- Auth required: **No**
- Throttled: **Yes** (`auth` scope)

Refresh token source:

- Preferred: refresh cookie
- Optional fallback: request body `{ "refresh": "..." }`

Request body (optional):

```json
{
  "refresh": "<jwt_refresh>"
}
```

Success `200`:

```json
{
  "code": "success",
  "detail": "Token diperbarui.",
  "data": {
    "access": "<new_access>",
    "refresh": "<new_refresh_optional>"
  }
}
```

Error `401`:

```json
{
  "detail": "Refresh token tidak ditemukan. Kirim dalam cookie atau body.",
  "code": "permission_denied"
}
```

---

## 4.3 Auth - Logout

- **POST** `/api/account/auth/logout/`
- Auth required: **No**

Success `200`:

```json
{
  "code": "success",
  "detail": "Logout berhasil."
}
```

Behavior:

- Clears access and refresh cookies.

---

## 4.4 Auth - Change Password

- **POST** `/api/account/auth/change-password/`
- Auth required: **Yes**
- Throttled: **Yes** (`auth` scope)

Request body:

```json
{
  "old_password": "old-password",
  "new_password": "new-strong-password"
}
```

Success `200`:

```json
{
  "code": "reset_password_success",
  "detail": "Kata sandi berhasil diatur ulang."
}
```

Validation error `400`:

```json
{
  "detail": "Data tidak valid. Periksa field yang dilampirkan.",
  "code": "validation_error",
  "errors": {
    "old_password": ["Password lama wajib diisi."],
    "new_password": ["Password baru wajib diisi."]
  }
}
```

---

## 4.5 Auth - Change Password for Other User (Admin/Leadership)

- **POST** `/api/account/auth/change-password-user/`
- Auth required: **Yes**
- Throttled: **Yes** (`auth` scope)
- Permission: **ADMIN** or owner (`LEADERSHIP`/superuser)

Request body:

```json
{
  "user_id": 12,
  "new_password": "NewStrongPassword123!"
}
```

Success `200`:

```json
{
  "code": "reset_password_for_user_success",
  "detail": "Kata sandi pengguna berhasil diatur ulang.",
  "data": {
    "user": {
      "id": 12,
      "username": "warehouse01",
      "full_name": "Warehouse Staff",
      "role": "WAREHOUSE_STAFF",
      "is_active": true
    }
  }
}
```

Validation error `400` examples:

```json
{
  "detail": "Data tidak valid. Periksa field yang dilampirkan.",
  "code": "validation_error",
  "errors": {
    "user_id": ["ID pengguna wajib diisi."],
    "new_password": ["Password baru wajib diisi."]
  }
}
```

Not found `404`:

```json
{
  "detail": "Resource tidak ditemukan.",
  "code": "not_found",
  "errors": {
    "user_id": ["Pengguna tidak ditemukan."]
  }
}
```

Forbidden `403`:

```json
{
  "detail": "Anda tidak memiliki izin untuk aksi ini.",
  "code": "permission_denied"
}
```

---

## 4.6 Current User - Me

- **GET** `/api/account/me/`
- Auth required: **Yes**

Success `200`:

```json
{
  "code": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "full_name": "Admin User",
    "role": "ADMIN",
    "phone_number": "08123456789",
    "is_active": true
  }
}
```

### Update own basic profile

- **PATCH** `/api/account/me/`
- Updatable fields: `full_name`, `phone_number`

Request body:

```json
{
  "full_name": "New Name",
  "phone_number": "0812000000"
}
```

Success `200`:

```json
{
  "code": "profile_updated",
  "detail": "Profil berhasil diperbarui.",
  "data": {
    "id": 1,
    "username": "admin",
    "full_name": "New Name",
    "role": "ADMIN",
    "phone_number": "0812000000",
    "is_active": true
  }
}
```

Error `400` (if no allowed field provided):

```json
{
  "detail": "Data tidak valid. Periksa field yang dilampirkan.",
  "code": "validation_error",
  "errors": {
    "non_field_errors": ["No updatable fields were provided."]
  }
}
```

---

## 4.7 Users

Resource base: `/api/account/users/`

Permission:

- Requires authenticated + `ADMIN` or owner (`LEADERSHIP`/superuser)

HTTP methods:

- Allowed: `GET`, `POST`, `PUT`, `PATCH`
- Delete is blocked and returns `405`

### Fields

Response object:

- `id` (number)
- `username` (string)
- `full_name` (string)
- `role` (enum role string)
- `phone_number` (string, may be empty)
- `is_active` (boolean)
- `date_joined` (datetime)
- `last_login` (datetime or null)
- `created_at` (datetime)
- `updated_at` (datetime)
- `employee_profile` (object or null)

Write fields:

- `username` (required on create)
- `password` (required on create, optional on update)
- `full_name` (required on create)
- `role` (optional; default `WAREHOUSE_STAFF`)
- `phone_number` (optional)
- `is_active` (optional)

### List users

- **GET** `/api/account/users/`

Query params:

- `search`: search on `username`, `full_name`, `phone_number`
- `ordering`: `username`, `full_name`, `created_at`, `updated_at`, `date_joined`
- `page`: page number
- `page_size`: max `100`

Pagination format:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "username": "admin",
      "full_name": "Admin User",
      "role": "ADMIN",
      "phone_number": "",
      "is_active": true,
      "date_joined": "2026-04-01T10:00:00Z",
      "last_login": null,
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z",
      "employee_profile": null
    }
  ]
}
```

### Create user

- **POST** `/api/account/users/`

Request:

```json
{
  "username": "warehouse01",
  "password": "StrongPass123!",
  "full_name": "Warehouse Staff",
  "role": "WAREHOUSE_STAFF",
  "phone_number": "08123456789"
}
```

Notes:

- If `password` missing on create -> validation error.
- Username is normalized to lowercase and must be unique (case-insensitive).
- Non-owner cannot set role to `LEADERSHIP`.

### Retrieve user

- **GET** `/api/account/users/{id}/`

### Update user

- **PUT/PATCH** `/api/account/users/{id}/`

If `password` is included on update, backend will hash and replace it.

### Deactivate user

- **POST** `/api/account/users/{id}/deactivate/`

Success:

```json
{
  "code": "deactivated",
  "detail": "Akun berhasil dinonaktifkan.",
  "data": {
    "...": "updated user payload"
  }
}
```

### Activate user

- **POST** `/api/account/users/{id}/activate/`

Success:

```json
{
  "code": "activated",
  "detail": "Akun berhasil diaktifkan kembali.",
  "data": {
    "...": "updated user payload"
  }
}
```

### Delete user (not allowed)

- **DELETE** `/api/account/users/{id}/`
- Always returns `405`:

```json
{
  "detail": "Penghapusan tidak diizinkan. Gunakan aksi deactivate untuk menonaktifkan akun.",
  "code": "delete_not_allowed"
}
```

---

## 4.8 Employee Profiles

Resource base: `/api/account/employee-profiles/`

HTTP methods:

- Allowed: `GET`, `POST`, `PUT`, `PATCH`
- Delete is blocked and returns `405`

Permissions:

- Any authenticated user can access endpoint.
- Data visibility:
  - Owner/Admin can see all profiles.
  - Non-owner/non-admin can only see their own profile.

### Fields

Response object:

- `id` (number)
- `user` (object)
  - `id`, `username`, `full_name`, `role`, `is_active`
- `employee_code` (string, auto-generated, read-only)
- `joined_date` (date or null)
- `created_at` (datetime)
- `updated_at` (datetime)

Write fields:

- `user_id` (optional)
- `joined_date` (optional)

Notes:

- `employee_code` is auto-generated using role prefix:
  - `ADM`, `WH`, `SAL`, `FIN`, `LDR`
- Non-admin/non-owner cannot set `user_id` to someone else.

### List employee profiles

- **GET** `/api/account/employee-profiles/`

Query params:

- `search`: `employee_code`, `user__username`, `user__full_name`
- `ordering`: `employee_code`, `joined_date`, `created_at`, `updated_at`
- `page`, `page_size` (max 100)

### Create employee profile

- **POST** `/api/account/employee-profiles/`

Admin/owner request:

```json
{
  "user_id": 12,
  "joined_date": "2026-04-24"
}
```

Non-admin/non-owner:

- `user_id` is effectively forced to current authenticated user.

### Retrieve employee profile

- **GET** `/api/account/employee-profiles/{id}/`

### Update employee profile

- **PUT/PATCH** `/api/account/employee-profiles/{id}/`

### Deactivate profile user

- **POST** `/api/account/employee-profiles/{id}/deactivate/`

### Activate profile user

- **POST** `/api/account/employee-profiles/{id}/activate/`

Both return same structure as users activate/deactivate, but with employee profile payload in `data`.

### Delete profile (not allowed)

- **DELETE** `/api/account/employee-profiles/{id}/`
- Returns `405` with `code: "delete_not_allowed"`.

---

## 5) Frontend Integration Checklist

For browser frontend:

1. Call login endpoint with `credentials: "include"`.
2. Store only user profile in app state (not required to store tokens if using cookies).
3. Include `credentials: "include"` on every authenticated request.
4. On `401`, call refresh endpoint, then retry original request once.
5. On logout, call logout endpoint and clear frontend auth state.

For mobile/native app:

1. Use `access` token from login response in Bearer header.
2. Keep `refresh` token securely.
3. Refresh when access expires.

---

## 6) Important Notes for Frontend

- Most auth/user messages are in Indonesian.
- Throttling is enabled for auth endpoints; repeated failures can return 429.
- `/api/account/users/` is restricted to admin/owner only.
- Delete actions are intentionally blocked; use `deactivate` endpoints instead.
- If using cookie auth across domains, ensure frontend and backend CORS/cookie settings are aligned in environment config.

