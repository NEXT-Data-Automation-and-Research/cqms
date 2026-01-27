# Docker Setup Guide for Express CQMS

This guide explains how to use Docker to run the Express CQMS platform in both development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Docker Commands](#docker-commands)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Desktop installed and running (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v3.8 or higher
- `.env` file configured with your environment variables (see `env.template`)

## Quick Start

### Production Build

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Development Build

```bash
# Build and start in development mode
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Development Setup

The development setup includes:
- Hot-reload support (when using nodemon)
- Source code mounted as volumes
- Verbose logging
- Development-optimized environment variables

### Running Development Container

```bash
# Start development container
docker-compose -f docker-compose.dev.yml up

# Start in detached mode
docker-compose -f docker-compose.dev.yml up -d

# Rebuild after dependency changes
docker-compose -f docker-compose.dev.yml up --build
```

### Development Features

- **Hot Reload**: Source code changes are reflected automatically
- **Debug Logging**: More verbose logs for troubleshooting
- **Source Maps**: Enabled for better debugging experience
- **Volume Mounts**: Source code is mounted for live editing

## Production Setup

The production setup includes:
- Multi-stage build for optimized image size
- Production dependencies only
- Non-root user for security
- Health checks
- Resource limits

### Building Production Image

```bash
# Build the production image
docker build -t express-cqms:latest .

# Or using docker-compose
docker-compose build
```

### Running Production Container

```bash
# Start production container
docker-compose up -d

# View logs
docker-compose logs -f app

# Check container status
docker-compose ps

# View health status
docker inspect express-cqms-app | grep -A 10 Health
```

### Production Features

- **Optimized Image**: Multi-stage build reduces final image size
- **Security**: Runs as non-root user (nodejs:1001)
- **Health Checks**: Automatic health monitoring
- **Resource Limits**: Can be configured in docker-compose.yml
- **Logging**: Structured logging to mounted volumes

## Docker Commands

### Basic Commands

```bash
# Build image
docker build -t express-cqms:latest .

# Run container
docker run -p 4000:4000 --env-file .env express-cqms:latest

# Run in background
docker run -d -p 4000:4000 --env-file .env --name express-cqms express-cqms:latest

# View logs
docker logs -f express-cqms

# Stop container
docker stop express-cqms

# Remove container
docker rm express-cqms

# Remove image
docker rmi express-cqms:latest
```

### Docker Compose Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app

# Rebuild and restart
docker-compose up --build

# Stop and remove volumes
docker-compose down -v

# Execute command in running container
docker-compose exec app sh

# View running containers
docker-compose ps
```

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Rebuild development image
docker-compose -f docker-compose.dev.yml build --no-cache

# Access container shell
docker-compose -f docker-compose.dev.yml exec app sh

# Run npm commands in container
docker-compose -f docker-compose.dev.yml exec app npm run build
```

## Environment Variables

### Required Variables

Ensure your `.env` file contains at minimum:

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=your_database_connection_string
```

### Environment Variable Sources

Docker Compose loads environment variables in this order (later overrides earlier):
1. `.env` file (via `env_file`)
2. `docker-compose.yml` environment section
3. System environment variables
4. Command-line `-e` flags

### Security Best Practices

- **Never commit `.env` files** to version control
- Use Docker secrets for sensitive data in production
- Rotate credentials regularly
- Use different `.env` files for different environments

## Dockerfile Structure

### Multi-Stage Build

The production Dockerfile uses a multi-stage build:

1. **Builder Stage**: Installs all dependencies and builds the application
2. **Production Stage**: Copies only necessary files and production dependencies

This results in a smaller final image (~200MB vs ~800MB).

### Security Features

- **Non-root user**: Container runs as `nodejs` user (UID 1001)
- **Minimal base image**: Uses Alpine Linux for smaller attack surface
- **No unnecessary packages**: Only production dependencies included
- **Health checks**: Automatic health monitoring

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check if port is already in use
netstat -an | grep 4000  # Linux/Mac
netstat -ano | findstr :4000  # Windows

# Verify environment variables
docker-compose config
```

### Build Failures

```bash
# Clean build (no cache)
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test .

# Verify Node.js version compatibility
docker run --rm node:20-alpine node --version
```

### Permission Issues

```bash
# Fix file permissions (Linux/Mac)
sudo chown -R $USER:$USER .

# Check container user
docker-compose exec app whoami
```

### Database Connection Issues

```bash
# Test database connection from container
docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"

# Verify network connectivity
docker-compose exec app ping -c 3 your-database-host
```

### Volume Mount Issues

```bash
# Check mounted volumes
docker inspect express-cqms-app | grep -A 20 Mounts

# Verify file permissions
docker-compose exec app ls -la /app
```

### Health Check Failures

```bash
# Check health status
docker inspect express-cqms-app | grep -A 10 Health

# Manually test health endpoint
curl http://localhost:4000

# Check application logs
docker-compose logs app | tail -50
```

## Production Deployment

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml express-cqms

# View services
docker service ls

# Scale service
docker service scale express-cqms_app=3
```

### Kubernetes

For Kubernetes deployment, you'll need to create:
- Deployment manifest
- Service manifest
- ConfigMap for environment variables
- Secret for sensitive data

### Cloud Platforms

#### AWS ECS/Fargate
- Use ECR for image registry
- Configure task definitions with environment variables
- Set up ALB for load balancing

#### Google Cloud Run
- Build and push to GCR
- Deploy with `gcloud run deploy`
- Configure environment variables in Cloud Console

#### Azure Container Instances
- Push to Azure Container Registry
- Deploy with Azure CLI or Portal
- Configure environment variables

## Best Practices

1. **Use specific image tags** instead of `latest` in production
2. **Scan images** for vulnerabilities regularly
3. **Monitor resource usage** and set appropriate limits
4. **Implement logging** aggregation (e.g., ELK stack)
5. **Use secrets management** for sensitive data
6. **Regularly update** base images and dependencies
7. **Test images** in staging before production deployment
8. **Document** any custom configurations

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs -f`
3. Check Docker logs: `docker logs express-cqms-app`
4. Verify environment configuration: `docker-compose config`
