# VoiceTransl REST API Documentation

## Overview

VoiceTransl provides a comprehensive REST API for audio transcription and translation services. The API supports both file uploads and URL-based processing, with asynchronous task management for long-running operations.

### Key Features

- **Offline Processing**: Supports local AI models (Whisper, Sakura, etc.)
- **Multiple Input Methods**: File uploads, URLs, or direct content
- **Asynchronous Tasks**: Non-blocking task processing with status tracking
- **Multiple Output Formats**: LRC, SRT, JSON formats
- **Language Support**: Japanese source with translation to multiple target languages
- **Flexible Translation**: Multiple translator backends (local models and online APIs)

## Base Information

- **Base URL**: `http://localhost:8000` (default)
- **API Version**: `1.0.0`
- **Content-Type**: `application/json` (except for file uploads)
- **Authentication**: None required for basic usage

## Interactive Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error description",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found (task/resource not found)
- `405` - Method Not Allowed
- `422` - Validation Error
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

The API implements rate limiting with the following headers:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

---

## Transcription Endpoints

### Create Transcription Task

**POST** `/api/transcribe`

Creates a new transcription task for audio/video content.

#### Request Methods

##### Method 1: JSON with URL

```json
{
  "url": "https://example.com/audio.mp3",
  "output_format": "lrc"
}
```

##### Method 2: Multipart Form with File

```bash
curl -X POST "http://localhost:8000/api/transcribe" \
  -F "file=@audio.wav" \
  -F "output_format=lrc"
```

##### Method 3: Multipart Form with URL

```bash
curl -X POST "http://localhost:8000/api/transcribe" \
  -F "url=https://example.com/audio.mp3" \
  -F "output_format=lrc"
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | No* | URL to audio/video file |
| `file` | file | No* | Audio/video file upload |
| `output_format` | string | No | Output format: `lrc` (default), `srt`, `json` |

*Either `url` or `file` is required.

#### Response

```json
{
  "success": true,
  "task_id": "uuid-string",
  "status": "pending",
  "task_type": "transcription",
  "message": "Transcription task created successfully",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### File Size Limits

- Maximum file size: 1GiB
- Supported formats: MP3, WAV, M4A, FLAC, OGG, MP4, AVI, MKV

### Get Transcription Status

**GET** `/api/transcribe/{task_id}/status`

Retrieves the current status of a transcription task.

#### Response

```json
{
  "task_id": "uuid-string",
  "status": "processing",
  "progress": 0.65,
  "current_step": "Audio alignment in progress",
  "estimated_time_remaining": 120.5,
  "timestamp": "2025-01-01T12:00:00Z",
  "metadata": {
    "duration": 300.0,
    "language": "ja",
    "model_used": "hybrid-whisper",
    "file_size": 5242880,
    "file_type": "audio/wav"
  }
}
```

#### Status Values

- `pending` - Task queued for processing
- `processing` - Task currently being processed
- `completed` - Task completed successfully
- `failed` - Task failed with errors
- `cancelled` - Task was cancelled

### Get Transcription Result

**GET** `/api/transcribe/{task_id}/result`

Retrieves the result of a completed transcription task.

#### Response (Success)

```json
{
  "task_id": "uuid-string",
  "status": "completed",
  "task_type": "transcription",
  "result": {
    "lrc_content": "[00:00.00]こんにちは\n[00:02.50]世界",
    "entries": [
      {
        "start": 0.0,
        "end": 2.5,
        "text": "こんにちは"
      },
      {
        "start": 2.5,
        "end": 5.0,
        "text": "世界"
      }
    ],
    "metadata": {
      "duration": 300.0,
      "language": "ja",
      "model_used": "hybrid-whisper",
      "processing_time": 45.2,
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:01:30Z"
    }
  }
}
```

### Cancel Transcription Task

**DELETE** `/api/transcribe/{task_id}`

Cancels a pending or processing transcription task.

#### Response

```json
{
  "message": "Task uuid-string cancelled successfully"
}
```

---

## Translation Endpoints

### Create Translation Task

**POST** `/api/translate`

Creates a new translation task for LRC content.

#### Request

```json
{
  "lrc_content": "[00:00.00]こんにちは\n[00:02.50]世界",
  "target_language": "zh-cn",
  "translator": "gpt-custom",
  "translation_config": {
    "gpt_address": "https://api.openai.com/v1/chat/completions",
    "gpt_model": "gpt-4",
    "custom_prompt": "Translate naturally"
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lrc_content` | string | Yes | LRC format content to translate |
| `target_language` | string | No | Target language code (default: `zh-cn`) |
| `translator` | string | No | Translator to use (uses GUI config if not specified) |
| `translation_config` | object | No | Custom translation settings |

#### Supported Languages

- `zh-cn` - Chinese Simplified (default)
- `zh-tw` - Chinese Traditional
- `en` - English
- `ko` - Korean
- `ru` - Russian
- `fr` - French

#### Response

```json
{
  "success": true,
  "task_id": "uuid-string",
  "status": "pending",
  "task_type": "translation",
  "message": "Translation task created successfully",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Get Translation Status

**GET** `/api/translate/{task_id}/status`

#### Response

```json
{
  "task_id": "uuid-string",
  "status": "processing",
  "progress": 0.4,
  "current_entry": 15,
  "total_entries": 42,
  "estimated_time_remaining": 85.0,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Get Translation Result

**GET** `/api/translate/{task_id}/result`

#### Response

```json
{
  "task_id": "uuid-string",
  "status": "completed",
  "task_type": "translation",
  "result": {
    "lrc_content": "[00:00.00]你好\n[00:02.50]世界",
    "entries": [
      {
        "start": 0.0,
        "end": 2.5,
        "original_text": "こんにちは",
        "translated_text": "你好",
        "confidence": 0.95
      },
      {
        "start": 2.5,
        "end": 5.0,
        "original_text": "世界",
        "translated_text": "世界",
        "confidence": 0.98
      }
    ],
    "metadata": {
      "duration": 300.0,
      "language": "ja",
      "processing_time": 25.8
    },
    "total_entries": 2,
    "successful_translations": 2,
    "failed_translations": 0
  }
}
```

### Get Supported Translators

**GET** `/api/translators`

#### Response

```json
{
  "success": true,
  "translators": {
    "不进行翻译": "No translation",
    "gpt-custom": "Online API: gpt-custom",
    "sakura-009": "Sakura 0.09",
    "sakura-010": "Sakura 0.10",
    "deepseek-chat": "Online API: deepseek-chat",
    "moonshot-v1-8k": "Online API: moonshot-v1-8k"
  },
  "current_translator": "不进行翻译",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Cancel Translation Task

**DELETE** `/api/translate/{task_id}`

---

## Task Management Endpoints

### Get Task Status (Generic)

**GET** `/api/status/{task_id}`

Works for both transcription and translation tasks.

### Get Task Result (Generic)

**GET** `/api/result/{task_id}`

### List Tasks

**GET** `/api/tasks`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `task_type` | string | Filter by task type: `transcription`, `translation` |
| `status` | string | Filter by status: `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `limit` | integer | Maximum number of tasks (1-1000, default: 100) |
| `offset` | integer | Number of tasks to skip (default: 0) |

#### Response

```json
{
  "tasks": [
    {
      "task_id": "uuid-1",
      "status": "completed",
      "task_type": "transcription",
      "created_at": "2025-01-01T12:00:00Z"
    },
    {
      "task_id": "uuid-2",
      "status": "processing",
      "task_type": "translation",
      "created_at": "2025-01-01T12:05:00Z"
    }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

### Cancel Task (Generic)

**DELETE** `/api/tasks/{task_id}`

### Get Task Statistics

**GET** `/api/stats`

#### Response

```json
{
  "total_tasks": 150,
  "active_tasks": 3,
  "status_counts": {
    "pending": 1,
    "processing": 2,
    "completed": 140,
    "failed": 5,
    "cancelled": 2
  },
  "task_type_counts": {
    "transcription": 75,
    "translation": 75
  }
}
```

---

## Configuration Endpoints

### Get Full Configuration

**GET** `/api/config`

#### Response

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 8000,
    "max_concurrent_tasks": 4,
    "rate_limit_requests": 60,
    "rate_limit_window": 60,
    "max_file_size": 1073741824,
    "version": "1.0.0"
  },
  "transcription": {
    "language": "ja",
    "output_format": "lrc",
    "backend": "hybrid"
  },
  "translation": {
    "translator": "不进行翻译",
    "gpt_address": "",
    "gpt_model": ""
  },
  "gui_integration": {
    "initialized": true
  }
}
```

### Update Configuration

**POST** `/api/config`

#### Request

```json
{
  "translation": {
    "translator": "gpt-custom",
    "gpt_address": "https://api.openai.com/v1/chat/completions",
    "gpt_model": "gpt-4"
  }
}
```

#### Response

```json
{
  "success": true,
  "updated_sections": ["translation"],
  "restart_required": false,
  "warnings": null,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Get Server Configuration

**GET** `/api/config/server`

#### Response

```json
{
  "success": true,
  "host": "127.0.0.1",
  "port": 8000,
  "max_concurrent_tasks": 4,
  "rate_limit_requests": 60,
  "rate_limit_window": 60,
  "max_file_size": 1073741824,
  "supported_formats": ["mp3", "wav", "m4a", "flac", "ogg", "mp4", "avi", "mkv"],
  "version": "1.0.0",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Get Transcription Configuration

**GET** `/api/config/transcription`

#### Response

```json
{
  "success": true,
  "default_language": "ja",
  "default_output_format": "lrc",
  "available_backends": ["anime-whisper", "hybrid", "tiny-whisper"],
  "current_backend": "hybrid",
  "backend_settings": {
    "use_hybrid": true,
    "alignment_backend": "qwen3"
  },
  "supported_languages": ["ja", "en", "zh-cn", "zh-tw", "ko", "ru", "fr"],
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Get Translation Configuration

**GET** `/api/config/translation`

#### Response

```json
{
  "success": true,
  "available_translators": {
    "不进行翻译": "No translation",
    "gpt-custom": "Custom GPT",
    "sakura-009": "Sakura 0.09"
  },
  "current_translator": "不进行翻译",
  "default_target_language": "zh-cn",
  "translator_settings": {
    "gpt_address": "",
    "gpt_model": "",
    "sakura_file": "",
    "sakura_mode": 0
  },
  "supported_languages": ["ja", "en", "zh-cn", "zh-tw", "ko", "ru", "fr"],
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## Health and System Status

### Health Check

**GET** `/health`

#### Response

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Detailed Health Check

**GET** `/api/health`

#### Response

```json
{
  "success": true,
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "api_server": "healthy",
    "task_manager": "healthy",
    "gui_integration": "healthy"
  },
  "checks": {
    "database_connection": true,
    "file_system": true,
    "memory": true
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### System Status

**GET** `/api/system/status`

#### Response

```json
{
  "success": true,
  "server_status": "running",
  "active_tasks": 2,
  "total_tasks_processed": 1250,
  "uptime": 86400.0,
  "memory_usage": {
    "total": 8589934592,
    "available": 4294967296,
    "percent": 50.0
  },
  "disk_usage": {
    "total": 1099511627776,
    "free": 549755813888,
    "percent": 50.0
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## Complete Workflow Examples

### Example 1: URL-based Transcription and Translation

```bash
# 1. Create transcription task
curl -X POST "http://localhost:8000/api/transcribe" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/japanese_audio.mp3",
    "output_format": "lrc"
  }'

# Response: {"task_id": "abc123", "status": "pending", ...}

# 2. Check transcription status
curl "http://localhost:8000/api/transcribe/abc123/status"

# 3. Get transcription result (when completed)
curl "http://localhost:8000/api/transcribe/abc123/result"

# 4. Create translation task using LRC content
curl -X POST "http://localhost:8000/api/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "lrc_content": "[00:00.00]こんにちは世界\n[00:03.00]今日はいい天気ですね",
    "target_language": "zh-cn",
    "translator": "gpt-custom"
  }'

# Response: {"task_id": "def456", "status": "pending", ...}

# 5. Get translation result
curl "http://localhost:8000/api/translate/def456/result"
```

### Example 2: File Upload Transcription

```bash
# Upload audio file for transcription
curl -X POST "http://localhost:8000/api/transcribe" \
  -F "file=@./my_audio.wav" \
  -F "output_format=srt"
```

### Example 3: Task Management

```bash
# List all tasks
curl "http://localhost:8000/api/tasks"

# List only transcription tasks
curl "http://localhost:8000/api/tasks?task_type=transcription"

# List completed tasks with pagination
curl "http://localhost:8000/api/tasks?status=completed&limit=10&offset=0"

# Get task statistics
curl "http://localhost:8000/api/stats"

# Cancel a task
curl -X DELETE "http://localhost:8000/api/tasks/abc123"
```

### Example 4: Configuration Management

```bash
# Get current configuration
curl "http://localhost:8000/api/config"

# Update translation settings
curl -X POST "http://localhost:8000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "translation": {
      "translator": "gpt-custom",
      "gpt_address": "https://api.openai.com/v1/chat/completions",
      "gpt_model": "gpt-4"
    }
  }'

# Get supported translators
curl "http://localhost:8000/api/translators"
```

---

## Python Client Example

```python
import requests
import time
import json

class VoiceTranslClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def transcribe_url(self, url, output_format="lrc"):
        """Transcribe audio from URL"""
        response = requests.post(
            f"{self.base_url}/api/transcribe",
            json={"url": url, "output_format": output_format}
        )
        return response.json()
    
    def transcribe_file(self, file_path, output_format="lrc"):
        """Transcribe audio from file"""
        with open(file_path, 'rb') as f:
            files = {"file": f}
            data = {"output_format": output_format}
            response = requests.post(
                f"{self.base_url}/api/transcribe",
                files=files,
                data=data
            )
        return response.json()
    
    def translate_lrc(self, lrc_content, target_language="zh-cn", translator=None):
        """Translate LRC content"""
        payload = {
            "lrc_content": lrc_content,
            "target_language": target_language
        }
        if translator:
            payload["translator"] = translator
        
        response = requests.post(
            f"{self.base_url}/api/translate",
            json=payload
        )
        return response.json()
    
    def wait_for_task(self, task_id, task_type="transcription", timeout=300):
        """Wait for task completion"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status_response = requests.get(
                f"{self.base_url}/api/{task_type}/{task_id}/status"
            )
            status_data = status_response.json()
            
            if status_data["status"] in ["completed", "failed", "cancelled"]:
                break
            
            time.sleep(2)
        
        # Get final result
        result_response = requests.get(
            f"{self.base_url}/api/{task_type}/{task_id}/result"
        )
        return result_response.json()
    
    def get_task_status(self, task_id):
        """Get task status (works for any task type)"""
        response = requests.get(f"{self.base_url}/api/status/{task_id}")
        return response.json()

# Usage example
client = VoiceTranslClient()

# Transcribe and translate workflow
print("Starting transcription...")
transcribe_result = client.transcribe_url("https://example.com/audio.mp3")
task_id = transcribe_result["task_id"]

print(f"Waiting for transcription task {task_id}...")
transcription = client.wait_for_task(task_id, "transcription")

if transcription["status"] == "completed":
    lrc_content = transcription["result"]["lrc_content"]
    
    print("Starting translation...")
    translate_result = client.translate_lrc(lrc_content, "zh-cn", "gpt-custom")
    translate_task_id = translate_result["task_id"]
    
    print(f"Waiting for translation task {translate_task_id}...")
    translation = client.wait_for_task(translate_task_id, "translation")
    
    if translation["status"] == "completed":
        print("Translation completed!")
        print(translation["result"]["lrc_content"])
    else:
        print(f"Translation failed: {translation.get('error', 'Unknown error')}")
else:
    print(f"Transcription failed: {transcription.get('error', 'Unknown error')}")
```

---

## WebSocket Support (Future)

*Note: WebSocket support is planned for real-time status updates but not currently implemented.*

Planned WebSocket endpoint: `ws://localhost:8000/ws/tasks/{task_id}`

---

## API Limits and Considerations

### Resource Limits

- **File Size**: 1GiB maximum per upload
- **Concurrent Tasks**: Configurable (default: 4)
- **Task Retention**: Tasks are kept in memory until server restart
- **Rate Limiting**: 60 requests per minute by default

### Best Practices

1. **Polling Frequency**: Check task status every 2-5 seconds
2. **Error Handling**: Always check `success` field in responses
3. **File Formats**: Use WAV or FLAC for best transcription quality
4. **Task Management**: Cancel unnecessary tasks to free resources
5. **Configuration**: Update translation settings before creating tasks

### Performance Notes

- **Transcription**: Processing time varies by audio length and quality
- **Translation**: Depends on translator backend and content length
- **Hybrid Backend**: Provides best quality but slower processing
- **Local Models**: Faster but may require initial download/setup

---

## Troubleshooting

### Common Issues

1. **Task Stuck in Processing**
   - Check system resources and restart server if needed
   - Cancel and recreate the task

2. **File Upload Fails**
   - Verify file size is under 1GiB
   - Check file format is supported
   - Ensure proper multipart form encoding

3. **Translation Fails**
   - Verify translator configuration
   - Check API keys for online translators
   - Validate LRC content format

4. **Rate Limit Exceeded**
   - Reduce request frequency
   - Check rate limit headers
   - Consider increasing limits in configuration

### Debugging

Enable debug logging by setting environment variable:
```bash
export LOG_LEVEL=DEBUG
python -m api.main
```

Check server logs for detailed error information.

---

## API Versioning

Current API version: `1.0.0`

Future versions will maintain backward compatibility where possible. Breaking changes will result in version increments and will be documented in release notes.