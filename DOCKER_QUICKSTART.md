# Docker Quick Start Guide

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- `.env` file configured (copy from `env.template`)

### Production Mode

```bash
# Build and start
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

### Development Mode (Hot-Reload Enabled!)

```bash
# Start development container with hot-reload
npm run docker:up:dev

# View logs
npm run docker:logs:dev

# Stop
npm run docker:down:dev
```

**✨ Hot-Reload**: Changes to your code automatically rebuild and restart! No need to restart Docker.

## 📋 Common Commands

### Using npm scripts (recommended)

```bash
# Production
npm run docker:build      # Build production image
npm run docker:up         # Start containers
npm run docker:logs       # View logs
npm run docker:down       # Stop containers
npm run docker:restart   # Restart containers
npm run docker:rebuild    # Rebuild without cache

# Development
npm run docker:build:dev  # Build development image
npm run docker:up:dev     # Start dev containers
npm run docker:logs:dev   # View dev logs
npm run docker:down:dev   # Stop dev containers
npm run docker:rebuild:dev # Rebuild dev without cache
```

### Using Docker Compose directly

```bash
# Production
docker-compose up -d              # Start in background
docker-compose logs -f           # Follow logs
docker-compose ps                # List containers
docker-compose down              # Stop and remove
docker-compose restart           # Restart containers
docker-compose exec app sh       # Access container shell

# Development
docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml down
```

## 🔧 Configuration

### Environment Variables

Ensure your `.env` file contains:

```env
PORT=4000
NODE_ENV=production  # or development
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
DATABASE_URL=your_database_url
```

### Port Configuration

Default port is `4000`. Change in `.env`:
```env
PORT=8080
```

Or override in docker-compose:
```bash
PORT=8080 docker-compose up
```

## 🔥 Hot-Reload vs Production Mode

### Development Mode (`docker-compose.dev.yml`)
- ✅ **Hot-reload enabled** - Changes reflect automatically
- ✅ No restart needed for code changes
- ✅ Watches TypeScript, CSS, and server files
- ✅ Faster development workflow
- ⚠️ Uses more resources (watching files)

**Use this for**: Daily development work

### Production Mode (`docker-compose.yml`)
- ❌ **No hot-reload** - Must rebuild/restart for changes
- ✅ Optimized for production
- ✅ Smaller image size
- ✅ Better performance

**Use this for**: Testing production builds, deployment

### When Do You Need to Restart?

| Change Type | Dev Mode | Production Mode |
|------------|----------|-----------------|
| TypeScript code | ✅ Auto | ❌ Restart needed |
| CSS changes | ✅ Auto | ❌ Restart needed |
| Server code | ✅ Auto | ❌ Restart needed |
| `.env` file | ❌ Restart needed | ❌ Restart needed |
| `package.json` | ❌ Rebuild needed | ❌ Rebuild needed |
| Dockerfile changes | ❌ Rebuild needed | ❌ Rebuild needed |

## 🐛 Troubleshooting

### Docker Desktop Not Running (Windows/Mac)
**Error**: `unable to get image 'express-cqms-app': error during connect: open //./pipe/dockerDesktopLinuxEngine`

**Solution**:
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in system tray should be steady)
3. Verify Docker is running: `docker ps`
4. Try again: `npm run docker:up`

### Container won't start
```bash
# Check logs
docker-compose logs app

# Check if port is in use
netstat -an | grep 4000  # Linux/Mac
netstat -ano | findstr :4000  # Windows
```

### Environment Variable Warnings
If you see warnings about missing environment variables (like `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `SENTRY_DSN`, etc.), these are **optional** and can be safely ignored. They're only needed if you're using those specific features.

### Rebuild after dependency changes
```bash
npm run docker:rebuild
```

### Access container shell
```bash
docker-compose exec app sh
```

### View container status
```bash
docker-compose ps
docker inspect express-cqms-app
```

## 📚 More Information

See [docs/DOCKER.md](docs/DOCKER.md) for detailed documentation.
