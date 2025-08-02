#!/usr/bin/env python3
"""
Anime-Whisper Model Downloader
Downloads the anime-whisper model for offline use in VoiceTransl
"""

import os
import sys
import torch
from transformers import pipeline
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_system_requirements():
    """Check if system meets minimum requirements"""
    logger.info("检查系统要求...")
    
    # Check Python version
    python_version = sys.version_info
    if python_version < (3, 8):
        logger.error(f"Python 版本过低: {python_version.major}.{python_version.minor}")
        logger.error("需要 Python 3.8 或更高版本")
        return False
    
    logger.info(f"✅ Python 版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Check PyTorch
    try:
        logger.info(f"✅ PyTorch 版本: {torch.__version__}")
        
        # Check device availability
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            logger.info(f"✅ CUDA 可用，设备数量: {device_count}")
            for i in range(device_count):
                logger.info(f"   GPU {i}: {torch.cuda.get_device_name(i)}")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            logger.info("✅ MPS (Apple Silicon) 可用")
        else:
            logger.info("ℹ️  将使用 CPU 模式")
            
    except ImportError:
        logger.error("❌ PyTorch 未安装")
        logger.error("请运行: pip install torch torchaudio")
        return False
    
    # Check transformers
    try:
        import transformers
        logger.info(f"✅ Transformers 版本: {transformers.__version__}")
    except ImportError:
        logger.error("❌ Transformers 未安装")
        logger.error("请运行: pip install transformers>=4.21.0")
        return False
    
    return True

def get_cache_directory():
    """Get the Hugging Face cache directory"""
    cache_dir = os.environ.get('HF_HOME', 
                              os.path.join(os.path.expanduser('~'), '.cache', 'huggingface'))
    model_cache = os.path.join(cache_dir, 'hub', 'models--litagin--anime-whisper')
    return Path(model_cache)

def download_model():
    """Download the anime-whisper model"""
    logger.info("开始下载 anime-whisper 模型...")
    logger.info("模型大小约 756MB，请耐心等待...")
    
    try:
        # Create pipeline to trigger model download
        pipe = pipeline(
            "automatic-speech-recognition",
            model="litagin/anime-whisper",
            device="cpu",  # Use CPU for download to avoid GPU memory issues
            torch_dtype=torch.float32,
        )
        
        logger.info("✅ 模型下载完成！")
        
        # Get model info
        model_info = {
            "model_name": pipe.model.config._name_or_path,
            "model_type": pipe.model.config.model_type,
            "vocab_size": getattr(pipe.model.config, 'vocab_size', 'Unknown'),
        }
        
        logger.info("模型信息:")
        for key, value in model_info.items():
            logger.info(f"  {key}: {value}")
        
        # Show cache location
        cache_dir = get_cache_directory()
        if cache_dir.exists():
            logger.info(f"模型缓存位置: {cache_dir}")
            
            # Calculate cache size
            total_size = sum(f.stat().st_size for f in cache_dir.rglob('*') if f.is_file())
            size_mb = total_size / (1024 * 1024)
            logger.info(f"缓存大小: {size_mb:.1f} MB")
        
        # Clean up pipeline
        del pipe
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 模型下载失败: {e}")
        logger.error("请检查网络连接或尝试使用代理")
        return False

def test_model():
    """Test the downloaded model"""
    logger.info("测试模型加载...")
    
    try:
        from anime_whisper_backend import AnimeWhisperBackend
        
        backend = AnimeWhisperBackend()
        if backend.initialize():
            logger.info("✅ 模型测试成功！")
            
            info = backend.get_backend_info()
            logger.info("后端信息:")
            for key, value in info.items():
                if key != 'features':
                    logger.info(f"  {key}: {value}")
            
            backend.cleanup()
            return True
        else:
            logger.error("❌ 模型初始化失败")
            return False
            
    except ImportError:
        logger.warning("⚠️  anime_whisper_backend.py 未找到，跳过后端测试")
        logger.info("请确保 anime_whisper_backend.py 在项目目录中")
        return True
    except Exception as e:
        logger.error(f"❌ 模型测试失败: {e}")
        return False

def setup_offline_mode():
    """Setup environment for offline mode"""
    logger.info("配置离线模式...")
    
    # Set environment variables for offline mode
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_DATASETS_OFFLINE"] = "1"
    
    logger.info("✅ 离线模式已配置")
    logger.info("环境变量已设置:")
    logger.info("  TRANSFORMERS_OFFLINE=1")
    logger.info("  HF_DATASETS_OFFLINE=1")

def main():
    """Main function"""
    print("=" * 60)
    print("🎌 Anime-Whisper 模型下载器")
    print("=" * 60)
    
    # Check system requirements
    if not check_system_requirements():
        logger.error("系统要求检查失败，请安装必要的依赖")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    
    # Download model
    if not download_model():
        logger.error("模型下载失败")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    
    # Test model
    if not test_model():
        logger.warning("模型测试失败，但下载可能已完成")
    
    print("\n" + "=" * 60)
    
    # Setup offline mode
    setup_offline_mode()
    
    print("\n" + "=" * 60)
    print("🎉 安装完成！")
    print("=" * 60)
    print("\n使用说明:")
    print("1. 在 VoiceTransl 中选择 'anime-whisper' 模型")
    print("2. 选择日语音频文件进行转录")
    print("3. 享受高质量的动画语音识别！")
    print("\n注意事项:")
    print("- 模型专门针对日语动画/游戏语音优化")
    print("- 支持非语言音效识别（笑声、叹息等）")
    print("- 如遇到重复幻觉，可启用重复抑制选项")
    print("\n如有问题，请参考 ANIME_WHISPER_SETUP.md 文档")

if __name__ == "__main__":
    main()
