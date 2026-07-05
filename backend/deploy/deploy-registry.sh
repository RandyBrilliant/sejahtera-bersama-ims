#!/bin/bash
# Registry deploy: pull a prebuilt image from GHCR and restart the API with health-gated rollback.
# Routine deploys are triggered by GitHub Actions on push to main.
# Manual: APP_IMAGE=ghcr.io/<owner>/sejahtera-ims-api:<sha> ./deploy/deploy-registry.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

print_header "Registry Deploy (pull prebuilt image)"
require_project_root
require_docker
make_scripts_executable

if [ -z "${APP_IMAGE:-}" ]; then
    print_error "APP_IMAGE is required (e.g. ghcr.io/<owner>/sejahtera-ims-api:<sha>)"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    print_error "$ENV_FILE missing — run ./deploy/deploy.sh for first-time bootstrap"
    exit 1
fi

validate_env
load_env

TARGET_APP_IMAGE="$APP_IMAGE"

PREVIOUS_APP_IMAGE="$(read_running_app_image)"
if [ -z "$PREVIOUS_APP_IMAGE" ]; then
    PREVIOUS_APP_IMAGE="$(read_persisted_app_image)"
fi
if [ -z "$PREVIOUS_APP_IMAGE" ]; then
    PREVIOUS_APP_IMAGE="$(read_last_good_app_image)"
fi

export APP_IMAGE="$TARGET_APP_IMAGE"

if [ "${AUTO_DEPLOY:-}" != "true" ]; then
    echo "Target image: $TARGET_APP_IMAGE"
    if [ -n "$PREVIOUS_APP_IMAGE" ]; then
        echo "Previous image: $PREVIOUS_APP_IMAGE"
    fi
    read -r -p "Pull and deploy this image? (yes/no): " confirm
    [ "$confirm" = "yes" ] || exit 0
fi

if [ "${SKIP_PULL_CODE:-false}" != "true" ]; then
    REPO_ROOT="$(resolve_repo_root)"
    if [ -d "$REPO_ROOT/.git" ]; then
        BEFORE_HEAD="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
        git -C "$REPO_ROOT" pull origin "${DEPLOY_BRANCH}" || true
        AFTER_HEAD="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
        if [ -z "${CHANGED_FILES:-}" ]; then
            CHANGED_FILES="$(git -C "$REPO_ROOT" diff --name-only "$BEFORE_HEAD" "$AFTER_HEAD" 2>/dev/null || true)"
        fi
    fi
fi

echo ""
print_header "Pulling $TARGET_APP_IMAGE"
compose pull api

echo ""
print_header "Restarting API"
compose up -d --no-deps api

DEPLOY_OK=false
if wait_for_healthy api 50; then
    DEPLOY_OK=true
fi

if [ "$DEPLOY_OK" != true ]; then
    print_error "New deployment failed health checks"
    compose logs --tail=40 api
    if [ -n "$PREVIOUS_APP_IMAGE" ] && [ "$PREVIOUS_APP_IMAGE" != "$TARGET_APP_IMAGE" ]; then
        rollback_app_deployment "$PREVIOUS_APP_IMAGE" && exit 1
    fi
    exit 1
fi

persist_app_image "$TARGET_APP_IMAGE"
save_last_good_app_image "$TARGET_APP_IMAGE"

echo ""
print_header "Restarting workers"
restart_workers
reload_nginx_if_needed

print_success "Deployed $TARGET_APP_IMAGE"
