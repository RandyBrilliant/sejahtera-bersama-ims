# Database Backup — Nevacloud Object Storage (S3)

Automated daily PostgreSQL backups to **Nevacloud Object Storage** (S3-compatible), running at **midnight WIB (Asia/Jakarta)**, with **30-day retention** and **private access only**.

---

## What gets backed up

| Item | Detail |
|------|--------|
| Database | Full `pg_dump` of `SQL_DATABASE` (from `.env`) |
| Format | Compressed `.sql.gz` |
| Schedule | Every day at `00:00` Asia/Jakarta |
| Retention | 30 days (older files deleted automatically) |
| Storage | `s3://<bucket>/<prefix>/` on Nevacloud |
| Access | Private — no public ACL on uploaded objects |

Local staging uses `/var/backups/sejahtera-ims/` only during upload; the file is removed after a successful S3 upload.

---

## Part 1 — Nevacloud portal setup

Do this in the [Nevacloud dashboard](https://console.nevacloud.com/) before configuring the server.

### 1. Create Object Storage

1. Open **Object Storage** (Nevaobjects).
2. Create a new storage instance (minimum **10 GB**).
3. Note the storage label — you will create a bucket inside it.

### 2. Create a private bucket

1. Inside your Object Storage, click **Create Bucket**.
2. Bucket name: lowercase, no spaces (e.g. `sejahtera-ims-backups`).
3. **Do not** enable public access or public read policy.
4. Keep the bucket **private** — only your access key should read/write objects.

> **Security:** Never enable "public read" on this bucket. Payment proofs and DB dumps must stay private.

### 3. Create access keys

1. Go to **Access Keys** in the Object Storage section.
2. Create a new key (e.g. `ims-db-backup`).
3. **Save the Access Key ID and Secret Key immediately** — the secret is shown only once.

Recommended permissions (if Nevacloud offers scoped policies):

- `ListBucket` on your bucket
- `PutObject`, `GetObject`, `DeleteObject` on `sejahtera-ims/db-backups/*`

If only full-access keys are available, use a dedicated key used **only** for backups.

### 4. Note your endpoint

Nevacloud S3 endpoint (default):

```
https://s3.nevaobjects.id
```

Region for AWS CLI compatibility:

```
ap-southeast-1
```

---

## Part 2 — Server configuration

SSH into your production VPS (where Docker and `ims-db` run).

### 1. Install AWS CLI and cron (one-time)

```bash
cd /path/to/backend
sudo ./deploy/install-backup-cron.sh
```

This installs `awscli`, creates log paths, and registers the midnight cron job.

### 2. Create backup credentials file

**Do not** put S3 keys in `.env` — that file is passed to Docker containers.

```bash
cd /path/to/backend
cp deploy/env.backup-s3.example .backup-s3.env
chmod 600 .backup-s3.env
nano .backup-s3.env
```

Fill in these values:

| Variable | What to put |
|----------|-------------|
| `BACKUP_S3_BUCKET` | Bucket name from step 2 above (e.g. `sejahtera-ims-backups`) |
| `BACKUP_S3_ACCESS_KEY_ID` | Access key from Nevacloud |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Secret key from Nevacloud |
| `BACKUP_S3_ENDPOINT` | `https://s3.nevaobjects.id` |
| `BACKUP_S3_REGION` | `ap-southeast-1` |
| `BACKUP_S3_PREFIX` | `sejahtera-ims/db-backups` (folder inside bucket) |
| `BACKUP_RETENTION_DAYS` | `30` |

Your `.env` must already have correct database settings (used for `pg_dump`):

```env
SQL_DATABASE=sejahteraims
SQL_USER=postgres
SQL_PASSWORD=...
```

### 3. Test backup manually

```bash
cd /path/to/backend
./deploy/backup-db-to-s3.sh
```

Expected log output (`logs/backup-s3.log`):

```
[INFO] S3 access OK
[INFO] Starting pg_dump for database 'sejahteraims'
[INFO] Uploading to s3://your-bucket/sejahtera-ims/db-backups/...
[INFO] Upload complete (private object, no public ACL)
[INFO] Retention prune finished — deleted 0 object(s)
[INFO] === Database backup finished successfully ===
```

Verify in Nevacloud portal: bucket → prefix folder → `.sql.gz` file present.

### 4. Confirm cron is scheduled

```bash
crontab -l
```

You should see:

```
0 0 * * * TZ=Asia/Jakarta /path/to/backend/deploy/backup-db-to-s3.sh >> /var/log/sejahtera-ims-backup.log 2>&1
```

---

## Part 3 — Checklist (what you must configure)

Use this checklist after deploying the code:

- [ ] **Nevacloud Object Storage** created (≥ 10 GB)
- [ ] **Private bucket** created (no public access)
- [ ] **Access key** created and secret saved securely
- [ ] **`.backup-s3.env`** created on VPS with `chmod 600`
- [ ] **`BACKUP_S3_BUCKET`** matches bucket name exactly
- [ ] **`BACKUP_S3_ACCESS_KEY_ID`** and **`BACKUP_S3_SECRET_ACCESS_KEY`** set
- [ ] **`BACKUP_S3_ENDPOINT`** = `https://s3.nevaobjects.id`
- [ ] **`BACKUP_RETENTION_DAYS`** = `30`
- [ ] **`.env`** has correct `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`
- [ ] **`sudo ./deploy/install-backup-cron.sh`** run once
- [ ] **Manual test** `./deploy/backup-db-to-s3.sh` succeeds
- [ ] **Verify object** appears in Nevacloud bucket (private)
- [ ] **`crontab -l`** shows midnight job

---

## Logs

| Log | Purpose |
|-----|---------|
| `logs/backup-s3.log` | Detailed backup script log |
| `/var/log/sejahtera-ims-backup.log` | Cron stdout/stderr (when installed as root) |

```bash
tail -f /var/log/sejahtera-ims-backup.log
tail -f /path/to/backend/logs/backup-s3.log
```

---

## Restore from backup

### 1. Download a backup

```bash
aws s3 cp s3://YOUR_BUCKET/sejahtera-ims/db-backups/sejahteraims-YYYYMMDD-HHMMSS.sql.gz ./restore.sql.gz \
  --endpoint-url https://s3.nevaobjects.id \
  --region ap-southeast-1
```

Set credentials first:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

Or load from `.backup-s3.env`:

```bash
set -a && source .backup-s3.env && set +a
```

### 2. List available backups

```bash
aws s3 ls s3://YOUR_BUCKET/sejahtera-ims/db-backups/ \
  --endpoint-url https://s3.nevaobjects.id
```

### 3. Restore into Postgres container

**Warning:** This replaces the current database. Stop the API first to avoid active connections.

```bash
cd /path/to/backend
docker compose -f docker-compose.prod.yml stop api celery celery-beat

gunzip -c restore.sql.gz | docker exec -i ims-db psql -U postgres -d sejahteraims

docker compose -f docker-compose.prod.yml start api celery celery-beat
```

Adjust `-U` and `-d` to match your `SQL_USER` and `SQL_DATABASE`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `AWS CLI not found` | Run `sudo apt-get install -y awscli` or `sudo ./deploy/install-backup-cron.sh` |
| `Cannot access bucket` | Check bucket name, keys, and endpoint URL |
| `Database container not running` | `docker compose -f docker-compose.prod.yml up -d db` |
| `pg_dump failed` | Verify `SQL_USER` / `SQL_PASSWORD` in `.env` match the running Postgres volume |
| Cron not running | `sudo systemctl status cron`; check `crontab -l` |
| Wrong timezone | Cron uses `TZ=Asia/Jakarta`; adjust in `install-backup-cron.sh` if needed |

---

## Security notes

1. **`.backup-s3.env`** is gitignored (via `.env.*` pattern). Never commit it.
2. S3 uploads use **no public ACL** — objects are private by default.
3. Keep the Nevacloud bucket **private** in the portal.
4. Rotate access keys periodically; update `.backup-s3.env` after rotation.
5. Test restore at least once per quarter to confirm backups are valid.

---

## Optional: lifecycle rule in Nevacloud

The backup script deletes files older than 30 days automatically. You can also set a **lifecycle policy** in the Nevacloud portal as a second safety net (expire objects under `sejahtera-ims/db-backups/` after 30 days). This is optional — the script already handles retention.
