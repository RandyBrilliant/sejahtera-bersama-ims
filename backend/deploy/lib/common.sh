#!/bin/bash
# Shared helpers for production deploy scripts (registry pull, health probes, rollback).

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_CONTAINER_NAME="${APP_CONTAINER_NAME:-ims-api}"
APP_PORT_DEFAULT="${APP_PORT_DEFAULT:-8000}"
WORKER_SERVICES="${WORKER_SERVICES:-celery celery-beat}"
DOMAIN="${DOMAIN:-api.sejahterabersama.my.id}"

# Set by require_project_root
PROJECT_ROOT=""

print_header() {
    echo -e "${BLUE}=========================================="
    echo "$1"
    echo -e "==========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

require_project_root() {
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    if [ "$(basename "$script_dir")" = "lib" ]; then
        PROJECT_ROOT="$(cd "$script_dir/../.." && pwd)"
    else
        PROJECT_ROOT="$(cd "$script_dir/.." && pwd)"
    fi
    export PROJECT_ROOT
}

require_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        print_error "docker is not installed or not in PATH"
        exit 1
    fi
    if ! docker compose version >/dev/null 2>&1; then
        print_error "docker compose plugin is not available"
        exit 1
    fi
}

make_scripts_executable() {
    chmod +x "$PROJECT_ROOT"/entrypoint.sh 2>/dev/null || true
    chmod +x "$PROJECT_ROOT"/deploy/*.sh 2>/dev/null || true
    chmod +x "$PROJECT_ROOT"/deploy/lib/*.sh 2>/dev/null || true
}

compose_args() {
    local args=(--env-file "$PROJECT_ROOT/$ENV_FILE" -f "$PROJECT_ROOT/$COMPOSE_FILE")
    if [ -f "$PROJECT_ROOT/docker-compose.prod.block.yml" ]; then
        args+=(-f "$PROJECT_ROOT/docker-compose.prod.block.yml")
    fi
    if ssl_certs_present; then
        args+=(-f "$PROJECT_ROOT/docker-compose.prod.ssl.yml")
    fi
    printf '%s\n' "${args[@]}"
}

ssl_certs_present() {
    local ssl_dir="$PROJECT_ROOT/nginx/ssl/${DOMAIN}"
    [ -f "$ssl_dir/fullchain.pem" ] && [ -f "$ssl_dir/privkey.pem" ]
}

compose_opts_string() {
    compose_args | tr '\n' ' '
}

restore_tracked_compose_files() {
    local repo_root="$1"
    local compose_path="docker-compose.prod.yml"

    if [ ! -d "$repo_root/.git" ]; then
        return 0
    fi

    git -C "$repo_root" config core.fileMode false

    if [ -f "$repo_root/backend/docker-compose.prod.yml" ]; then
        compose_path="backend/docker-compose.prod.yml"
    fi

    if ! git -C "$repo_root" diff --quiet -- "$compose_path" 2>/dev/null; then
        print_warning "Discarding local edits to $compose_path (SSL uses docker-compose.prod.ssl.yml)"
        git -C "$repo_root" checkout -- "$compose_path"
    fi
}

sync_repo_for_deploy() {
    local repo_root="$1"
    local branch="${2:-$DEPLOY_BRANCH}"

    if [ ! -d "$repo_root/.git" ]; then
        print_warning "Not a git repository — skipping git pull"
        return 0
    fi

    restore_tracked_compose_files "$repo_root"
    git -C "$repo_root" pull origin "$branch"
}

compose() {
    # shellcheck disable=SC2046
    docker compose $(compose_args) "$@"
}

load_env() {
    if [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
        set -a
        # shellcheck disable=SC1090
        source "$PROJECT_ROOT/$ENV_FILE"
        set +a
    fi
}

validate_env() {
    if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
        print_error "$ENV_FILE not found at $PROJECT_ROOT/$ENV_FILE"
        exit 1
    fi
}

persist_app_image() {
    local image="$1"
    local env_file="$PROJECT_ROOT/$ENV_FILE"
    [ -n "$image" ] || return 0
    touch "$env_file"
    if grep -q '^APP_IMAGE=' "$env_file" 2>/dev/null; then
        sed -i.bak "s|^APP_IMAGE=.*|APP_IMAGE=${image}|" "$env_file" && rm -f "${env_file}.bak"
    else
        echo "APP_IMAGE=${image}" >> "$env_file"
    fi
}

read_persisted_app_image() {
    grep -E '^APP_IMAGE=' "$PROJECT_ROOT/$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r\n' || true
}

read_running_app_image() {
    docker inspect "$APP_CONTAINER_NAME" --format '{{.Config.Image}}' 2>/dev/null | tr -d '\r\n' || true
}

read_last_good_app_image() {
    if [ -f "$PROJECT_ROOT/.deploy-last-good-image" ]; then
        head -n1 "$PROJECT_ROOT/.deploy-last-good-image" | tr -d '\r\n'
    fi
}

save_last_good_app_image() {
    [ -n "${1:-}" ] && printf '%s\n' "$1" > "$PROJECT_ROOT/.deploy-last-good-image"
}

resolve_app_port() {
    load_env
    echo "${PORT:-$APP_PORT_DEFAULT}"
}

resolve_repo_root() {
    if [ -d "$PROJECT_ROOT/.git" ]; then
        echo "$PROJECT_ROOT"
    elif [ -d "$PROJECT_ROOT/../.git" ]; then
        local parent
        parent="$(cd "$PROJECT_ROOT/.." && pwd)"
        echo "$parent"
    else
        echo "$PROJECT_ROOT"
    fi
}

_health_body_ok() {
    grep -qE '"success"[[:space:]]*:[[:space:]]*true|"status"[[:space:]]*:[[:space:]]*"ok"|"up"[[:space:]]*:[[:space:]]*true'
}

_probe_health_url() {
    local host="$1"
    local port="$2"
    curl -fsS --max-time 5 "http://${host}:${port}/health/" 2>/dev/null | _health_body_ok
}

probe_app_http_health() {
    local port="${1:-$(resolve_app_port)}"
    local max_attempts="${2:-12}"
    local i

    for i in $(seq 1 "$max_attempts"); do
        if _probe_health_url localhost "$port" || _probe_health_url 127.0.0.1 "$port"; then
            return 0
        fi
        if compose exec -T api curl -fsS --max-time 5 "http://localhost:${port}/health/" 2>/dev/null | _health_body_ok; then
            return 0
        fi
        sleep 5
    done
    return 1
}

container_health_status() {
    docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$APP_CONTAINER_NAME" 2>/dev/null || true
}

wait_for_healthy() {
    local service="$1"
    local max_attempts="${2:-50}"
    local i

    for i in $(seq 1 "$max_attempts"); do
        local status
        status="$(container_health_status)"
        if [ "$status" = "healthy" ]; then
            return 0
        fi
        # During Docker start_period status stays "starting" even when checks pass — probe HTTP.
        if probe_app_http_health "$(resolve_app_port)" 1; then
            return 0
        fi
        if compose ps "$service" 2>/dev/null | grep -qiE 'healthy'; then
            return 0
        fi
        sleep 3
    done
    return 1
}

rollback_app_deployment() {
    local rollback_image="$1"
    [ -n "$rollback_image" ] || return 1

    print_warning "Rolling back to $rollback_image"
    export APP_IMAGE="$rollback_image"
    compose pull api 2>/dev/null || true
    compose up -d --no-deps api

    if wait_for_healthy api 50; then
        # shellcheck disable=SC2086
        compose up -d --no-deps $WORKER_SERVICES
        persist_app_image "$rollback_image"
        save_last_good_app_image "$rollback_image"
        print_success "Rollback completed"
        return 0
    fi
    return 1
}

restart_workers() {
    # shellcheck disable=SC2086
    compose up -d --no-deps $WORKER_SERVICES
}

reload_nginx_if_needed() {
    if [ -n "${CHANGED_FILES:-}" ] && echo "$CHANGED_FILES" | grep -qE '(^|/)nginx/'; then
        print_warning "Nginx config changed — reloading nginx"
        compose up -d --no-deps nginx
    fi
}