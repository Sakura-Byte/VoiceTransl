# Anime-Whisper 离线安装指南

本指南将帮助您下载并配置 anime-whisper 模型以供 VoiceTransl 离线使用。

## 📋 系统要求

### 最低要求
- **Python**: 3.8 或更高版本
- **内存**: 至少 4GB RAM
- **存储**: 至少 5GB 可用空间
- **操作系统**: Windows 10/11, macOS, Linux

### 推荐配置（GPU 加速）
- **NVIDIA GPU**: 支持 CUDA 11.0+ 的显卡，至少 4GB VRAM
- **Apple Silicon**: M1/M2/M3 芯片（自动使用 MPS 加速）
- **AMD GPU**: 通过 ROCm 支持（Linux）

## 🚀 安装步骤

### 步骤 1: 安装依赖包

在项目根目录运行以下命令：

```bash
# 安装基础依赖
pip install -r requirements.txt

# 如果使用 NVIDIA GPU，确保安装正确的 PyTorch 版本
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118

# 如果使用 CPU 或 Apple Silicon
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### 步骤 2: 预下载模型（推荐）

为了确保完全离线使用，建议预先下载模型：

```python
# 运行此脚本预下载模型
from transformers import pipeline
import torch

print("开始下载 anime-whisper 模型...")

# 这将下载模型到本地缓存
pipe = pipeline(
    "automatic-speech-recognition",
    model="litagin/anime-whisper",
    device="cpu",  # 先用 CPU 下载
    torch_dtype=torch.float32,
)

print("模型下载完成！")
print(f"模型缓存位置: {pipe.model.config._name_or_path}")
```

将上述代码保存为 `download_model.py` 并运行：

```bash
python download_model.py
```

### 步骤 3: 验证安装

创建测试脚本 `test_anime_whisper.py`：

```python
from backends import AnimeWhisperBackend
import torch

def test_installation():
    print("=== Anime-Whisper 安装测试 ===")
    
    # 检查 PyTorch 安装
    print(f"PyTorch 版本: {torch.__version__}")
    print(f"CUDA 可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA 设备数量: {torch.cuda.device_count()}")
        print(f"当前 CUDA 设备: {torch.cuda.get_device_name()}")
    
    # 检查 MPS (Apple Silicon)
    if hasattr(torch.backends, 'mps'):
        print(f"MPS 可用: {torch.backends.mps.is_available()}")
    
    # 测试 anime-whisper 后端
    try:
        backend = AnimeWhisperBackend()
        if backend.initialize():
            print("✅ Anime-Whisper 初始化成功！")
            info = backend.get_backend_info()
            print(f"设备: {info['device']}")
            print(f"数据类型: {info['dtype']}")
            backend.cleanup()
        else:
            print("❌ Anime-Whisper 初始化失败")
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    test_installation()
```

运行测试：

```bash
python test_anime_whisper.py
```

## 📁 模型缓存位置

模型文件通常下载到以下位置：

### Windows
```
C:\Users\{用户名}\.cache\huggingface\hub\models--litagin--anime-whisper\
```

### macOS
```
/Users/{用户名}/.cache/huggingface/hub/models--litagin--anime-whisper/
```

### Linux
```
/home/{用户名}/.cache/huggingface/hub/models--litagin--anime-whisper/
```

## 🔧 离线使用配置

### 方法 1: 环境变量设置

设置环境变量以使用本地缓存：

```bash
# Windows (PowerShell)
$env:TRANSFORMERS_OFFLINE="1"
$env:HF_DATASETS_OFFLINE="1"

# macOS/Linux (Bash)
export TRANSFORMERS_OFFLINE=1
export HF_DATASETS_OFFLINE=1
```

### 方法 2: 代码中设置

在 `backends/anime_whisper_backend.py` 中添加离线模式：

```python
import os
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"
```

## 🚨 常见问题解决

### 问题 1: CUDA 内存不足
```
RuntimeError: CUDA out of memory
```

**解决方案**:
- 减少 batch_size（在 `backends/anime_whisper_backend.py` 中修改）
- 使用 CPU 模式
- 关闭其他占用 GPU 的程序

### 问题 2: 模型下载失败
```
HTTPError: 403 Client Error
```

**解决方案**:
- 检查网络连接
- 使用代理或镜像源
- 手动下载模型文件

### 问题 3: 导入错误
```
ModuleNotFoundError: No module named 'transformers'
```

**解决方案**:
```bash
pip install transformers>=4.21.0
```

### 问题 4: 音频格式不支持

**支持的格式**: WAV, MP3, FLAC, M4A, OGG

**转换命令**:
```bash
# 使用 ffmpeg 转换
ffmpeg -i input.mp4 -ar 16000 -ac 1 output.wav
```

## 📊 性能优化建议

### GPU 优化
- 使用 float16 精度（自动启用）
- 调整 chunk_length_s 参数
- 启用混合精度训练

### CPU 优化
- 使用多线程（设置 OMP_NUM_THREADS）
- 减少 batch_size
- 使用量化模型（如果可用）

### 内存优化
```python
# 在 backends/anime_whisper_backend.py 中调整
chunk_length_s=15.0  # 减少块长度
batch_size=8         # 减少批处理大小
```

## 🔄 更新模型

要更新到最新版本的 anime-whisper：

```bash
# 清除缓存
rm -rf ~/.cache/huggingface/hub/models--litagin--anime-whisper/

# 重新下载
python download_model.py
```

## 📝 使用说明

1. 确保所有依赖已安装
2. 运行测试脚本验证安装
3. 在 VoiceTransl 中选择 "anime-whisper"
4. 开始转录日语音频文件

## 🎯 模型特点

- **专门优化**: 针对日语动画/游戏语音
- **高准确率**: 在动画语音上表现优异
- **非语言音效**: 能识别笑声、叹息等
- **自然标点**: 适合字幕制作
- **低幻觉率**: 减少错误转录

## 📞 技术支持

如果遇到问题，请检查：
1. Python 版本是否兼容
2. 依赖包是否正确安装
3. 模型是否成功下载
4. 音频文件格式是否支持

更多信息请参考：
- [Hugging Face 模型页面](https://huggingface.co/litagin/anime-whisper)
- [Transformers 文档](https://huggingface.co/docs/transformers)
