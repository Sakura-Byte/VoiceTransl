# VoiceTransl Web API 使用说明

## 概述

VoiceTransl Web API 提供了一个HTTP接口，用于音频转录和翻译服务。该API基于FastAPI框架构建，支持多种翻译提供商和语言。

## 功能特性

- 🎤 **音频转录**: 使用 litagin/anime-whisper 模型进行高质量音频转录
- 🌍 **多语言支持**: 支持中文、英文、日文、韩文等多种语言
- 🔄 **智能翻译**: 自动检测音频语言，根据需要进行翻译
- 📝 **LRC字幕生成**: 生成标准LRC格式的字幕文件
- 🔧 **多翻译引擎**: 支持Sakura、GPT、Gemini、Ollama等多种翻译提供商

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动API服务

#### 方式一：GUI启动（推荐）
1. 运行主程序：`python app.py`
2. 切换到"Web API"标签页
3. 配置端口和主机地址
4. 点击"启动Web API"按钮

#### 方式二：命令行启动
```bash
python web_api.py --host 0.0.0.0 --port 8000
```

### 3. 测试API

```bash
python test_api.py http://localhost:8000
```

## API 端点

### 基础端点

#### GET `/` - API信息
返回API基本信息

#### GET `/health` - 健康检查
检查API服务状态

#### GET `/languages` - 支持的语言
返回所有支持的语言列表

#### GET `/providers` - 翻译提供商
返回所有可用的翻译提供商

#### GET `/whisper-models` - Whisper模型
返回所有可用的Whisper引擎类型和模型

### 核心端点

#### POST `/transcribe-translate` - 转录翻译

**请求参数:**
- `audio_file` (file): 音频文件（支持常见音频格式）
- `target_language` (string): 目标语言代码（如: zh-CN, en-US, ja-JP）
- `provider` (string, 可选): 翻译提供商（默认: sakura）
- `whisper_type` (string, 可选): Whisper引擎类型（默认: anime-whisper）
- `whisper_model` (string, 可选): Whisper模型名称（默认: litagin/anime-whisper）

**响应格式:**
```json
{
    "success": true,
    "message": "Processing completed successfully",
    "detected_language": "ja-JP",
    "target_language": "zh-CN",
    "provider": "sakura",
    "whisper_type": "anime-whisper",
    "whisper_model": "litagin/anime-whisper",
    "lrc_content": "[00:01.23]这是翻译后的文本",
    "processing_time": 15.67
}
```

## 支持的语言

| 语言代码 | 语言名称 |
|---------|---------|
| zh-CN | 中文（简体）|
| zh-TW | 中文（繁体）|
| en-US | 英文 |
| ja-JP | 日文 |
| ko-KR | 韩文 |
| es-ES | 西班牙文 |
| fr-FR | 法文 |
| de-DE | 德文 |
| it-IT | 意大利文 |
| pt-BR | 葡萄牙文 |
| ru-RU | 俄文 |
| ar-SA | 阿拉伯文 |
| th-TH | 泰文 |
| vi-VN | 越南文 |

## 翻译提供商

| 提供商 | 说明 |
|--------|------|
| sakura | Sakura LLM (推荐用于日文) |
| gpt3 | GPT-3.5 |
| gpt4 | GPT-4 |
| gemini | Google Gemini |
| ollama | Ollama 本地模型 |

## Whisper引擎类型

| 引擎类型 | 说明 | 推荐用途 |
|---------|------|---------|
| anime-whisper | litagin/anime-whisper (transformers) | 动漫/日文语音，高质量转录 |
| faster-whisper | Faster Whisper (Python) | 快速处理，支持多种模型 |
| whisper-cpp | Whisper.cpp (本地二进制) | 本地处理，低资源消耗 |

## 使用示例

### cURL 示例

```bash
# 健康检查
curl http://localhost:8000/health

# 获取支持的语言
curl http://localhost:8000/languages

# 音频转录翻译
curl -X POST \
  http://localhost:8000/transcribe-translate \
  -F "audio_file=@test.wav" \
  -F "target_language=zh-CN" \
  -F "provider=sakura" \
  -F "whisper_type=anime-whisper" \
  -F "whisper_model=litagin/anime-whisper"

# 获取可用的Whisper模型
curl http://localhost:8000/whisper-models
```

### Python 示例

```python
import requests

# 健康检查
response = requests.get("http://localhost:8000/health")
print(response.json())

# 音频转录翻译
with open("test.wav", "rb") as f:
    files = {"audio_file": f}
    data = {
        "target_language": "zh-CN",
        "provider": "sakura",
        "whisper_type": "anime-whisper",
        "whisper_model": "litagin/anime-whisper"
    }
    response = requests.post(
        "http://localhost:8000/transcribe-translate",
        files=files,
        data=data
    )
    result = response.json()
    if result["success"]:
        print("LRC内容:", result["lrc_content"])
    else:
        print("处理失败:", result["message"])
```

### JavaScript 示例

```javascript
// 健康检查
fetch('http://localhost:8000/health')
  .then(response => response.json())
  .then(data => console.log(data));

// 音频转录翻译
const formData = new FormData();
formData.append('audio_file', audioFile);
formData.append('target_language', 'zh-CN');
formData.append('provider', 'sakura');
formData.append('whisper_type', 'anime-whisper');
formData.append('whisper_model', 'litagin/anime-whisper');

fetch('http://localhost:8000/transcribe-translate', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(result => {
  if (result.success) {
    console.log('LRC内容:', result.lrc_content);
  } else {
    console.error('处理失败:', result.message);
  }
});
```

## 配置说明

### GUI配置项

在"Web API"标签页中可以配置：

- **启用状态**: 启用/禁用Web API服务
- **端口**: API服务端口（默认: 8000）
- **主机地址**: API服务主机地址（默认: 0.0.0.0）
- **默认翻译提供商**: 默认使用的翻译服务
- **支持的语言**: 逗号分隔的语言代码列表
- **API密钥**: 可选的API认证密钥
- **最大文件大小**: 上传文件大小限制（MB）

### 环境变量

可以通过环境变量覆盖默认配置：

```bash
export WEBAPI_HOST=0.0.0.0
export WEBAPI_PORT=8000
export WEBAPI_MAX_FILE_SIZE=100
```

## 错误处理

API使用标准HTTP状态码：

- `200`: 成功
- `400`: 请求参数错误
- `422`: 数据验证错误
- `500`: 服务器内部错误

错误响应格式：
```json
{
    "success": false,
    "message": "错误描述",
    "detail": "详细错误信息"
}
```

## 性能优化

### 建议配置

- **GPU加速**: 使用NVIDIA GPU可以显著提升处理速度
- **批处理**: 对于多个文件，建议分批处理
- **文件格式**: 推荐使用WAV格式以获得最佳效果
- **文件大小**: 建议单个文件不超过100MB

### 监控指标

API返回的处理时间可用于性能监控：
- 音频转录时间
- 翻译处理时间
- 总处理时间

## 常见问题

### Q: API启动失败怎么办？
A: 检查端口是否被占用，确保所有依赖已正确安装。

### Q: 音频文件上传失败？
A: 确认文件格式支持，检查文件大小是否超过限制。

### Q: 翻译质量不佳？
A: 尝试使用不同的翻译提供商，确保配置正确。

### Q: 处理速度慢？
A: 检查是否启用GPU加速，考虑使用更小的音频文件进行测试。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础音频转录和翻译功能
- 集成多种翻译提供商
- 提供完整的GUI配置界面

## 技术支持

如有问题，请查看：
1. 日志文件：`log.txt`
2. 配置文件：`config.txt`
3. 项目配置：`project/config.yaml`

## 许可证

本项目遵循原VoiceTransl项目的许可证条款。