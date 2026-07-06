#!/bin/bash
# Install daily midnight database backup cron job (Asia/Jakarta).
# Run once on the production VPS as root or the deploy user.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

BACKUP_SCRIPT="$SCRIPT_DIR/backup-db-to-s3.sh"
CRON_LOG="${CRON_LOG:-/var/log/sejahtera-ims-backup.log}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 0 * * *}"
CRON_TZ="${CRON_TZ:-Asia/Jakarta}"
CRON_USER="${CRON_USER:-$(whoami)}"

print_header "Install daily database backup (Nevacloud S3)"

require_project_root
make_scripts_executable

if [ ! -x "$BACKUP_SCRIPT" ]; then
    chmod +x "$BACKUP_SCRIPT"
fi

if [ "$EUID" -eq 0 ]; then
    # shellcheck source=lib/install-aws-cli.sh
    source "$SCRIPT_DIR/lib/install-aws-cli.sh"
    if ! command -v aws >/dev/null 2>&1; then
        echo "Installing AWS CLI v2 (official bundle — apt awscli is unavailable on Ubuntu 24.04+)..."
        install_aws_cli_v2
    fi
    mkdir -p /var/backups/sejahtera-ims
    chmod 700 /var/backups/sejahtera-ims
    touch "$CRON_LOG"
    chmod 640 "$CRON_LOG"
else
    if ! command -v aws >/dev/null 2>&1; then
        print_error "AWS CLI not installed. Run: sudo ./deploy/install-backup-cron.sh"
        exit 1
    fi
    CRON_LOG="$PROJECT_ROOT/logs/backup-s3-cron.log"
    mkdir -p "$PROJECT_ROOT/logs"
fi

if [ ! -f "$PROJECT_ROOT/.backup-s3.env" ]; then
    print_warning ".backup-s3.env not found at $PROJECT_ROOT/.backup-s3.env"
    echo "Copy the template and fill in your Nevacloud credentials:"
    echo "  cp $SCRIPT_DIR/env.backup-s3.example $PROJECT_ROOT/.backup-s3.env"
    echo "  chmod 600 $PROJECT_ROOT/.backup-s3.env"
    echo "  nano $PROJECT_ROOT/.backup-s3.env"
    echo ""
    read -r -p "Continue installing cron anyway? (yes/no): " confirm
    [ "$confirm" = "yes" ] || exit 0
fi

CRON_LINE="${CRON_SCHEDULE} TZ=${CRON_TZ} ${BACKUP_SCRIPT} >> ${CRON_LOG} 2>&1"

crontab_list() {
    if [ "$EUID" -eq 0 ] && [ "$CRON_USER" != "$(whoami)" ]; then
        crontab -u "$CRON_USER" -l 2>/dev/null
    else
        crontab -l 2>/dev/null
    fi
}

crontab_write() {
    if [ "$EUID" -eq 0 ] && [ "$CRON_USER" != "$(whoami)" ]; then
        crontab -u "$CRON_USER" -
    else
        crontab -
    fi
}

if crontab_list | grep -Fq "$BACKUP_SCRIPT"; then
    print_warning "Cron entry already exists for $CRON_USER — updating"
    crontab_list | grep -Fv "$BACKUP_SCRIPT" | crontab_write
fi

(crontab_list; echo "$CRON_LINE") | crontab_write

print_success "Cron installed for user: $CRON_USER"
echo "  Schedule : $CRON_SCHEDULE ($CRON_TZ)"
echo "  Script   : $BACKUP_SCRIPT"
echo "  Log      : $CRON_LOG"
echo ""
echo "Test a backup now:"
echo "  $BACKUP_SCRIPT"
echo ""
echo "View cron:"
echo "  crontab -u $CRON_USER -l"
