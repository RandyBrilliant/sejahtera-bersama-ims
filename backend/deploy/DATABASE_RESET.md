# Database Reset Guide

This guide explains how to reset the production environment after resetting Django migrations.

## ⚠️ IMPORTANT WARNING

**The reset script will DELETE ALL DATA in your database!** This includes:
- All user accounts
- All application data
- All migration history

Make sure you have backups if you need to preserve any data.

---

## When to Use Database Reset

Use these scripts when you have:
- Reset your Django migrations (deleted migration files and recreated them)
- Need to start with a fresh database
- Migration conflicts that cannot be resolved easily

---

## Reset Script

**Script:** `fresh-reset.sh`

**What it does:**
- Stops and removes containers/volumes/images
- Clears generated files (logs, static, media cache)
- Resets Nginx compose mount to HTTP-only mode
- Keeps source code and restores `.env` backup

**Usage:**
```bash
sudo ./deploy/fresh-reset.sh
```

---

## After Running The Script

1. **Create a superuser:**
   ```bash
   docker compose -f docker-compose.prod.yml exec api python manage.py createsuperuser
   ```

2. **Verify migrations:**
   ```bash
   docker compose -f docker-compose.prod.yml exec api python manage.py showmigrations
   ```

3. **Check service status:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

4. **View logs (if needed):**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f api
   ```

---

## Troubleshooting

### Script fails with "Database not ready"
- Wait a few more seconds and try again
- Check database container logs: `docker compose -f docker-compose.prod.yml logs db`

### Script fails with "Migrations failed"
- Check API logs: `docker compose -f docker-compose.prod.yml logs api`
- Verify migration files exist: `ls -la account/migrations/ main/migrations/`
- Check for syntax errors in models or migrations

### Permission denied
- Make sure to run with `sudo` or as a user with Docker permissions
- Check script permissions: `ls -la deploy/fresh-reset.sh`

---

## Safety Features

The script includes:
- ✅ Explicit confirmation prompts (prevents accidental execution)
- ✅ Pre-flight checks (verifies .env file exists)
- ✅ Health checks (waits for services to be ready)
- ✅ Error handling (shows helpful error messages)
- ✅ Status reporting (shows what's happening at each step)

---

## Script Workflow

The script follows this general workflow:

1. **Safety checks** - Verify environment and get confirmation
2. **Stop services** - Gracefully stop application services
3. **Reset database/volume** - Remove existing data
4. **Start database** - Ensure database is ready
5. **Start API** - Start API container for migrations
6. **Apply migrations** - Run Django migrations
7. **Collect static files** - Update static files
8. **Restart services** - Start all services
9. **Status report** - Show final status and next steps

---

## Need Help?

If you encounter issues:

1. Check the script output for error messages
2. Review container logs: `docker compose -f docker-compose.prod.yml logs`
3. Verify your `.env` file is configured correctly
4. Check that migration files exist and are valid
5. Ensure Docker and Docker Compose are working correctly

