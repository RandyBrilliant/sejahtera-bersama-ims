# Sejahtera Bersama IMS - Project Overview

## Purpose

Sejahtera Bersama IMS is an inventory and business operations management system that combines:
- account and role management,
- inventory and production tracking,
- purchase/sales order workflows,
- operational expense management,
- reporting and document generation.

The system is split into a Django REST backend and a React frontend.

## Repository Structure

- `backend/`: Django API, business logic, data models, deployment scripts, Docker runtime definitions, API references.
- `frontend/`: Vite + React + TypeScript web client (currently starter-level scaffold).

## Backend Overview

### Stack

- Django + Django REST Framework
- PostgreSQL
- Redis
- Celery + Celery Beat (infrastructure configured)
- JWT authentication (`djangorestframework-simplejwt`)
- Gunicorn + Nginx (production)
- Docker Compose (local and production variants)

### Main Django Apps

- `account`: custom user model, employee profile, auth endpoints, role-based permissions.
- `inventory`: products, ingredients, stock tracking, stock movement logs, production batches, inventory reports.
- `purchase`: customers, customer pricing, purchase/sales orders, payment verification flow, invoices and revenue reports.
- `expenses`: operational expense categories/entries and reporting.

### Backend Runtime and Operations

- API routes are namespaced by domain under `/api/...`.
- Health endpoint is available at `/health/` and includes database/cache checks.
- Deployment and operation documents are available in `backend/deploy/`.
- Production includes Nginx SSL/rate-limiting and Dockerized services.

## Frontend Overview

### Stack

- React 19 + TypeScript
- Vite build tool
- ESLint configuration

### Current State

- Frontend is still at scaffold/template stage.
- Single-page `App` component with default starter content.
- No routing, no API integration layer, no app state architecture, and no tests yet.

## Functional Coverage Snapshot

Implemented strongly in backend:
- role-based auth and JWT flows,
- core inventory and production domain modeling,
- order/payment/verification workflows,
- reporting and export/PDF capabilities.

Still early in frontend:
- app shell, features, and user workflows are not implemented to match backend capabilities.

## Engineering Maturity Snapshot

Strengths:
- strong backend domain modularization,
- good use of transactions/locking in critical stock workflows,
- production-oriented deployment documentation and Docker setup.

Gaps:
- automated testing coverage is minimal across backend/frontend,
- CI/CD quality gates are not established,
- some documentation and environment templates are missing at repository level.

## Recommended Direction

Use this codebase as a strong backend core, then complete the product by:
1. building a production frontend architecture and API integration layer,
2. introducing CI + tests as non-negotiable quality gates,
3. tightening operational/security defaults and observability.
