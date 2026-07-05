# Backend CI/CD — Docker + GHCR + VPS

Production deploys follow a **build on GitHub Actions, run on VPS** pattern. The frontend on Vercel is unaffected.

## Flow

```
push to main (backend/**)
  → CI: ruff + django check + tests
  → Build backend/Dockerfile.prod
  → Push ghcr.io/<owner>/sejahtera-ims-api:<sha>
  → SSH to VPS → pull image → deploy-registry.sh
  → Health check → auto-rollback on failure
```

## Files

| File | Role |
|------|------|
| `.github/workflows/backend-production.yml` | CI/CD pipeline |
| `docker-compose.prod.yml` | `${APP_IMAGE}` for api, celery, celery-beat |
| `deploy/deploy-registry.sh` | Pull-based deploy with rollback |
| `deploy/lib/common.sh` | Shared deploy helpers |
| `deploy/deploy.sh` | One-time bootstrap (local build on VPS) |
| `deploy/update.sh` | Emergency fallback (rebuild on VPS) |

## One-time VPS setup

```bash
# 1. Clone monorepo
git clone https://github.com/RandyBrilliant/sejahtera-bersama-ims.git
cd sejahtera-bersama-ims/backend

# 2. Install Docker, firewall, swap
sudo ./deploy/setup.sh

# 3. Configure environment
cp env.example .env
nano .env   # SECRET_KEY, SQL_*, ALLOWED_HOSTS, CORS, etc.

# 4. First-time bootstrap (builds locally once)
sudo ./deploy/deploy.sh

# 5. SSL (after DNS points to server)
sudo ./deploy/ssl-setup.sh

# 6. Prevent git permission drift on shell scripts
git config core.fileMode false
```

## GitHub secrets

Repository → **Settings → Secrets and variables → Actions**:

| Secret | Example | Purpose |
|--------|---------|---------|
| `DO_HOST` | `203.0.113.10` | VPS IP or hostname |
| `DO_USERNAME` | `deploy` | SSH user (non-root, in `docker` group) |
| `DO_SSH_PORT` | `22` | SSH port |
| `DO_PROJECT_PATH` | `/home/deploy/sejahtera-bersama-ims/backend` | Absolute path to **backend** folder |
| `DO_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Deploy key private half |

Optional: `DO_SSH_PRIVATE_KEY_B64` (base64 of private key) if multiline secrets break on Windows.

GHCR auth uses the built-in `GITHUB_TOKEN` — no extra PAT needed for CI deploys.

### Generate deploy SSH key

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
cat deploy_key.pub    # → append to VPS ~/.ssh/authorized_keys for deploy user
# Private key → GitHub secret DO_SSH_PRIVATE_KEY
```

On the VPS, create a `deploy` user (recommended):

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys   # paste deploy_key.pub
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Clone the repo as `deploy` and set `DO_PROJECT_PATH` to the backend directory.

## Routine deploys

```bash
git push origin main
```

GitHub Actions handles build, push, and deploy. Frontend-only changes (outside `backend/**`) do not trigger a backend deploy.

## Manual registry deploy (rollback or CI bypass)

```bash
cd /path/to/sejahtera-bersama-ims/backend

# Deploy a specific commit image
APP_IMAGE=ghcr.io/randybrilliant/sejahtera-ims-api:<commit-sha> ./deploy/deploy-registry.sh

# Rollback to last known good
APP_IMAGE=$(cat .deploy-last-good-image) ./deploy/deploy-registry.sh
```

## Rollback

**Automatic:** `deploy-registry.sh` rolls back if health checks fail after a new image starts.

**Manual:** Use a previous image tag (`ghcr.io/.../sejahtera-ims-api:<sha>` from GitHub Actions logs).

Image rollback does **not** undo database migrations. Always commit Django migrations with code changes.

## Monitoring (recommended)

- **UptimeRobot** — `https://api.sejahterabersama.my.id/health/`, keyword `ok`
- **DigitalOcean Monitoring** — CPU/disk alerts on the droplet

## Troubleshooting

**`git pull` fails on VPS during deploy**

```bash
cd /path/to/sejahtera-bersama-ims
git config core.fileMode false
git status
git stash   # if needed
git pull origin main
```

**GHCR pull unauthorized (manual pull outside CI)**

```bash
echo <PAT-with-read:packages> | docker login ghcr.io -u <github-username> --password-stdin
```

**Health check fails after deploy**

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl -s http://127.0.0.1:8000/health/
cat .deploy-last-good-image
```
