# VoiceTransl Deployment Guide

This comprehensive guide covers all deployment options for VoiceTransl, from development setup to production deployment.

## 🚀 Quick Start

### Development Setup
```bash
# 1. Clone and setup development environment
./scripts/dev-setup.sh

# 2. Start development servers
./scripts/start-dev.sh
```

### Production Deployment
```bash
# Full production deployment with monitoring
./deploy.sh production
```

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Environment](#development-environment)
3. [Build Configuration](#build-configuration)
4. [Deployment Options](#deployment-options)
5. [Production Setup](#production-setup)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

VoiceTransl uses a modern full-stack architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React/Vite    │    │   FastAPI       │    │   Translation   │
│   Frontend      │◄──►│   Backend       │◄──►│   Services      │
│   (Port 3000)   │    │   (Port 8000)   │    │   (GalTransl)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Nginx Gateway │
                    │   (Port 80/443) │
                    └─────────────────┘
```

### Key Components

- **Frontend (voicetransl-ui/)**: React + TypeScript with Vite, Tailwind CSS v4, premium UI components
- **Backend (api/)**: FastAPI with async task management, WebSocket support
- **Translation Engine (GalTransl/)**: Multiple translation backends and models
- **Gateway**: Nginx reverse proxy with SSL, compression, caching
- **Monitoring**: Prometheus, Grafana, Loki for observability

## 💻 Development Environment

### Prerequisites

- Node.js 18+ (recommended: 20+)
- Python 3.11+
- Docker & Docker Compose (for containerized deployment)
- Git

### Setup Development Environment

```bash
# Automated setup
./scripts/dev-setup.sh

# Manual setup
cd voicetransl-ui
npm ci
npm run type-check
cd ..

python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements-api.txt
```

### Development Servers

```bash
# Start both services simultaneously
./scripts/start-dev.sh

# Or start individually:

# Terminal 1 - API Server
source venv/bin/activate
python -m api.main

# Terminal 2 - UI Development Server
cd voicetransl-ui
npm run dev
```

Access points:
- **UI Development**: http://localhost:5175
- **API Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Build Configuration

### Frontend Build (Vite)

The frontend uses Vite with advanced optimization:

- **Bundle Splitting**: Separate chunks for vendors, utilities, and app code
- **Compression**: Gzip and Brotli compression in production
- **Performance Monitoring**: Built-in performance tracking
- **Environment-based Configuration**: Different configs for dev/staging/prod

Build commands:
```bash
cd voicetransl-ui

# Development build
npm run build

# Production build with analysis
npm run build:analyze

# Production build with source maps
npm run build:sourcemap

# Preview production build
npm run preview
```

### Backend Build (Docker)

The backend uses a multi-stage Docker build:

```bash
# Build API container
docker-compose build voicetransl-api

# Build UI container
docker-compose --profile frontend build voicetransl-ui
```

## 🚀 Deployment Options

### 1. Development Mode

```bash
# API only
./deploy.sh api-only

# UI only (development server)
./deploy.sh ui-only

# Full stack development
./scripts/start-dev.sh
```

### 2. Standalone Deployment

```bash
# Build and serve both services locally
./deploy.sh standalone
```

This creates a production build of the UI and serves it alongside the API.

### 3. Docker Deployment

```bash
# API only
./deploy.sh docker-api

# Full stack with Docker
./deploy.sh docker

# Production with monitoring
./deploy.sh production
```

### 4. Environment-Specific Deployment

```bash
# Staging environment
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production environment
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

## 🏭 Production Setup

### Automated Production Deployment

```bash
# Full automated deployment
./scripts/production-deploy.sh

# Test deployment configuration
./scripts/production-deploy.sh test

# Build images only
./scripts/production-deploy.sh build
```

### Manual Production Setup

1. **Build Production Images**:
   ```bash
   docker-compose -f docker-compose.production.yml build
   ```

2. **Configure Secrets**:
   ```bash
   mkdir -p secrets
   openssl rand -base64 32 > secrets/grafana_admin_password
   ```

3. **Setup SSL Certificates**:
   ```bash
   mkdir -p ssl
   # Add your SSL certificates as ssl/cert.pem and ssl/key.pem
   # Or generate self-signed for testing:
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout ssl/key.pem -out ssl/cert.pem
   ```

4. **Start Production Stack**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
   ```

### Production Environment Variables

Create environment-specific `.env` files:

**.env (API)**:
```bash
API_HOST=0.0.0.0
API_PORT=8000
API_LOG_LEVEL=WARNING
API_ENABLE_AUTH=true
API_MAX_CONCURRENT_TASKS=5
DEPLOY_ENV=production
```

**voicetransl-ui/.env.production**:
```bash
VITE_API_BASE_URL=/api
VITE_WS_URL=/ws
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

## 📊 Monitoring & Logging

### Services Included

1. **Prometheus** (http://localhost:9090)
   - Metrics collection and alerting
   - API response times, error rates
   - System metrics

2. **Grafana** (http://localhost:3001)
   - Visualization dashboards
   - Default login: admin/[generated password in secrets/]
   - Pre-configured dashboards for VoiceTransl

3. **Loki** (http://localhost:3100)
   - Log aggregation
   - Integrated with Grafana

4. **Redis** (localhost:6379)
   - Caching and session management
   - Performance optimization

### Accessing Monitoring

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check service status
./deploy.sh status

# Access monitoring interfaces
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

## 💾 Backup & Recovery

### Automated Backups

Backups are automatically created before deployments:

```bash
# Manual backup
./deploy.sh backup

# List backups
ls backups/

# Restore from backup
./deploy.sh rollback
```

### Manual Backup Process

```bash
# Create backup directory
backup_dir="backups/manual_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

# Backup configuration
cp .env "$backup_dir/"
cp voicetransl-ui/.env "$backup_dir/ui.env"

# Backup data volumes
docker run --rm -v voicetransl_production_logs:/data -v "$PWD/$backup_dir":/backup \
  alpine tar czf /backup/logs.tar.gz -C /data .
```

### Disaster Recovery

1. **Service Recovery**:
   ```bash
   # Stop all services
   ./deploy.sh stop
   
   # Restore from backup
   ./deploy.sh rollback [backup_path]
   
   # Restart services
   ./deploy.sh production
   ```

2. **Data Recovery**:
   ```bash
   # Restore volumes from backup
   docker run --rm -v voicetransl_production_logs:/data -v "$PWD/backup_path":/backup \
     alpine tar xzf /backup/logs.tar.gz -C /data
   ```

## 🔍 Troubleshooting

### Common Issues

#### 1. API Connection Issues
```bash
# Check API health
curl http://localhost:8000/health

# Check API logs
docker-compose logs -f voicetransl-api

# Test API connectivity
curl -v http://localhost:8000/docs
```

#### 2. UI Build Issues
```bash
# Clear build cache
cd voicetransl-ui
rm -rf dist node_modules/.vite

# Reinstall dependencies
npm ci

# Run type check
npm run type-check
```

#### 3. Docker Issues
```bash
# Clean Docker artifacts
./deploy.sh clean

# Rebuild images
docker-compose build --no-cache

# Check container logs
docker-compose logs -f
```

#### 4. SSL/HTTPS Issues
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL connection
curl -k https://localhost/health

# Regenerate certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

### Performance Issues

1. **High Memory Usage**:
   - Check container limits in docker-compose.production.yml
   - Monitor with `docker stats`
   - Adjust heap sizes for Java-based components

2. **Slow Response Times**:
   - Check Prometheus metrics
   - Review nginx access logs
   - Monitor database query performance

3. **WebSocket Connection Issues**:
   - Check nginx WebSocket configuration
   - Verify proxy timeouts
   - Test WebSocket connectivity

### Debugging Commands

```bash
# System status
./deploy.sh status

# View all logs
docker-compose -f docker-compose.production.yml logs -f

# Container resource usage
docker stats

# Network connectivity
docker network ls
docker network inspect voicetransl-network

# Volume usage
docker volume ls
docker system df
```

## 🔐 Security Considerations

### Production Security Checklist

- [ ] Change default passwords
- [ ] Use proper SSL certificates
- [ ] Configure firewall rules
- [ ] Enable authentication
- [ ] Set up log monitoring
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access control lists

### Security Configuration

1. **Enable API Authentication**:
   ```bash
   # In .env
   API_ENABLE_AUTH=true
   API_KEY=your-secret-api-key
   ```

2. **Configure HTTPS**:
   - Add real SSL certificates to `ssl/` directory
   - Update nginx configuration for production domain
   - Configure HSTS headers

3. **Network Security**:
   - Use Docker networks for isolation
   - Configure firewall rules
   - Limit exposed ports

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)

## 🤝 Contributing

When contributing to deployment configurations:

1. Test changes in development first
2. Update this documentation
3. Test deployment scripts
4. Verify monitoring works correctly
5. Update environment examples

## 📄 License

This deployment configuration is part of the VoiceTransl project. See the main LICENSE file for details.