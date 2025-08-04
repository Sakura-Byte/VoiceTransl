#!/bin/bash

# VoiceTransl API Deployment Script
# This script helps deploy VoiceTransl API in various configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_PORT=8000
DEFAULT_HOST="127.0.0.1"
DEFAULT_MAX_TASKS=5

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  VoiceTransl API Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
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
    
    # Check pip
    if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
        print_error "pip is not installed"
        exit 1
    fi
    print_success "pip found"
    
    # Check if in VoiceTransl directory
    if [ ! -f "app.py" ] || [ ! -d "api" ]; then
        print_error "Please run this script from the VoiceTransl root directory"
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

create_config() {
    print_info "Creating configuration files..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# VoiceTransl API Configuration
API_HOST=${DEFAULT_HOST}
API_PORT=${DEFAULT_PORT}
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
    
    # Create temp directory
    mkdir -p temp
    mkdir -p logs
    print_success "Created necessary directories"
}

deploy_standalone() {
    print_info "Deploying standalone API server..."
    
    check_dependencies
    install_api_dependencies
    create_config
    
    print_success "Standalone deployment complete!"
    print_info "To start the API server:"
    echo "  python -m api.main"
    echo "  or"
    echo "  uvicorn api.main:app --host ${DEFAULT_HOST} --port ${DEFAULT_PORT}"
    echo
    print_info "API documentation will be available at:"
    echo "  http://${DEFAULT_HOST}:${DEFAULT_PORT}/docs"
}

deploy_docker() {
    print_info "Deploying with Docker..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Build and start containers
    print_info "Building Docker image..."
    docker-compose build voicetransl-api
    
    print_info "Starting containers..."
    docker-compose up -d voicetransl-api
    
    print_success "Docker deployment complete!"
    print_info "API server is running at http://localhost:8000"
    print_info "To view logs: docker-compose logs -f voicetransl-api"
    print_info "To stop: docker-compose down"
}

deploy_production() {
    print_info "Deploying production setup with monitoring..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Create production configuration
    if [ ! -f "nginx.conf" ]; then
        print_info "Creating nginx configuration..."
        cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream voicetransl {
        server voicetransl-api:8000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        client_max_body_size 100M;
        
        location / {
            proxy_pass http://voicetransl;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
        print_success "Created nginx configuration"
    fi
    
    # Start production stack
    print_info "Starting production stack..."
    docker-compose --profile production --profile monitoring up -d
    
    print_success "Production deployment complete!"
    print_info "Services available:"
    echo "  - API: http://localhost"
    echo "  - Monitoring: http://localhost:3000 (admin/admin)"
    echo "  - Metrics: http://localhost:9090"
}

show_status() {
    print_info "Checking API server status..."
    
    # Check if running via Docker
    if docker-compose ps voicetransl-api 2>/dev/null | grep -q "Up"; then
        print_success "Docker container is running"
        docker-compose logs --tail=10 voicetransl-api
    else
        print_info "Docker container is not running"
    fi
    
    # Check if running standalone
    if curl -s http://localhost:${DEFAULT_PORT}/health >/dev/null 2>&1; then
        print_success "API server is responding at http://localhost:${DEFAULT_PORT}"
    else
        print_warning "API server is not responding at http://localhost:${DEFAULT_PORT}"
    fi
}

show_help() {
    echo "VoiceTransl API Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  standalone    Deploy standalone API server"
    echo "  docker        Deploy with Docker"
    echo "  production    Deploy production setup with monitoring"
    echo "  status        Check deployment status"
    echo "  stop          Stop all services"
    echo "  logs          Show recent logs"
    echo "  help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0 standalone"
    echo "  $0 docker"
    echo "  $0 production"
}

stop_services() {
    print_info "Stopping services..."
    
    # Stop Docker services
    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        print_success "Docker services stopped"
    fi
    
    # Kill standalone processes (if any)
    pkill -f "api.main" 2>/dev/null || true
    pkill -f "uvicorn.*api.main" 2>/dev/null || true
    
    print_success "All services stopped"
}

show_logs() {
    if docker-compose ps voicetransl-api 2>/dev/null | grep -q "Up"; then
        print_info "Showing Docker logs..."
        docker-compose logs -f voicetransl-api
    elif [ -f "logs/api.log" ]; then
        print_info "Showing standalone logs..."
        tail -f logs/api.log
    else
        print_warning "No logs found"
    fi
}

# Main script
print_header

case "${1:-help}" in
    standalone)
        deploy_standalone
        ;;
    docker)
        deploy_docker
        ;;
    production)
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
    help|*)
        show_help
        ;;
esac
