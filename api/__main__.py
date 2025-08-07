"""
VoiceTransl API Module Entry Point

This module handles command-line execution when the API is run as a module:
python -m api --host 127.0.0.1 --port 8000
"""

import argparse
import sys
from pathlib import Path

# Add the project root to sys.path to ensure imports work
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from api.main import run_server


def main():
    """Main entry point for module execution."""
    parser = argparse.ArgumentParser(description="VoiceTransl API Server")
    parser.add_argument(
        "--host", 
        default="127.0.0.1", 
        help="Host address to bind to (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000, 
        help="Port to bind to (default: 8000)"
    )
    parser.add_argument(
        "--reload", 
        action="store_true", 
        help="Enable auto-reload for development"
    )
    
    args = parser.parse_args()
    
    print(f"Starting VoiceTransl API Server on {args.host}:{args.port}")
    if args.reload:
        print("Auto-reload enabled for development")
    
    try:
        run_server(host=args.host, port=args.port, reload=args.reload)
    except KeyboardInterrupt:
        print("\nShutting down server...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()