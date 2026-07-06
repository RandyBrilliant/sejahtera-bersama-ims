# Contributing

Thanks for helping improve Sejahtera Bersama IMS. This guide covers local setup and the checks we run before merging.

## Prerequisites

- **Backend:** Python 3.12+, PostgreSQL (or Docker Compose for local stack)
- **Frontend:** Node.js 20+ and npm
- **Git hooks:** [pre-commit](https://pre-commit.com/)

## First-time setup

```bash
# Install pre-commit (once per machine)
pip install pre-commit   # or: brew install pre-commit

# Enable hooks in this repo
pre-commit install
```

Hooks run automatically on `git commit`. To run them manually on all files:

```bash
pre-commit run --all-files
```

### What the hooks do

| Hook | Scope |
|------|--------|
| **ruff** / **ruff-format** | Python in `backend/` |
| **frontend-eslint** | `npm run lint` in `frontend/` when `frontend/src/` changes |

CI also runs `pip-audit` (backend) and `npm audit` (frontend) — fix high-severity issues when practical.

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env   # edit DATABASE_URL, SECRET_KEY, etc.
python manage.py migrate
python manage.py runserver
```

Run tests:

```bash
cd backend && python manage.py test
```

## Frontend

```bash
cd frontend
npm ci
cp .env.example .env   # set VITE_API_BASE_URL if needed
npm run dev
```

Lint and typecheck:

```bash
cd frontend && npm run lint && npm run build
```

## Pull requests

- Keep changes focused; one concern per PR when possible.
- Match existing naming, serializers, and API envelope style (`success_response` / `{ code, data }`).
- Do not commit secrets (`.env`, `.backup-s3.env`, credentials).
- Describe **why** in the PR summary and note any deploy steps (migrations, env vars, nginx reload).

## Deploy notes

Production deploys use GitHub Actions → container registry → `backend/deploy/deploy-registry.sh` on the VPS. See `backend/deploy/` for backup, nginx, and environment examples.
