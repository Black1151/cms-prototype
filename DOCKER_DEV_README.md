# CMS Prototype - Docker Development Setup

This document explains how to use the Docker development environment for the CMS prototype.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development if needed)

## Quick Start

1. **Start all services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Start services in background:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

3. **View logs:**
   ```bash
   # All services
   docker-compose -f docker-compose.dev.yml logs -f
   
   # Specific service
   docker-compose -f docker-compose.dev.yml logs -f backend
   docker-compose -f docker-compose.dev.yml logs -f frontend
   docker-compose -f docker-compose.dev.yml logs -f postgres
   ```

4. **Stop all services:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

5. **Stop and remove volumes (database data):**
   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   ```

## Services

### PostgreSQL Database
- **Port:** 5432
- **Database:** cms_dev
- **Username:** cms_user
- **Password:** cms_password
- **Container:** cms-postgres

### Backend (NestJS)
- **Port:** 3000
- **Container:** cms-backend
- **Features:** Hot reload, TypeORM, GraphQL
- **Dependencies:** PostgreSQL

### Frontend (Next.js)
- **Port:** 3001
- **Container:** cms-frontend
- **Features:** Hot reload, React, Chakra UI
- **Dependencies:** Backend API

## Development Workflow

1. **Code Changes:** The services use volume mounts, so code changes are reflected immediately
2. **Dependencies:** If you add new dependencies, rebuild the containers:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```
3. **Database:** Data persists between container restarts unless you use `down -v`

## Environment Variables

The services are configured with the following environment variables:

### Backend
- `DATABASE_HOST`: postgres
- `DATABASE_PORT`: 5432
- `DATABASE_NAME`: cms_dev
- `DATABASE_USERNAME`: cms_user
- `DATABASE_PASSWORD`: cms_password

### Frontend
- `NEXT_PUBLIC_API_URL`: http://localhost:3000

## Troubleshooting

### Port Conflicts
If ports 3000, 3001, or 5432 are already in use, modify the `docker-compose.dev.yml` file to use different ports.

### Database Connection Issues
1. Ensure PostgreSQL container is running: `docker ps | grep postgres`
2. Check logs: `docker-compose -f docker-compose.dev.yml logs postgres`
3. Verify environment variables in backend service

### Hot Reload Not Working
1. Check if volumes are properly mounted
2. Verify file permissions
3. Restart the specific service: `docker-compose -f docker-compose.dev.yml restart backend`

## Useful Commands

```bash
# Access PostgreSQL CLI
docker exec -it cms-postgres psql -U cms_user -d cms_dev

# Access backend container
docker exec -it cms-backend sh

# Access frontend container
docker exec -it cms-frontend sh

# View resource usage
docker stats

# Clean up unused containers/images
docker system prune -a
```
