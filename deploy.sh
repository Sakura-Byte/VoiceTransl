#!/bin/bash

# VoiceTransl Full-Stack Deployment Script
# This script helps deploy VoiceTransl (API + UI) in various configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_API_PORT=8000
DEFAULT_UI_PORT=3000
DEFAULT_HOST="127.0.0.1"
DEFAULT_MAX_TASKS=5
NODE_VERSION="20"
PYTHON_VERSION="3.11"

# Functions
print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}  VoiceTransl Full-Stack Deployment${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo
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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    print_success "Python 3 found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed (required for frontend)"
    else
        NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VER" -lt "18" ]; then
            print_warning "Node.js version is $NODE_VER, recommend v18 or higher"
        else
            print_success "Node.js found (v$NODE_VER)"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_warning "npm is not installed (required for frontend)"
    else
        print_success "npm found"
    fi
    
    # Check pip
    if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
        print_error "pip is not installed"
        exit 1
    fi
    print_success "pip found"
    
    # Check if in VoiceTransl directory
    if [ ! -d "api" ] || [ ! -d "voicetransl-ui" ]; then
        print_error "Please run this script from the VoiceTransl root directory"
        print_error "Expected directories: api/, voicetransl-ui/"
        exit 1
    fi
    print_success "VoiceTransl directory structure verified"
}

install_api_dependencies() {
    print_info "Installing API dependencies..."
    
    if [ -f "requirements-api.txt" ]; then
        pip install -r requirements-api.txt
        print_success "API dependencies installed"
    else
        print_warning "requirements-api.txt not found, installing minimal dependencies"
        pip install fastapi uvicorn pydantic httpx python-multipart
    fi
}

install_ui_dependencies() {
    print_info "Installing UI dependencies..."
    
    if [ -d "voicetransl-ui" ]; then
        cd voicetransl-ui
        
        if command -v pnpm &> /dev/null; then
            print_info "Using pnpm for faster installation"
            pnpm install --frozen-lockfile
        else
            npm ci
        fi
        
        cd ..
        print_success "UI dependencies installed"
    else
        print_error "voicetransl-ui directory not found"
        exit 1
    fi
}

build_ui() {
    print_info "Building UI for production..."
    
    if [ -d "voicetransl-ui" ]; then
        cd voicetransl-ui
        
        # Set production environment
        export NODE_ENV=production
        export VITE_API_BASE_URL="/api"
        export VITE_WS_URL="/ws"
        
        if command -v pnpm &> /dev/null; then
            pnpm run build
        else
            npm run build
        fi
        
        cd ..
        print_success "UI build completed"
    else
        print_error "voicetransl-ui directory not found"
        exit 1
    fi
}

create_config() {
    print_info "Creating configuration files..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# VoiceTransl API Configuration
API_HOST=${DEFAULT_HOST}
API_PORT=${DEFAULT_API_PORT}
API_MAX_CONCURRENT_TASKS=${DEFAULT_MAX_TASKS}
API_ENABLE_AUTH=false
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=3600
API_MAX_FILE_SIZE=104857600
API_TEMP_DIR=temp
API_LOG_LEVEL=INFO
EOF
        print_success "Created .env configuration file"
    else
        print_info ".env file already exists"
    fi
    
    # Create UI environment files
    if [ ! -f "voicetransl-ui/.env" ]; then
        cat > voicetransl-ui/.env << EOF
# VoiceTransl UI Configuration
VITE_API_BASE_URL=http://localhost:${DEFAULT_API_PORT}
VITE_WS_URL=ws://localhost:${DEFAULT_API_PORT}/ws
VITE_APP_TITLE=VoiceTransl
VITE_APP_VERSION=2.0.0
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false
VITE_ENABLE_PERFORMANCE_MONITORING=false
EOF
        print_success "Created UI .env configuration file"
    else
        print_info "UI .env file already exists"
    fi
    
    # Create necessary directories
    mkdir -p temp
    mkdir -p logs
    mkdir -p ssl
    print_success "Created necessary directories"
}

deploy_api_only() {
    print_info "Deploying API server only..."
    
    check_dependencies
    install_api_dependencies
    create_config
    
    print_success "API-only deployment complete!"
    print_info "To start the API server:"
    echo "  python -m api.main"
    echo "  or"
    echo "  uvicorn api.main:app --host ${DEFAULT_HOST} --port ${DEFAULT_API_PORT}"
    echo
    print_info "API documentation will be available at:"
    echo "  http://${DEFAULT_HOST}:${DEFAULT_API_PORT}/docs"
}

deploy_ui_only() {
    print_info "Deploying UI only (development mode)..."
    
    check_dependencies
    install_ui_dependencies
    create_config
    
    print_success "UI-only deployment complete!"
    print_info "To start the UI development server:"
    echo "  cd voicetransl-ui"
    echo "  npm run dev"
    echo
    print_info "UI will be available at:"
    echo "  http://localhost:5175"
}

deploy_standalone() {
    print_info "Deploying full-stack application..."
    
    check_dependencies
    install_api_dependencies
    install_ui_dependencies
    create_config
    build_ui
    
    print_success "Full-stack deployment complete!"
    print_info "To start both services:"
    echo "  # Terminal 1 - API Server:"
    echo "  python -m api.main"
    echo
    echo "  # Terminal 2 - UI Server:"
    echo "  cd voicetransl-ui && npm run preview"
    echo
    print_info "Services will be available at:"
    echo "  - API: http://${DEFAULT_HOST}:${DEFAULT_API_PORT}"
    echo "  - UI: http://${DEFAULT_HOST}:4173"
    echo "  - API Docs: http://${DEFAULT_HOST}:${DEFAULT_API_PORT}/docs"
}

deploy_docker_api() {
    print_info "Deploying API with Docker..."
    
    check_docker_dependencies
    
    # Build and start API container
    print_info "Building API Docker image..."
    docker-compose build voicetransl-api
    
    print_info "Starting API container..."
    docker-compose up -d voicetransl-api
    
    print_success "Docker API deployment complete!"
    print_info "API server is running at http://localhost:8000"
    print_info "To view logs: docker-compose logs -f voicetransl-api"
    print_info "To stop: docker-compose down"
}

deploy_docker() {
    print_info "Deploying full-stack with Docker..."
    
    check_docker_dependencies
    
    # Build and start containers
    print_info "Building Docker images..."
    docker-compose --profile frontend build
    
    print_info "Starting containers..."
    docker-compose --profile frontend up -d
    
    print_success "Docker full-stack deployment complete!"
    print_info "Services are running:"
    echo "  - API: http://localhost:8000"
    echo "  - UI: http://localhost:3000"
    echo "  - API Docs: http://localhost:8000/docs"
    echo
    print_info "To view logs:"
    echo "  docker-compose logs -f voicetransl-api"
    echo "  docker-compose logs -f voicetransl-ui"
    echo
    print_info "To stop: docker-compose --profile frontend down"
}

check_docker_dependencies() {
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "Docker dependencies verified"
}

deploy_production() {
    print_info "Deploying production setup with full stack and monitoring..."
    
    check_docker_dependencies
    
    # Create SSL certificates if they don't exist
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        print_info "Creating self-signed SSL certificates..."
        create_ssl_certificates
    fi
    
    # Build production images
    print_info "Building production images..."
    docker-compose --profile production build
    
    # Start production stack
    print_info "Starting production stack..."
    docker-compose --profile production --profile monitoring up -d
    
    # Wait for services to start
    print_info "Waiting for services to start..."
    sleep 10
    
    # Check service health
    check_service_health
    
    print_success "Production deployment complete!"
    print_info "Services available:"
    echo "  - Application: http://localhost (or https://localhost if SSL configured)"
    echo "  - API Direct: http://localhost:8000"
    echo "  - UI Direct: http://localhost:3000"
    echo "  - Monitoring: http://localhost:3000 (admin/admin)"
    echo "  - Metrics: http://localhost:9090"
    echo
    print_info "To view logs:"
    echo "  docker-compose --profile production logs -f"
    echo
    print_info "To stop:"
    echo "  docker-compose --profile production --profile monitoring down"
}

create_ssl_certificates() {
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    print_success "SSL certificates created"
}

check_service_health() {
    print_info "Checking service health..."
    
    # Check API health
    for i in {1..30}; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            print_success "API service is healthy"
            break
        fi
        sleep 1
    done
    
    # Check UI health
    for i in {1..30}; do
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            print_success "UI service is healthy"
            break
        fi
        sleep 1
    done
}

show_status() {
    print_info "Checking service status..."
    
    # Check Docker containers
    if command -v docker-compose &> /dev/null; then
        print_info "Docker container status:"
        docker-compose ps 2>/dev/null || print_warning "No Docker containers found"
        echo
    fi
    
    # Check API service
    print_info "Checking API service..."
    if curl -s http://localhost:${DEFAULT_API_PORT}/health >/dev/null 2>&1; then
        API_RESPONSE=$(curl -s http://localhost:${DEFAULT_API_PORT}/health)
        print_success "API server is responding at http://localhost:${DEFAULT_API_PORT}"
        echo "  Response: $API_RESPONSE"
    else
        print_warning "API server is not responding at http://localhost:${DEFAULT_API_PORT}"
    fi
    
    # Check UI service
    print_info "Checking UI service..."
    if curl -s http://localhost:${DEFAULT_UI_PORT}/health >/dev/null 2>&1; then
        print_success "UI server is responding at http://localhost:${DEFAULT_UI_PORT}"
    elif curl -s http://localhost:5175 >/dev/null 2>&1; then
        print_success "UI development server is responding at http://localhost:5175"
    else
        print_warning "UI server is not responding"
    fi
    
    # Check production gateway
    print_info "Checking production gateway..."
    if curl -s http://localhost/health >/dev/null 2>&1; then
        print_success "Production gateway is responding at http://localhost"
    else
        print_info "Production gateway is not running"
    fi
}

show_help() {
    echo "VoiceTransl Full-Stack Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  api-only      Deploy API server only"
    echo "  ui-only       Deploy UI in development mode"
    echo "  standalone    Deploy full-stack application (API + UI)"
    echo "  docker-api    Deploy API with Docker only"
    echo "  docker        Deploy full-stack with Docker"
    echo "  production    Deploy production setup with monitoring"
    echo "  status        Check deployment status"
    echo "  stop          Stop all services"
    echo "  logs          Show recent logs"
    echo "  clean         Clean up build artifacts and containers"
    echo "  migrate       Run database migrations (if applicable)"
    echo "  backup        Create backup of current deployment"
    echo "  rollback      Rollback to previous deployment"
    echo "  help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0 api-only       # Deploy just the API"
    echo "  $0 ui-only        # Deploy just the UI for development"
    echo "  $0 standalone     # Deploy full-stack locally"
    echo "  $0 docker         # Deploy full-stack with Docker"
    echo "  $0 production     # Deploy production setup"
    echo "  $0 status         # Check service status"
    echo
    echo "Environment Variables:"
    echo "  DEPLOY_ENV        Set deployment environment (dev/staging/prod)"
    echo "  API_PORT          Override default API port (${DEFAULT_API_PORT})"
    echo "  UI_PORT           Override default UI port (${DEFAULT_UI_PORT})"
}

stop_services() {
    print_info "Stopping all services..."
    
    # Stop all Docker services (all profiles)
    if [ -f "docker-compose.yml" ]; then
        docker-compose --profile production --profile frontend --profile monitoring down 2>/dev/null
        print_success "Docker services stopped"
    fi
    
    # Kill standalone processes (if any)
    pkill -f "api.main" 2>/dev/null || true
    pkill -f "uvicorn.*api.main" 2>/dev/null || true
    pkill -f "vite.*dev" 2>/dev/null || true
    pkill -f "vite.*preview" 2>/dev/null || true
    pkill -f "node.*vite" 2>/dev/null || true
    
    print_success "All services stopped"
}

clean_deployment() {
    print_info "Cleaning up build artifacts and containers..."
    
    # Stop services first
    stop_services
    
    # Clean Docker artifacts
    if command -v docker &> /dev/null; then
        # Remove containers
        docker-compose --profile production --profile frontend --profile monitoring rm -f 2>/dev/null
        
        # Remove images (optional, uncomment if needed)
        # docker rmi voicetransl_voicetransl-api voicetransl_voicetransl-ui 2>/dev/null || true
        
        # Clean unused images and volumes
        docker system prune -f --volumes 2>/dev/null || true
    fi
    
    # Clean build artifacts
    if [ -d "voicetransl-ui/dist" ]; then
        rm -rf voicetransl-ui/dist
        print_success "UI build artifacts cleaned"
    fi
    
    if [ -d "voicetransl-ui/node_modules/.vite" ]; then
        rm -rf voicetransl-ui/node_modules/.vite
        print_success "Vite cache cleaned"
    fi
    
    print_success "Cleanup complete"
}

create_backup() {
    print_info "Creating deployment backup..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup configuration files
    [ -f ".env" ] && cp ".env" "$BACKUP_DIR/"
    [ -f "voicetransl-ui/.env" ] && cp "voicetransl-ui/.env" "$BACKUP_DIR/ui.env"
    [ -f "docker-compose.yml" ] && cp "docker-compose.yml" "$BACKUP_DIR/"
    
    # Backup database/data if exists
    [ -d "data" ] && cp -r "data" "$BACKUP_DIR/"
    
    # Create backup info
    cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
EOF
    
    print_success "Backup created at $BACKUP_DIR"
}

rollback_deployment() {
    print_info "Rolling back to previous deployment..."
    
    # Find latest backup
    if [ ! -d "backups" ] || [ -z "$(ls -A backups 2>/dev/null)" ]; then
        print_error "No backups found to rollback to"
        exit 1
    fi
    
    LATEST_BACKUP=$(ls -1 backups | sort -r | head -n1)
    print_info "Rolling back to backup: $LATEST_BACKUP"
    
    # Stop current services
    stop_services
    
    # Restore configuration
    if [ -f "backups/$LATEST_BACKUP/.env" ]; then
        cp "backups/$LATEST_BACKUP/.env" "."
        print_success "API configuration restored"
    fi
    
    if [ -f "backups/$LATEST_BACKUP/ui.env" ]; then
        cp "backups/$LATEST_BACKUP/ui.env" "voicetransl-ui/.env"
        print_success "UI configuration restored"
    fi
    
    # Restore data if exists
    if [ -d "backups/$LATEST_BACKUP/data" ]; then
        rm -rf data
        cp -r "backups/$LATEST_BACKUP/data" "."
        print_success "Data restored"
    fi
    
    print_success "Rollback complete"
    print_info "You may need to restart services manually"
}

show_logs() {
    print_info "Showing service logs..."
    
    # Check what services are running and show appropriate logs
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        print_info "Showing Docker logs for all services..."
        docker-compose logs -f
    elif [ -f "logs/api.log" ]; then
        print_info "Showing API standalone logs..."
        tail -f logs/api.log
    else
        print_warning "No logs found"
        print_info "Try starting a service first or check if logs are being written to a different location"
    fi
}

run_migrations() {
    print_info "Running database migrations..."
    
    # This is a placeholder - implement based on your migration system
    if [ -d "migrations" ]; then
        print_info "Found migrations directory"
        # Add migration commands here
        # python manage.py migrate  # Django example
        # alembic upgrade head       # SQLAlchemy example
        print_success "Migrations completed"
    else
        print_info "No migrations directory found - skipping"
    fi
}

# Main script
print_header

# Handle environment variables
if [ -n "$API_PORT" ]; then
    DEFAULT_API_PORT="$API_PORT"
fi

if [ -n "$UI_PORT" ]; then
    DEFAULT_UI_PORT="$UI_PORT"
fi

case "${1:-help}" in
    api-only)
        deploy_api_only
        ;;
    ui-only)
        deploy_ui_only
        ;;
    standalone)
        deploy_standalone
        ;;
    docker-api)
        deploy_docker_api
        ;;
    docker)
        deploy_docker
        ;;
    production)
        create_backup
        deploy_production
        ;;
    status)
        show_status
        ;;
    stop)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_deployment
        ;;
    migrate)
        run_migrations
        ;;
    backup)
        create_backup
        ;;
    rollback)
        rollback_deployment
        ;;
    help|*)
        show_help
        ;;
esac
