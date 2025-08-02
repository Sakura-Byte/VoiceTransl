#!/usr/bin/env python3
"""
Debug script to check available torchaudio backends and test audio file handling
"""

import os
import sys
import logging

def check_torchaudio_backends():
    """Check what torchaudio backends are available"""
    print("=== Checking TorchAudio Backends ===")
    
    try:
        import torchaudio
        print(f"TorchAudio version: {torchaudio.__version__}")
        
        # List available backends
        backends = torchaudio.list_audio_backends()
        print(f"Available backends: {backends}")
        
        if not backends:
            print("❌ No audio backends available!")
            return False
        
        # Test each backend
        for backend in backends:
            print(f"✅ Backend '{backend}' is available")
            
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import torchaudio: {e}")
        return False
    except Exception as e:
        print(f"❌ Error checking backends: {e}")
        return False

def check_audio_libraries():
    """Check if required audio processing libraries are available"""
    print("\n=== Checking Audio Processing Libraries ===")
    
    libraries = {
        'soundfile': 'SoundFile (libsndfile)',
        'librosa': 'Librosa',
        'pydub': 'PyDub',
        'mutagen': 'Mutagen'
    }
    
    available = []
    for lib, desc in libraries.items():
        try:
            __import__(lib)
            print(f"✅ {desc} is available")
            available.append(lib)
        except ImportError:
            print(f"❌ {desc} is not available")
    
    return available

def test_audio_file_info(audio_path):
    """Test getting audio file information using different methods"""
    print(f"\n=== Testing Audio File: {audio_path} ===")
    
    if not os.path.exists(audio_path):
        print(f"❌ File does not exist: {audio_path}")
        return False
    
    # Test with torchaudio
    try:
        import torchaudio
        info = torchaudio.info(audio_path)
        print(f"✅ TorchAudio info: {info}")
        return True
    except Exception as e:
        print(f"❌ TorchAudio failed: {e}")
    
    # Test with soundfile
    try:
        import soundfile as sf
        info = sf.info(audio_path)
        print(f"✅ SoundFile info: {info}")
        return True
    except ImportError:
        print("❌ SoundFile not available")
    except Exception as e:
        print(f"❌ SoundFile failed: {e}")
    
    # Test with librosa
    try:
        import librosa
        duration = librosa.get_duration(path=audio_path)
        print(f"✅ Librosa duration: {duration} seconds")
        return True
    except ImportError:
        print("❌ Librosa not available")
    except Exception as e:
        print(f"❌ Librosa failed: {e}")
    
    # Test with pydub
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(audio_path)
        duration = len(audio) / 1000.0  # Convert to seconds
        print(f"✅ PyDub duration: {duration} seconds")
        return True
    except ImportError:
        print("❌ PyDub not available")
    except Exception as e:
        print(f"❌ PyDub failed: {e}")
    
    return False

def suggest_fixes():
    """Suggest fixes for common audio backend issues"""
    print("\n=== Suggested Fixes ===")
    
    print("1. Install SoundFile (recommended for MP3 support):")
    print("   pip install soundfile")
    
    print("\n2. Install FFmpeg (system-wide):")
    print("   Windows: Download from https://ffmpeg.org/download.html")
    print("   Linux: sudo apt-get install ffmpeg")
    print("   macOS: brew install ffmpeg")
    
    print("\n3. Install additional audio libraries:")
    print("   pip install librosa pydub mutagen")
    
    print("\n4. For MP3 support specifically:")
    print("   pip install pydub[mp3]")
    
    print("\n5. Alternative: Convert MP3 to WAV:")
    print("   ffmpeg -i input.mp3 output.wav")

def main():
    """Main debug function"""
    print("🔍 Audio Backend Debug Tool")
    print("=" * 50)
    
    # Check backends
    backends_ok = check_torchaudio_backends()
    
    # Check libraries
    available_libs = check_audio_libraries()
    
    # Test with a sample file if provided
    if len(sys.argv) > 1:
        audio_path = sys.argv[1]
        test_audio_file_info(audio_path)
    else:
        print("\n💡 Usage: python debug_audio_backends.py <audio_file_path>")
        print("   Example: python debug_audio_backends.py 'C:/Users/SakuraPY/Downloads/01.導入.mp3'")
    
    # Suggest fixes if needed
    if not backends_ok or not available_libs:
        suggest_fixes()
    
    print("\n" + "=" * 50)
    print("Debug complete!")

if __name__ == "__main__":
    main()
