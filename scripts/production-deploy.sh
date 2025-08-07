#!/bin/bash

# VoiceTransl Production Deployment Automation Script
# This script handles zero-downtime production deployments

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DEPLOY_USER=${DEPLOY_USER:-"voicetransl"}
DEPLOY_HOST=${DEPLOY_HOST:-"localhost"}
DEPLOY_PATH=${DEPLOY_PATH:-"/opt/voicetransl"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-60}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  VoiceTransl Production Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_prerequisites() {
    print_info "Checking deployment prerequisites..."
    
    # Check if we have necessary tools
    local missing_tools=()
    
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing_tools+=("docker-compose")
    command -v git >/dev/null 2>&1 || missing_tools+=("git")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check if we're on the right branch
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        print_warning "Current branch is '$current_branch', not 'main' or 'master'"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check if working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Working directory is not clean. Please commit or stash changes."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

create_deployment_backup() {
    print_info "Creating deployment backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="deployment_backup_${backup_timestamp}"
    local backup_path="backups/${backup_name}"
    
    mkdir -p "$backup_path"
    
    # Backup current configuration
    if [ -f ".env" ]; then
        cp ".env" "${backup_path}/"
    fi
    
    if [ -f "voicetransl-ui/.env" ]; then
        cp "voicetransl-ui/.env" "${backup_path}/ui.env"
    fi
    
    # Backup docker-compose files
    cp docker-compose.yml "${backup_path}/" 2>/dev/null || true
    cp docker-compose.production.yml "${backup_path}/" 2>/dev/null || true
    
    # Export current container state
    if docker-compose ps --format json > "${backup_path}/container_state.json" 2>/dev/null; then
        print_success "Container state backed up"
    fi
    
    # Create backup metadata
    cat > "${backup_path}/backup_metadata.json" << EOF
{
    "timestamp": "${backup_timestamp}",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git branch --show-current)",
    "backup_type": "pre_deployment",
    "deployment_host": "${DEPLOY_HOST}",
    "deployment_user": "${DEPLOY_USER}"
}
EOF
    
    # Cleanup old backups
    find backups/ -type d -name "deployment_backup_*" -mtime +${BACKUP_RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true
    
    print_success "Backup created at ${backup_path}"
    echo "$backup_path" > .last_backup_path
}

build_production_images() {
    print_info "Building production Docker images..."
    
    # Set production build arguments
    export NODE_ENV=production
    export VITE_API_BASE_URL="/api"
    export VITE_WS_URL="/ws"
    export VITE_ENABLE_ANALYTICS="true"
    export VITE_ENABLE_ERROR_REPORTING="true"
    export VITE_ENABLE_PERFORMANCE_MONITORING="true"
    
    # Build images with no cache for clean production build
    docker-compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache --pull
    
    # Tag images with timestamp for rollback capability
    local timestamp=$(date +%Y%m%d_%H%M%S)
    docker tag voicetransl_voicetransl-api:latest voicetransl_voicetransl-api:${timestamp}
    docker tag voicetransl_voicetransl-ui:latest voicetransl_voicetransl-ui:${timestamp}
    
    print_success "Production images built and tagged"
}

run_pre_deployment_tests() {
    print_info "Running pre-deployment tests..."
    
    # Start test containers
    docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d --no-deps voicetransl-api voicetransl-ui
    
    # Wait for services to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            break
        fi
        
        print_info "Waiting for API to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "API failed to start within timeout"
        docker-compose -f docker-compose.yml -f docker-compose.production.yml logs voicetransl-api
        exit 1
    fi
    
    # Run API health checks
    local api_health=$(curl -s http://localhost:8000/health | jq -r '.status' 2>/dev/null || echo "failed")
    if [ "$api_health" != "healthy" ]; then
        print_error "API health check failed: $api_health"
        exit 1
    fi
    
    # Check UI accessibility
    if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
        print_error "UI health check failed"
        exit 1
    fi
    
    # Stop test containers
    docker-compose -f docker-compose.yml -f docker-compose.production.yml down
    
    print_success "Pre-deployment tests passed"
}

deploy_to_production() {
    print_info "Deploying to production environment..."
    
    # Generate secrets if they don't exist
    if [ ! -f "secrets/grafana_admin_password" ]; then
        mkdir -p secrets
        openssl rand -base64 32 > secrets/grafana_admin_password
        print_success "Generated Grafana admin password"
    fi
    
    # Create production Redis configuration
    if [ ! -f "redis.conf" ]; then
        cat > redis.conf << 'EOF'
# Redis production configuration
bind 127.0.0.1
protected-mode yes
port 6379
timeout 0
keepalive 300
daemonize no
supervised no
loglevel notice
databases 16
save 900 1
save 300 10
save 60 10000
maxmemory-policy allkeys-lru
EOF
        print_success "Created Redis configuration"
    fi
    
    # Start production deployment
    print_info "Starting production services..."
    docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    wait_for_service_health "http://localhost/health" "Gateway"
    wait_for_service_health "http://localhost:8000/health" "API"
    wait_for_service_health "http://localhost:3000/health" "UI"
    
    print_success "Production deployment completed successfully"
}

wait_for_service_health() {
    local url=$1
    local service_name=$2
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 2))
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        print_info "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy within timeout"
    return 1
}

run_post_deployment_checks() {
    print_info "Running post-deployment verification..."
    
    # API functionality test
    local api_response=$(curl -s http://localhost/api/health)
    if [ $? -ne 0 ]; then
        print_error "Failed to reach API through gateway"
        return 1
    fi
    
    # UI accessibility test
    if ! curl -s -I http://localhost/ | grep -q "200 OK"; then
        print_error "UI not accessible through gateway"
        return 1
    fi
    
    # WebSocket connectivity test (basic)
    if ! curl -s -I -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/ws | grep -q "101"; then
        print_warning "WebSocket upgrade test failed (may be normal)"
    fi
    
    # Check monitoring services
    if curl -s http://localhost:9090/api/v1/targets >/dev/null 2>&1; then
        print_success "Prometheus is accessible"
    else
        print_warning "Prometheus is not accessible"
    fi
    
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        print_success "Grafana is accessible"
    else
        print_warning "Grafana is not accessible"
    fi
    
    print_success "Post-deployment checks completed"
}

show_deployment_summary() {
    print_header
    print_success "🚀 Production deployment completed successfully!"
    echo
    print_info "Services are running:"
    echo "  🌐 Application: http://localhost"
    echo "  📡 API Direct: http://localhost:8000"
    echo "  🎨 UI Direct: http://localhost:3000"
    echo "  📊 Monitoring: http://localhost:3001 (Grafana)"
    echo "  📈 Metrics: http://localhost:9090 (Prometheus)"
    echo
    print_info "Management commands:"
    echo "  📋 View logs: docker-compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
    echo "  📊 Check status: docker-compose -f docker-compose.yml -f docker-compose.production.yml ps"
    echo "  🛑 Stop services: docker-compose -f docker-compose.yml -f docker-compose.production.yml down"
    echo
    if [ -f ".last_backup_path" ]; then
        local backup_path=$(cat .last_backup_path)
        print_info "💾 Backup available at: $backup_path"
        echo "  🔄 Rollback: ./scripts/rollback-deployment.sh $backup_path"
    fi
}

rollback_deployment() {
    local backup_path=$1
    
    if [ -z "$backup_path" ] && [ -f ".last_backup_path" ]; then
        backup_path=$(cat .last_backup_path)
    fi
    
    if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
        print_error "No valid backup path provided"
        exit 1
    fi
    
    print_warning "Rolling back to backup: $backup_path"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    # Stop current services
    docker-compose -f docker-compose.yml -f docker-compose.production.yml down
    
    # Restore configuration
    if [ -f "${backup_path}/.env" ]; then
        cp "${backup_path}/.env" "."
    fi
    
    if [ -f "${backup_path}/ui.env" ]; then
        cp "${backup_path}/ui.env" "voicetransl-ui/.env"
    fi
    
    # Restore docker-compose files if needed
    if [ -f "${backup_path}/docker-compose.yml" ]; then
        cp "${backup_path}/docker-compose.yml" "."
    fi
    
    print_success "Configuration restored from backup"
    print_info "Please rebuild and redeploy with the restored configuration"
}

main() {
    case "${1:-deploy}" in
        deploy)
            print_header
            check_prerequisites
            create_deployment_backup
            build_production_images
            run_pre_deployment_tests
            deploy_to_production
            run_post_deployment_checks
            show_deployment_summary
            ;;
        rollback)
            rollback_deployment "$2"
            ;;
        test)
            print_info "Running deployment tests only..."
            run_pre_deployment_tests
            ;;
        build)
            print_info "Building production images only..."
            build_production_images
            ;;
        *)
            echo "Usage: $0 {deploy|rollback [backup_path]|test|build}"
            echo
            echo "Commands:"
            echo "  deploy    - Full production deployment (default)"
            echo "  rollback  - Rollback to previous backup"
            echo "  test      - Run deployment tests only"
            echo "  build     - Build production images only"
            exit 1
            ;;
    esac
}

main "$@"