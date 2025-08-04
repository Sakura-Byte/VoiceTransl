# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceTransl is a comprehensive offline AI video subtitle generation and translation software that supports both GUI and REST API modes. It integrates multiple transcription and translation backends including local models (Whisper, Sakura, GalTransl) and online APIs (OpenAI, Gemini, DeepSeek, etc.).

## Development Commands

### Python Environment
- **Install dependencies**: `pip install -r requirements.txt` or `uv sync`
- **Install API dependencies**: `pip install -r requirements-api.txt`
- **Run GUI application**: `python app.py`
- **Run API server**: `python -m api.main`

### Testing
- **Run tests**: `pytest tests/`
- **Run API integration tests**: `python test_integration.py`
- **Run tests with coverage**: `pytest --cov=api tests/`

### Building
- **Build executable**: `pyinstaller app.spec`
- **Separate UVR build**: `pyinstaller separate.py --onefile --distpath uvr`

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

#### GUI Application (`app.py`)
- **MainWindow**: PyQt6-based GUI with multiple tabs (main, settings, dictionary, API server)
- **MainWorker**: Background thread handling transcription and translation tasks
- **Configuration Management**: Loads/saves settings from `config.txt` and various config files

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

- `api/`: REST API implementation
- `GalTransl/`: Translation engine and backends
- `llama/`: Local LLaMA models and executable
- `project/`: Working directory with configs, cache, and I/O files
- `whisper/`: Whisper model files
- `tests/`: Test suites for API endpoints

### Configuration Files

- `config.txt`: Main GUI configuration (translator, language, tokens, model settings)
- `project/config.yaml`: GalTransl translation configuration
- `anime_whisper_config.txt`: AnimeWhisper-specific settings
- `llama/param.txt`: LLaMA.cpp command line parameters
- `project/dict_*.txt`: Translation dictionaries (pre, gpt, after)
- `project/extra_prompt.txt`: Additional translation prompts

### Data Flow

1. **Input Processing**: Audio/video files or URLs → transcription → SRT/LRC format
2. **Translation Pipeline**: JSON format → GalTransl backend → translated JSON → final subtitle format
3. **API Mode**: Async task creation → background processing → result retrieval via task ID
4. **GUI Mode**: Real-time progress updates → file output to `project/cache/`

## Translation Integration

The project uses a modular translation system supporting:
- **Online APIs**: OpenAI-compatible endpoints, Gemini, DeepSeek, Moonshot, GLM, etc.
- **Local Models**: Sakura (Japanese), GalTransl, LLaMA.cpp-based models
- **Configuration Mapping**: `ONLINE_TRANSLATOR_MAPPING` in `app.py` defines API endpoints

## Testing Strategy

- **API Tests**: Comprehensive endpoint testing in `tests/test_api_endpoints.py`
- **Integration Tests**: End-to-end workflow testing in `test_integration.py`
- **Mock Services**: Use fixtures for testing without actual model dependencies
- **Validation**: LRC format validation, task response validation helpers

## Development Notes

- **Dual Mode Architecture**: Single codebase supports both GUI and API modes
- **Async Processing**: API uses FastAPI async/await patterns for task management
- **PyQt6 Integration**: GUI uses modern PyQt6 with Fluent Design widgets
- **Docker Support**: Production-ready containerization with monitoring stack
- **Error Handling**: Comprehensive error handling with structured JSON responses in API mode