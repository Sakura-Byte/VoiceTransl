#!/bin/bash

# VoiceTransl Development Environment Setup Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  VoiceTransl Dev Environment${NC}"
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

install_node_dependencies() {
    print_info "Setting up Node.js environment..."
    
    cd voicetransl-ui
    
    # Check if pnpm is available
    if command -v pnpm &> /dev/null; then
        print_info "Using pnpm for faster installation"
        pnpm install
        pnpm run type-check
    else
        print_info "Using npm"
        npm ci
        npm run type-check
    fi
    
    cd ..
    print_success "Node.js environment setup complete"
}

install_python_dependencies() {
    print_info "Setting up Python environment..."
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment"
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    if [ -f "requirements-api.txt" ]; then
        pip install -r requirements-api.txt
    fi
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    
    print_success "Python environment setup complete"
}

setup_pre_commit_hooks() {
    print_info "Setting up pre-commit hooks..."
    
    # Install pre-commit if not available
    if ! command -v pre-commit &> /dev/null; then
        pip install pre-commit
    fi
    
    # Install hooks
    pre-commit install
    
    # Run on all files once
    pre-commit run --all-files || true
    
    print_success "Pre-commit hooks setup complete"
}

create_dev_config() {
    print_info "Creating development configuration..."
    
    # Create main .env file
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
# VoiceTransl Development Configuration
API_HOST=127.0.0.1
API_PORT=8000
API_RELOAD=true
API_LOG_LEVEL=DEBUG
API_ENABLE_AUTH=false
API_MAX_CONCURRENT_TASKS=3
API_TEMP_DIR=temp
DEPLOY_ENV=development
EOF
        print_success "Created .env file"
    else
        print_info ".env file already exists"
    fi
    
    # Create UI .env file
    if [ ! -f "voicetransl-ui/.env" ]; then
        cat > voicetransl-ui/.env << 'EOF'
# VoiceTransl UI Development Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_TITLE="VoiceTransl [DEV]"
VITE_APP_VERSION="2.0.0-dev"
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEVTOOLS=true
VITE_SOURCEMAP=true
EOF
        print_success "Created UI .env file"
    else
        print_info "UI .env file already exists"
    fi
    
    # Create necessary directories
    mkdir -p temp logs ssl secrets
    
    print_success "Development configuration complete"
}

setup_git_hooks() {
    print_info "Setting up Git hooks..."
    
    # Create post-checkout hook to remind about dependencies
    cat > .git/hooks/post-checkout << 'EOF'
#!/bin/bash
echo "🔄 Checking if dependencies need to be updated..."

if [ -f "voicetransl-ui/package-lock.json" ]; then
    if [ "voicetransl-ui/package.json" -nt "voicetransl-ui/node_modules" ]; then
        echo "📦 UI dependencies may be outdated. Run 'cd voicetransl-ui && npm ci'"
    fi
fi

if [ -f "requirements-api.txt" ]; then
    if [ "requirements-api.txt" -nt "venv/pyvenv.cfg" ]; then
        echo "🐍 Python dependencies may be outdated. Run 'source venv/bin/activate && pip install -r requirements-api.txt'"
    fi
fi
EOF
    
    chmod +x .git/hooks/post-checkout
    print_success "Git hooks setup complete"
}

create_dev_scripts() {
    print_info "Creating development helper scripts..."
    
    mkdir -p scripts
    
    # Create start-dev script
    cat > scripts/start-dev.sh << 'EOF'
#!/bin/bash
# Start both API and UI in development mode

set -e

echo "🚀 Starting VoiceTransl development servers..."

# Kill existing processes
pkill -f "uvicorn.*api.main" || true
pkill -f "vite.*dev" || true

# Start API in background
echo "📡 Starting API server..."
source venv/bin/activate
python -m api.main &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start UI
echo "🎨 Starting UI development server..."
cd voicetransl-ui
npm run dev &
UI_PID=$!

cd ..

echo "✅ Development servers started:"
echo "  - API: http://localhost:8000"
echo "  - UI: http://localhost:5175"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap 'echo "🛑 Stopping servers..."; kill $API_PID $UI_PID; exit' INT
wait
EOF
    
    chmod +x scripts/start-dev.sh
    
    # Create test script
    cat > scripts/run-tests.sh << 'EOF'
#!/bin/bash
# Run all tests for the project

set -e

echo "🧪 Running VoiceTransl test suite..."

# Python tests
echo "🐍 Running Python tests..."
source venv/bin/activate
if [ -d "tests" ]; then
    pytest tests/ -v
else
    echo "No Python tests found"
fi

# Frontend tests
echo "🎨 Running Frontend tests..."
cd voicetransl-ui
if command -v pnpm &> /dev/null; then
    pnpm run test:run
else
    npm run test:run
fi

echo "✅ All tests completed"
EOF
    
    chmod +x scripts/run-tests.sh
    
    print_success "Development scripts created"
}

main() {
    print_header
    
    print_info "Setting up VoiceTransl development environment..."
    
    # Check if we're in the right directory
    if [ ! -d "api" ] || [ ! -d "voicetransl-ui" ]; then
        print_error "Please run this script from the VoiceTransl root directory"
        exit 1
    fi
    
    install_python_dependencies
    install_node_dependencies
    create_dev_config
    setup_pre_commit_hooks
    setup_git_hooks
    create_dev_scripts
    
    print_success "Development environment setup complete! 🎉"
    echo
    print_info "Next steps:"
    echo "  1. Start development servers: ./scripts/start-dev.sh"
    echo "  2. Run tests: ./scripts/run-tests.sh"
    echo "  3. Build for production: ./deploy.sh standalone"
    echo
    print_info "Useful commands:"
    echo "  - API only: python -m api.main"
    echo "  - UI only: cd voicetransl-ui && npm run dev"
    echo "  - Full deployment: ./deploy.sh docker"
}

main "$@"