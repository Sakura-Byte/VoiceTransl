#!/usr/bin/env python3
"""
VoiceTransl Web API Test Script
测试Web API功能的简单脚本
"""

import requests
import json
import sys
import time

def test_health(base_url):
    """测试健康检查端点"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_languages(base_url):
    """测试支持的语言端点"""
    print("🌍 Testing languages endpoint...")
    try:
        response = requests.get(f"{base_url}/languages", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Languages endpoint working. Supported languages: {len(data['languages'])}")
            return True
        else:
            print(f"❌ Languages endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Languages endpoint failed: {e}")
        return False

def test_providers(base_url):
    """测试翻译提供商端点"""
    print("🔧 Testing providers endpoint...")
    try:
        response = requests.get(f"{base_url}/providers", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Providers endpoint working. Available providers: {len(data['providers'])}")
            return True
        else:
            print(f"❌ Providers endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Providers endpoint failed: {e}")
        return False

def test_whisper_models(base_url):
    """测试Whisper模型端点"""
    print("🎤 Testing whisper-models endpoint...")
    try:
        response = requests.get(f"{base_url}/whisper-models", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Whisper models endpoint working. Available types: {len(data.get('whisper_types', {}))}")
            return True
        else:
            print(f"❌ Whisper models endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Whisper models endpoint failed: {e}")
        return False

def test_transcribe_translate(base_url, audio_file_path):
    """测试转录翻译端点"""
    print("🎤 Testing transcribe-translate endpoint...")
    try:
        # 准备测试文件
        if not audio_file_path:
            print("⚠️ No audio file provided, skipping transcribe-translate test")
            return True
            
        with open(audio_file_path, 'rb') as f:
            files = {'audio_file': f}
            data = {
                'target_language': 'zh-CN',
                'provider': 'sakura',
                'whisper_type': 'anime-whisper',
                'whisper_model': 'litagin/anime-whisper'
            }
            
            print(f"   Uploading file: {audio_file_path}")
            response = requests.post(
                f"{base_url}/transcribe-translate",
                files=files,
                data=data,
                timeout=60
            )
            
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print("✅ Transcribe-translate test passed")
                print(f"   Detected language: {result.get('detected_language', 'Unknown')}")
                print(f"   Processing time: {result.get('processing_time', 0):.2f}s")
                if result.get('lrc_content'):
                    print("   LRC content generated successfully")
                return True
            else:
                print(f"❌ Transcribe-translate failed: {result.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Transcribe-translate failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Transcribe-translate test failed: {e}")
        return False

def main():
    """主测试函数"""
    if len(sys.argv) < 2:
        base_url = "http://localhost:8000"
        audio_file = None
    elif len(sys.argv) == 2:
        base_url = sys.argv[1]
        audio_file = None
    else:
        base_url = sys.argv[1]
        audio_file = sys.argv[2]
    
    print(f"🚀 Testing VoiceTransl Web API at {base_url}")
    print("=" * 50)
    
    # 等待API启动
    print("⏳ Waiting for API to be ready...")
    time.sleep(2)
    
    tests = [
        test_health,
        test_languages,
        test_providers,
        test_whisper_models,
    ]
    
    results = []
    for test in tests:
        result = test(base_url)
        results.append(result)
        print()
    
    # 音频文件测试（可选）
    if audio_file:
        result = test_transcribe_translate(base_url, audio_file)
        results.append(result)
    
    # 总结结果
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"🎉 All tests passed! ({passed}/{total})")
        sys.exit(0)
    else:
        print(f"💥 Some tests failed: {passed}/{total} passed")
        sys.exit(1)

if __name__ == "__main__":
    print("""
VoiceTransl Web API Test Script

Usage:
    python test_api.py [base_url] [audio_file]
    
Examples:
    python test_api.py
    python test_api.py http://localhost:8000
    python test_api.py http://localhost:8000 test.wav
    """)
    
    main()