# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceTransl is a comprehensive offline AI video subtitle generation and translation software with a web-based interface and REST API. It integrates multiple transcription and translation backends including local models (Whisper, Sakura, GalTransl) and online APIs (OpenAI, Gemini, DeepSeek, etc.).

## Development Commands

### Python Environment
- **Install dependencies**: `pip install -r requirements.txt` or `uv sync`
- **Install API dependencies**: `pip install -r requirements-api.txt`
- **Run web interface**: `python start_web_interface.py`
- **Run API server**: `python -m api.main`

### Frontend Development (voicetransl-ui/)
- **Install dependencies**: `npm install`
- **Development server**: `npm run dev`
- **Build production**: `npm run build`
- **Preview production**: `npm run preview`
- **Type checking**: `npm run type-check`
- **Linting**: `npm run lint` / `npm run lint:fix`
- **Formatting**: `npm run format` / `npm run format:check`

### Testing
- **Run Python tests**: `pytest tests/`
- **Run API integration tests**: `python test_integration.py`
- **Run tests with coverage**: `pytest --cov=api tests/`
- **Run frontend tests**: `cd voicetransl-ui && npm run test`
- **Run specific test suites**: `npm run test:components`, `npm run test:hooks`
- **Run frontend tests with coverage**: `npm run test:coverage`


### Docker Operations
- **Build API container**: `docker-compose build voicetransl-api`
- **Start API service**: `docker-compose up -d voicetransl-api`
- **View logs**: `docker-compose logs -f voicetransl-api`
- **Stop services**: `docker-compose down`

### Deployment
- **Deploy standalone API**: `./deploy.sh standalone`
- **Deploy with Docker**: `./deploy.sh docker`
- **Deploy production setup**: `./deploy.sh production`
- **Check deployment status**: `./deploy.sh status`

## Architecture

### Core Components

#### Web Interface (`voicetransl-ui/`)
- **React + TypeScript**: Modern web interface built with Vite, shadcn/ui components
- **Real-time Updates**: WebSocket integration for live task progress and server status
- **Responsive Design**: Mobile-friendly interface with dark/light theme support
- **State Management**: Zustand for client state, React Query for server state
- **Configuration Management**: Web-based configuration through API endpoints
- **Testing**: Vitest with React Testing Library, MSW for API mocking

#### API Server (`api/`)
- **FastAPI Application**: REST API endpoints for transcription and translation
- **Task Manager**: Async task processing with status tracking
- **Core Services**: File validation, input processing, response formatting
- **Routers**: Organized endpoints for transcription, translation, tasks, and configuration

#### Translation Backends (`GalTransl/`)
- **Multiple Translators**: Support for GPT, Sakura, DeepSeek, Moonshot, GLM, etc.
- **Configuration**: YAML-based configuration system in `project/config.yaml`
- **Caching**: Translation cache system in `project/transl_cache/`

#### Transcription System
- **Hybrid Backend**: Combines TinyWhisper (timestamps) + AnimeWhisper (text) + AI alignment
- **Multiple Backends**: backends/anime_whisper_backend.py, backends/tiny_whisper_backend.py, backends/hybrid_transcription_backend.py
- **Alignment Options**: Local Qwen3, OpenAI API, or Gemini API for text alignment

### Key Directories

- `api/`: REST API implementation (FastAPI server)
- `voicetransl-ui/`: React frontend application (modern UI)
- `GalTransl/`: Translation engine and backends
- `backends/`: Transcription backend implementations (hybrid, whisper variants)
- `llama/`: Local LLaMA models and executable
- `project/`: Working directory with configs, cache, and I/O files
- `whisper/`: Whisper model files
- `tests/`: Test suites for API endpoints

### Configuration Files

- `config.yaml` / `config.yaml.example`: Main YAML configuration (replaces config.txt)
- `project/config.yaml`: GalTransl translation configuration
- `voicetransl-ui/vite.config.ts`: Frontend build configuration
- `voicetransl-ui/tailwind.config.js`: UI styling configuration
- `anime_whisper_config.txt`: AnimeWhisper-specific settings
- `llama/param.txt`: LLaMA.cpp command line parameters
- `project/dict_*.txt`: Translation dictionaries (pre, gpt, after)
- `project/extra_prompt.txt`: Additional translation prompts
- `docker-compose.yml`: Container orchestration for production deployment

### Data Flow

1. **Input Processing**: Audio/video files or URLs → transcription → SRT/LRC format
2. **Translation Pipeline**: JSON format → GalTransl backend → translated JSON → final subtitle format
3. **Web Interface**: React UI → API requests → async task creation → real-time progress via WebSocket
4. **API Mode**: Direct REST API access for programmatic integration
5. **Configuration Management**: YAML-based config system with migration from legacy config.txt

## Translation Integration

The project uses a modular translation system supporting:
- **Online APIs**: OpenAI-compatible endpoints, Gemini, DeepSeek, Moonshot, GLM, etc.
- **Local Models**: Sakura (Japanese), GalTransl, LLaMA.cpp-based models
- **Configuration Mapping**: `ONLINE_TRANSLATOR_MAPPING` in `app.py` defines API endpoints

## Testing Strategy

### Backend Testing
- **API Tests**: Comprehensive endpoint testing in `tests/test_api_endpoints.py`
- **Integration Tests**: End-to-end workflow testing in `test_integration.py`
- **Mock Services**: Use fixtures for testing without actual model dependencies
- **Validation**: LRC format validation, task response validation helpers

### Frontend Testing  
- **Component Tests**: Vitest + React Testing Library for UI components
- **Hook Tests**: Custom hooks testing with specialized test utilities
- **Integration Tests**: End-to-end user workflows with MSW API mocking
- **Coverage**: Minimum 70% coverage thresholds across all metrics
- **Performance**: Bundle analysis and size monitoring

## Development Notes

### Architecture Principles
- **Web-First Architecture**: Modern React frontend with FastAPI backend
- **Async Processing**: FastAPI async/await patterns for task management
- **Real-time Updates**: WebSocket integration for live progress monitoring  
- **Type Safety**: Full TypeScript coverage in frontend, Pydantic models in backend
- **Configuration Management**: YAML-based config system replacing legacy text files

### Development Workflow
- **Hot Reloading**: Vite dev server for frontend, uvicorn reload for API
- **Code Quality**: ESLint/Prettier for frontend, proper Python typing for backend
- **State Management**: Zustand for client state, React Query for server synchronization
- **Error Boundaries**: Comprehensive error handling in both frontend and API
- **Performance**: Code splitting, lazy loading, and bundle optimization

### Deployment Options
- **Development**: Separate frontend/backend servers with hot reload
- **Production**: Docker Compose with nginx proxy and monitoring stack
- **Standalone**: API-only mode for integration with external systems