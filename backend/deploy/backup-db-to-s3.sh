#!/bin/bash
# Daily PostgreSQL backup to Nevacloud Object Storage (S3-compatible).
# Run manually or via cron (see install-backup-cron.sh).
#
# Credentials: copy deploy/env.backup-s3.example → .backup-s3.env (project root, gitignored).
# Do NOT put S3 keys in .env — that file is loaded into Docker containers.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-https://s3.nevaobjects.id}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-ap-southeast-1}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-sejahtera-ims/db-backups}"
DB_CONTAINER="${DB_CONTAINER:-ims-db}"
BACKUP_LOCAL_DIR=""

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "[$timestamp] [$level] $message" | tee -a "$BACKUP_LOG_FILE"
}

load_backup_config() {
    require_project_root
    validate_env
    load_env

    BACKUP_CREDENTIALS_FILE="${BACKUP_CREDENTIALS_FILE:-$PROJECT_ROOT/.backup-s3.env}"
    BACKUP_LOG_DIR="${BACKUP_LOG_DIR:-$PROJECT_ROOT/logs}"
    BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-$BACKUP_LOG_DIR/backup-s3.log}"

    if [ -f "$BACKUP_CREDENTIALS_FILE" ]; then
        set -a
        # shellcheck disable=SC1090
        source "$BACKUP_CREDENTIALS_FILE"
        set +a
    fi

    : "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required (set in .backup-s3.env)}"
    : "${BACKUP_S3_ACCESS_KEY_ID:?BACKUP_S3_ACCESS_KEY_ID is required}"
    : "${BACKUP_S3_SECRET_ACCESS_KEY:?BACKUP_S3_SECRET_ACCESS_KEY is required}"
    : "${SQL_DATABASE:?SQL_DATABASE is required (from .env)}"
    : "${SQL_USER:?SQL_USER is required (from .env)}"

    BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
    BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX%/}"

    resolve_backup_local_dir
}

resolve_backup_local_dir() {
    local candidates=()
    if [ -n "${BACKUP_LOCAL_DIR:-}" ]; then
        candidates+=("$BACKUP_LOCAL_DIR")
    fi
    candidates+=("/var/backups/sejahtera-ims" "$PROJECT_ROOT/backups/db")

    local dir
    for dir in "${candidates[@]}"; do
        if mkdir -p "$dir" 2>/dev/null && [ -w "$dir" ]; then
            BACKUP_LOCAL_DIR="$dir"
            return 0
        fi
    done

    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] [ERROR] No writable backup directory. Tried: ${candidates[*]}" >&2
    echo "Fix: sudo chown -R \$(whoami) /var/backups/sejahtera-ims" >&2
    echo "Or set BACKUP_LOCAL_DIR in .backup-s3.env to a writable path." >&2
    exit 1
}

require_aws_cli() {
    if ! command -v aws >/dev/null 2>&1; then
        log "ERROR" "AWS CLI not found. Run: sudo ./deploy/install-backup-cron.sh"
        exit 1
    fi
}

require_db_container() {
    if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
        log "ERROR" "Database container '$DB_CONTAINER' is not running"
        exit 1
    fi
}

aws_s3() {
    AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$BACKUP_S3_REGION" \
    aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 "$@"
}

aws_s3api() {
    AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$BACKUP_S3_REGION" \
    aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3api "$@"
}

create_backup() {
    local timestamp filename s3_key local_path
    timestamp="$(date '+%Y%m%d-%H%M%S')"
    filename="${SQL_DATABASE}-${timestamp}.sql.gz"
    s3_key="${BACKUP_S3_PREFIX}/${filename}"
    local_path="${BACKUP_LOCAL_DIR}/${filename}"

    mkdir -p "$BACKUP_LOG_DIR"

    log "INFO" "Using local staging directory: $BACKUP_LOCAL_DIR"
    log "INFO" "Starting pg_dump for database '$SQL_DATABASE'"
    if ! docker exec -i "$DB_CONTAINER" \
        pg_dump -U "$SQL_USER" -d "$SQL_DATABASE" --no-owner --no-acl --clean --if-exists \
        | gzip -9 > "$local_path"; then
        log "ERROR" "pg_dump failed"
        rm -f "$local_path" 2>/dev/null || true
        exit 1
    fi

    local size_kb
    size_kb="$(du -k "$local_path" | cut -f1)"
    log "INFO" "Dump created: $local_path (${size_kb} KB)"

    log "INFO" "Uploading to s3://${BACKUP_S3_BUCKET}/${s3_key}"
    if ! aws_s3 cp "$local_path" "s3://${BACKUP_S3_BUCKET}/${s3_key}" \
        --only-show-errors \
        --storage-class STANDARD; then
        log "ERROR" "S3 upload failed"
        exit 1
    fi

    log "INFO" "Upload complete (private object, no public ACL)"
    rm -f "$local_path"
    log "INFO" "Local copy removed: $local_path"
}

prune_old_backups() {
    local cutoff_epoch deleted_count=0
    cutoff_epoch="$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%s)"

    log "INFO" "Pruning backups older than ${BACKUP_RETENTION_DAYS} days from s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/"

    local listing
    if ! listing="$(aws_s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" 2>/dev/null)"; then
        log "WARN" "Could not list remote backups (bucket may be empty or prefix missing)"
        return 0
    fi

    while read -r backup_date backup_time backup_size backup_key; do
        [ -n "${backup_key:-}" ] || continue
        [[ "$backup_key" == *.sql.gz ]] || continue

        local file_epoch remote_path
        file_epoch="$(date -d "${backup_date} ${backup_time}" +%s 2>/dev/null || echo 0)"
        if [ "$file_epoch" -eq 0 ]; then
            log "WARN" "Skipping unparseable date for: $backup_key"
            continue
        fi

        if [ "$file_epoch" -lt "$cutoff_epoch" ]; then
            if [[ "$backup_key" == */* ]]; then
                remote_path="s3://${BACKUP_S3_BUCKET}/${backup_key}"
            else
                remote_path="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${backup_key}"
            fi
            if aws_s3 rm "$remote_path" --only-show-errors; then
                log "INFO" "Deleted expired backup: $backup_key (${backup_date})"
                deleted_count=$((deleted_count + 1))
            else
                log "WARN" "Failed to delete: $remote_path"
            fi
        fi
    done <<< "$listing"

    log "INFO" "Retention prune finished — deleted ${deleted_count} object(s)"
}

verify_s3_access() {
    log "INFO" "Verifying S3 access to bucket '$BACKUP_S3_BUCKET'"
    if ! aws_s3 ls "s3://${BACKUP_S3_BUCKET}/" >/dev/null 2>&1; then
        log "ERROR" "Cannot access bucket. Check credentials, bucket name, and endpoint."
        exit 1
    fi
    log "INFO" "S3 access OK"
}

main() {
    load_backup_config
    require_aws_cli
    require_db_container
    mkdir -p "$BACKUP_LOG_DIR"

    log "INFO" "=== Database backup started ==="
    verify_s3_access
    create_backup
    prune_old_backups
    log "INFO" "=== Database backup finished successfully ==="
}

main "$@"
