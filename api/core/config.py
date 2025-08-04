"""
API Configuration Management
Handles API server settings and integration with GUI configuration
"""

import os
from typing import List, Optional, Dict, Any
from pydantic-settings import BaseSettings, Field
from functools import lru_cache


class APISettings(BaseSettings):
    """API server configuration settings"""
    
    # Server settings
    host: str = Field(default="127.0.0.1", env="API_HOST")
    port: int = Field(default=8000, env="API_PORT")
    reload: bool = Field(default=False, env="API_RELOAD")
    
    # CORS settings
    allowed_origins: List[str] = Field(default=["*"], env="API_ALLOWED_ORIGINS")
    
    # Security settings
    api_key: Optional[str] = Field(default=None, env="API_KEY")
    enable_auth: bool = Field(default=False, env="API_ENABLE_AUTH")
    
    # Rate limiting
    rate_limit_requests: int = Field(default=100, env="API_RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=3600, env="API_RATE_LIMIT_WINDOW")  # seconds
    
    # Task management
    max_concurrent_tasks: int = Field(default=5, env="API_MAX_CONCURRENT_TASKS")
    task_timeout: int = Field(default=3600, env="API_TASK_TIMEOUT")  # seconds
    cleanup_interval: int = Field(default=300, env="API_CLEANUP_INTERVAL")  # seconds
    
    # File handling
    max_file_size: int = Field(default=1024 * 1024 * 1024, env="API_MAX_FILE_SIZE")  # 1GiB
    temp_dir: str = Field(default="temp", env="API_TEMP_DIR")
    
    # Logging
    log_level: str = Field(default="INFO", env="API_LOG_LEVEL")
    log_file: Optional[str] = Field(default=None, env="API_LOG_FILE")
    
    # GUI integration
    gui_config_path: str = Field(default="config.txt", env="GUI_CONFIG_PATH")
    project_config_path: str = Field(default="project/config.yaml", env="PROJECT_CONFIG_PATH")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


class ConfigurationBridge:
    """Bridge between GUI configuration and API settings"""
    
    def __init__(self, settings: APISettings):
        self.settings = settings
        self._gui_config: Optional[Dict[str, Any]] = None
        self._project_config: Optional[Dict[str, Any]] = None
    
    def load_gui_config(self) -> Dict[str, Any]:
        """Load configuration from GUI config file"""
        if not os.path.exists(self.settings.gui_config_path):
            return {}
        
        try:
            config = {}
            with open(self.settings.gui_config_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                if len(lines) >= 8:
                    config = {
                        'translator': lines[1].strip(),
                        'language': lines[2].strip(),
                        'gpt_token': lines[3].strip(),
                        'gpt_address': lines[4].strip(),
                        'gpt_model': lines[5].strip(),
                        'sakura_file': lines[6].strip(),
                        'sakura_mode': int(lines[7].strip()) if lines[7].strip().isdigit() else 0,
                        'output_format': lines[8].strip() if len(lines) > 8 else 'lrc'
                    }
            
            self._gui_config = config
            return config
            
        except Exception as e:
            print(f"Error loading GUI config: {e}")
            return {}
    
    def load_project_config(self) -> Dict[str, Any]:
        """Load project configuration from YAML file"""
        if not os.path.exists(self.settings.project_config_path):
            return {}
        
        try:
            import yaml
            with open(self.settings.project_config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            self._project_config = config or {}
            return self._project_config
            
        except Exception as e:
            print(f"Error loading project config: {e}")
            return {}
    
    def get_transcription_config(self) -> Dict[str, Any]:
        """Get transcription configuration for API use"""
        gui_config = self.load_gui_config()
        project_config = self.load_project_config()
        
        # Load transcription-specific settings
        transcription_settings = self.load_transcription_config()
        
        config = {
            'language': 'ja',  # Always Japanese
            'output_format': gui_config.get('output_format', 'lrc'),
            'project_config': project_config
        }
        
        # Add transcription-specific settings
        config.update(transcription_settings)
        
        return config
    
    def load_transcription_config(self) -> Dict[str, Any]:
        """Load transcription-specific configuration"""
        transcription_config_path = 'transcription_config.txt'
        
        if not os.path.exists(transcription_config_path):
            # Return defaults
            return {
                'use_hybrid_backend': True,
                'suppress_repetitions': False,
                'alignment_backend': 'qwen3'
            }
        
        try:
            with open(transcription_config_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            if len(lines) >= 3:
                use_hybrid = lines[0].strip().lower() == 'true'
                suppress_reps = lines[1].strip().lower() == 'true'
                alignment_backend = lines[2].strip()
                
                return {
                    'use_hybrid_backend': use_hybrid,
                    'suppress_repetitions': suppress_reps,
                    'alignment_backend': alignment_backend
                }
            else:
                # Return defaults if file is incomplete
                return {
                    'use_hybrid_backend': True,
                    'suppress_repetitions': False,
                    'alignment_backend': 'qwen3'
                }
                
        except Exception as e:
            print(f"Error loading transcription config: {e}")
            return {
                'use_hybrid_backend': True,
                'suppress_repetitions': False,
                'alignment_backend': 'qwen3'
            }
    
    def get_translation_config(self) -> Dict[str, Any]:
        """Get translation configuration for API use"""
        gui_config = self.load_gui_config()
        project_config = self.load_project_config()
        
        return {
            'translator': gui_config.get('translator', '不进行翻译'),
            'language': gui_config.get('language', 'ja'),
            'gpt_token': gui_config.get('gpt_token', ''),
            'gpt_address': gui_config.get('gpt_address', ''),
            'gpt_model': gui_config.get('gpt_model', ''),
            'sakura_file': gui_config.get('sakura_file', ''),
            'sakura_mode': gui_config.get('sakura_mode', 0),
            'project_config': project_config
        }
    
    def update_gui_config(self, updates: Dict[str, Any]) -> bool:
        """Update GUI configuration file"""
        try:
            current_config = self.load_gui_config()
            current_config.update(updates)
            
            # Write back to config file
            lines = [
                '',  # whisper_file (not used in API)
                current_config.get('translator', '不进行翻译'),
                current_config.get('language', 'ja'),
                current_config.get('gpt_token', ''),
                current_config.get('gpt_address', ''),
                current_config.get('gpt_model', ''),
                current_config.get('sakura_file', ''),
                str(current_config.get('sakura_mode', 0)),
                current_config.get('output_format', 'lrc')
            ]
            
            with open(self.settings.gui_config_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            return True
            
        except Exception as e:
            print(f"Error updating GUI config: {e}")
            return False


@lru_cache()
def get_settings() -> APISettings:
    """Get cached API settings instance"""
    return APISettings()


@lru_cache()
def get_config_bridge() -> ConfigurationBridge:
    """Get cached configuration bridge instance"""
    return ConfigurationBridge(get_settings())


class GUIIntegration:
    """Integration layer between API and GUI components"""

    def __init__(self, config_bridge: ConfigurationBridge):
        self.config_bridge = config_bridge
        self._transcription_backends = {}
        self._translation_backends = {}
        self._initialized = False

    def initialize(self):
        """Initialize GUI integration components"""
        if self._initialized:
            return

        # Load current GUI configuration
        gui_config = self.config_bridge.load_gui_config()
        project_config = self.config_bridge.load_project_config()

        # Initialize transcription backends based on GUI settings
        self._initialize_transcription_backends()

        # Initialize translation backends based on GUI settings
        self._initialize_translation_backends(gui_config, project_config)

        self._initialized = True

    def _initialize_transcription_backends(self):
        """Initialize transcription backends"""
        try:
            # Import transcription backends
            from backends import AnimeWhisperBackend, HybridTranscriptionBackend, TinyWhisperBackend

            # Initialize anime-whisper backend
            anime_backend = AnimeWhisperBackend()
            if anime_backend.initialize():
                self._transcription_backends['anime-whisper'] = anime_backend

            # Initialize hybrid backend (will be configured per request)
            self._transcription_backends['hybrid'] = HybridTranscriptionBackend

            # Initialize tiny-whisper backend
            tiny_backend = TinyWhisperBackend()
            if tiny_backend.initialize():
                self._transcription_backends['tiny-whisper'] = tiny_backend

        except Exception as e:
            print(f"Error initializing transcription backends: {e}")

    def _initialize_translation_backends(self, gui_config: dict, project_config: dict):
        """Initialize translation backends based on GUI configuration"""
        try:
            # Import GalTransl components
            from GalTransl.ConfigHelper import CProjectConfig
            from GalTransl.Frontend.GPT import doLLMTranslate

            # Create project config if we have a valid project directory
            if project_config and 'project' in project_config:
                # Store reference to translation system
                self._translation_backends['galtransl'] = {
                    'gui_config': gui_config,
                    'project_config': project_config
                }

        except Exception as e:
            print(f"Error initializing translation backends: {e}")

    def get_transcription_backend(self, backend_type: str = 'hybrid'):
        """Get transcription backend by type"""
        return self._transcription_backends.get(backend_type)

    def get_translation_config(self):
        """Get current translation configuration"""
        return self._translation_backends.get('galtransl', {})

    def is_initialized(self) -> bool:
        """Check if integration is initialized"""
        return self._initialized


@lru_cache()
def get_gui_integration() -> GUIIntegration:
    """Get cached GUI integration instance"""
    return GUIIntegration(get_config_bridge())
