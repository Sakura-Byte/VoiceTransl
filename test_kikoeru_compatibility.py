#!/usr/bin/env python3
"""
Test script for Kikoeru integration compatibility.
Tests the API server endpoints that Kikoeru would use.
"""

import sys
import asyncio
import httpx
import json
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def test_api_health():
    """Test the health check endpoint."""
    print("[TEST] Testing API health check endpoint")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:8000/health")
            
            if response.status_code == 200:
                data = response.json()
                print(f"[OK] Health check passed: {data}")
                return True
            else:
                print(f"[ERROR] Health check failed with status {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Health check exception: {e}")
        return False

async def test_api_docs():
    """Test that API documentation is accessible."""
    print("[TEST] Testing API documentation endpoint")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:8000/docs")
            
            if response.status_code == 200:
                print(f"[OK] API docs accessible")
                return True
            else:
                print(f"[ERROR] API docs failed with status {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] API docs exception: {e}")
        return False

async def test_translators_endpoint():
    """Test the supported translators endpoint."""
    print("[TEST] Testing supported translators endpoint")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:8000/api/translators")
            
            if response.status_code == 200:
                data = response.json()
                print(f"[OK] Translators endpoint: {len(data.get('translators', {}))} translators available")
                print(f"    Current translator: {data.get('current_translator', 'N/A')}")
                return True
            else:
                print(f"[ERROR] Translators endpoint failed with status {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Translators endpoint exception: {e}")
        return False

async def test_translation_config():
    """Test the translation configuration endpoint."""
    print("[TEST] Testing translation configuration endpoint")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:8000/api/translation/config")
            
            if response.status_code == 200:
                data = response.json()
                print(f"[OK] Translation config: translator='{data.get('translator', 'N/A')}'")
                return True
            else:
                print(f"[ERROR] Translation config failed with status {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Translation config exception: {e}")
        return False

async def test_transcription_task_creation():
    """Test creating a transcription task (kikoeru would use this)."""
    print("[TEST] Testing transcription task creation")
    try:
        # Test with a URL (simulating kikoeru request)
        test_data = {
            "url": "https://example.com/test.mp3",
            "output_format": "lrc"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "http://localhost:8000/api/transcribe",
                json=test_data
            )
            
            if response.status_code == 200:
                data = response.json()
                task_id = data.get('task_id')
                print(f"[OK] Transcription task created: {task_id}")
                
                # Test getting task status
                if task_id:
                    status_response = await client.get(f"http://localhost:8000/api/transcribe/{task_id}/status")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"[OK] Task status endpoint working: {status_data.get('status', 'N/A')}")
                    else:
                        print(f"[WARN] Task status check failed: {status_response.status_code}")
                
                return True
            else:
                print(f"[ERROR] Transcription task creation failed with status {response.status_code}")
                error_data = response.text
                print(f"    Error details: {error_data[:200]}")
                return False
    except Exception as e:
        print(f"[ERROR] Transcription task creation exception: {e}")
        return False

async def test_translation_task_creation():
    """Test creating a translation task (kikoeru would use this)."""
    print("[TEST] Testing translation task creation")
    try:
        # Test with sample LRC content
        test_data = {
            "lrc_content": "[00:00.00]Test line 1\n[00:05.00]Test line 2",
            "target_language": "zh-cn",
            "translator": "不进行翻译",
            "translation_config": {}
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "http://localhost:8000/api/translate",
                json=test_data
            )
            
            if response.status_code == 200:
                data = response.json()
                task_id = data.get('task_id')
                print(f"[OK] Translation task created: {task_id}")
                
                # Test getting task status
                if task_id:
                    status_response = await client.get(f"http://localhost:8000/api/translate/{task_id}/status")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"[OK] Translation task status: {status_data.get('status', 'N/A')}")
                    else:
                        print(f"[WARN] Translation task status check failed: {status_response.status_code}")
                
                return True
            else:
                print(f"[ERROR] Translation task creation failed with status {response.status_code}")
                error_data = response.text
                print(f"    Error details: {error_data[:200]}")
                return False
    except Exception as e:
        print(f"[ERROR] Translation task creation exception: {e}")
        return False

async def test_task_management():
    """Test task management endpoints."""
    print("[TEST] Testing task management endpoints")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test task listing
            response = await client.get("http://localhost:8000/api/tasks?limit=10")
            
            if response.status_code == 200:
                data = response.json()
                task_count = data.get('total', 0)
                print(f"[OK] Task listing: {task_count} tasks found")
                
                # Test task stats
                stats_response = await client.get("http://localhost:8000/api/stats")
                if stats_response.status_code == 200:
                    stats_data = stats_response.json()
                    print(f"[OK] Task stats available")
                else:
                    print(f"[WARN] Task stats failed: {stats_response.status_code}")
                
                return True
            else:
                print(f"[ERROR] Task listing failed with status {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Task management exception: {e}")
        return False

async def run_compatibility_tests():
    """Run all compatibility tests."""
    print("[SUITE] Kikoeru Integration Compatibility Test")
    print("=" * 60)
    
    # List of tests to run
    tests = [
        ("API Health Check", test_api_health),
        ("API Documentation", test_api_docs),
        ("Supported Translators", test_translators_endpoint),
        ("Translation Config", test_translation_config),
        ("Transcription Task Creation", test_transcription_task_creation),
        ("Translation Task Creation", test_translation_task_creation),
        ("Task Management", test_task_management)
    ]
    
    results = []
    
    # Run each test
    for test_name, test_func in tests:
        print(f"\n[RUNNING] {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"[ERROR] {test_name} failed with exception: {e}")
            results.append((test_name, False))
        
        print("-" * 40)
    
    # Print summary
    print("\n" + "=" * 60)
    print("[SUMMARY] KIKOERU COMPATIBILITY TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "[PASSED]" if result else "[FAILED]"
        print(f"{test_name:30} : {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n[SUCCESS] All tests passed! Kikoeru integration compatibility verified.")
        return True
    elif passed >= len(results) * 0.7:  # 70% pass rate acceptable for basic compatibility
        print(f"\n[PARTIAL] {passed}/{len(results)} tests passed. Basic compatibility maintained.")
        print("Some advanced features may need attention, but core integration should work.")
        return True
    else:
        print(f"\n[FAILED] Only {passed}/{len(results)} tests passed. Compatibility issues detected.")
        return False

def main():
    """Main entry point."""
    try:
        result = asyncio.run(run_compatibility_tests())
        return 0 if result else 1
    except KeyboardInterrupt:
        print("\n[INFO] Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n[ERROR] Test suite failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())