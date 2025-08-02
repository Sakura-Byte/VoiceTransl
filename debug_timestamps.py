#!/usr/bin/env python3
"""
Debug script to check what Whisper is actually returning
"""

import os
import json
from anime_whisper_backend import AnimeWhisperBackend

def debug_whisper_output():
    """Debug what anime-whisper is actually returning"""
    
    test_audio = "C:/Users/SakuraPY/Downloads/01.導入.mp3"
    
    if not os.path.exists(test_audio):
        print(f"❌ Test audio file not found: {test_audio}")
        return
    
    print(f"🔍 Debugging Whisper output for: {test_audio}")
    
    try:
        # Initialize backend
        backend = AnimeWhisperBackend()
        if not backend.initialize():
            print("❌ Failed to initialize backend")
            return
        
        print("🎤 Running transcription with return_timestamps=True...")
        
        # Call the pipeline directly to see raw output
        result = backend.pipe(test_audio, return_timestamps=True)
        
        print(f"📊 Raw result type: {type(result)}")
        print(f"📊 Raw result keys: {result.keys() if isinstance(result, dict) else 'Not a dict'}")
        
        if isinstance(result, dict):
            if "chunks" in result:
                print(f"📊 Number of chunks: {len(result['chunks'])}")
                print("📊 First few chunks:")
                for i, chunk in enumerate(result["chunks"][:5]):
                    print(f"   Chunk {i+1}: {chunk}")
            else:
                print("❌ No 'chunks' key found in result")
                print(f"📊 Available keys: {list(result.keys())}")
                
            if "text" in result:
                print(f"📊 Full text: {result['text'][:100]}...")
        
        # Try different timestamp modes
        print("\n🔍 Trying with return_timestamps='word'...")
        result_word = backend.pipe(test_audio, return_timestamps="word")
        print(f"📊 Word-level result type: {type(result_word)}")
        if isinstance(result_word, dict):
            print(f"📊 Word-level result keys: {list(result_word.keys())}")
            if "chunks" in result_word:
                print(f"📊 Word-level chunks count: {len(result_word['chunks'])}")
                print("📊 First few word-level chunks:")
                for i, chunk in enumerate(result_word["chunks"][:3]):
                    print(f"   Word chunk {i+1}: {chunk}")
        
        backend.cleanup()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_whisper_output()
