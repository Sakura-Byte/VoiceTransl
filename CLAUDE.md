# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VoiceTransl is a comprehensive AI-powered video subtitle generation and translation tool. It provides an end-to-end solution for video processing, from downloading videos to generating subtitles and translations.

## Development Environment Setup

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Build the application**:
   ```bash
   pyinstaller app.spec
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```

## Architecture Overview

### Core Components

- **app.py**: Main PyQt5 GUI application with fluent design interface
- **GalTransl/**: Translation engine core (fork of GalTransl project)
  - **Backend/**: Translation backends (GPT, Sakura, Bing, etc.)
  - **Frontend/**: Translation frontend logic
  - **Runner.py**: Main translation execution engine
- **Plugins System**: Extensible plugin architecture for file formats and text processing
- **Utility Scripts**:
  - `prompt2srt.py`: Convert prompt files to SRT/LRC subtitles
  - `srt2prompt.py`: Convert SRT files to prompt format
  - `summarize.py`: Subtitle summarization functionality

### Translation Backends

The application supports multiple translation engines:
- **Online Models**: OpenAI-compatible APIs (DeepSeek, Moonshot, GLM, etc.)
- **Local Models**: Sakura, GalTransl, Ollama, Llama.cpp
- **Speech Recognition**: Whisper.cpp and faster-whisper

### Plugin Architecture

Located in `plugins/` directory:
- **File Plugins**: Handle different file formats (SRT, JSON, etc.)
- **Text Plugins**: Process text content (normalization, fixes, etc.)
- Plugin naming: `[file|text]_[type]_[purpose]`

## Configuration

- **project/config.yaml**: Main configuration file with translation settings
- **config.txt**: GUI application settings (saved automatically)
- Plugin configurations are in individual `.yaml` files

## External Dependencies

The application includes several external tools:
- **ffmpeg.exe**: Audio/video processing
- **llama/**: Llama.cpp inference engine
- **whisper/**: Whisper.cpp speech recognition
- **whisper-faster/**: Faster-whisper alternative

## Key Features

1. **Multi-modal Input**: Supports audio, video, and subtitle files
2. **Batch Processing**: Handles multiple files and URLs
3. **GPU Acceleration**: AMD/NVIDIA/Intel GPU support
4. **Multiple Output Formats**: SRT, LRC subtitles
5. **Dictionary Support**: Custom translation dictionaries
6. **Video Integration**: Download from YouTube/Bilibili

## Development Notes

- The application uses PyQt5 with qfluentwidgets for the UI
- Translation logic is async-based using asyncio
- Plugin system allows for easy extension of supported formats
- Configuration is managed through YAML files
- Logging is redirected to log.txt for debugging

## Common Tasks

- Add new translation backend: Extend `GalTransl/Backend/` directory
- Add new file format support: Create plugin in `plugins/` directory
- Modify UI: Edit `app.py` and related UI components
- Update translation logic: Modify `GalTransl/Runner.py`