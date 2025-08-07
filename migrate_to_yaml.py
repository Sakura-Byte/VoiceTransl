#!/usr/bin/env python3
"""
Configuration Migration Utility

Migrates from old .txt config files to new YAML format.
Creates backups of original files and converts them to structured YAML configuration.
"""

import os
import sys
import shutil
import logging
from pathlib import Path
from datetime import datetime

# Add web directory to path for imports
sys.path.insert(0, str(Path(__file__).parent / "web"))

from services.yaml_config_service import YAMLConfigService
from models.yaml_config_models import VoiceTranslConfig


def setup_logging():
    """Set up logging for migration process."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
            logging.StreamHandler()
        ]
    )


def backup_old_configs():
    """Create backups of all existing config files."""
    backup_dir = Path("config_backups_txt")
    backup_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    config_files = [
        "config.txt",
        "transcription_config.txt", 
        "llama/param.txt",
        "project/dict_pre.txt",
        "project/dict_gpt.txt", 
        "project/dict_after.txt",
        "project/extra_prompt.txt"
    ]
    
    backed_up = []
    
    for config_file in config_files:
        if os.path.exists(config_file):
            backup_name = f"{Path(config_file).name}_{timestamp}.backup"
            backup_path = backup_dir / backup_name
            
            # Create subdirectories if needed
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.copy2(config_file, backup_path)
            backed_up.append(config_file)
            logging.info(f"Backed up {config_file} -> {backup_path}")
    
    return backed_up


def validate_migration(yaml_service: YAMLConfigService):
    """Validate the migrated configuration."""
    try:
        config_dict = yaml_service.read_config()
        
        # Validate using Pydantic model
        validated_config = VoiceTranslConfig(**config_dict)
        
        logging.info("✅ Migration validation successful!")
        logging.info(f"Configuration structure is valid with {len(config_dict)} main sections")
        
        # Print summary
        sections = list(config_dict.keys())
        if '_metadata' in sections:
            sections.remove('_metadata')
        
        logging.info(f"Migrated sections: {', '.join(sections)}")
        
        return True
        
    except Exception as e:
        logging.error(f"❌ Migration validation failed: {e}")
        return False


def print_migration_summary(backed_up_files: list, yaml_path: Path):
    """Print summary of migration results."""
    print("\n" + "="*60)
    print("🎉 CONFIGURATION MIGRATION COMPLETED!")
    print("="*60)
    
    if backed_up_files:
        print(f"\n📁 Original files backed up ({len(backed_up_files)} files):")
        for file in backed_up_files:
            print(f"   • {file}")
        print(f"\n   Backups stored in: config_backups_txt/")
    
    print(f"\n📄 New YAML configuration created:")
    print(f"   • {yaml_path}")
    
    print(f"\n🚀 Next steps:")
    print(f"   1. Review the new config.yaml file")
    print(f"   2. Update any API tokens or file paths as needed")
    print(f"   3. Start the web interface: uv run python web/main.py")
    print(f"   4. Access configuration at: http://localhost:8080/settings")
    
    print(f"\n✨ Benefits of YAML configuration:")
    print(f"   • Structured, readable format")
    print(f"   • Comments and documentation")
    print(f"   • Type validation and error checking")
    print(f"   • Hierarchical organization")
    print(f"   • Automatic backups")
    
    print("\n" + "="*60)


def main():
    """Main migration function."""
    setup_logging()
    
    print("🔄 VoiceTransl Configuration Migration")
    print("Converting .txt configs to YAML format...")
    print()
    
    # Check if migration is needed
    yaml_path = Path("config.yaml")
    if yaml_path.exists():
        response = input(f"⚠️  config.yaml already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Migration cancelled.")
            return
    
    try:
        # Create backup of existing configs
        logging.info("Creating backups of existing configuration files...")
        backed_up_files = backup_old_configs()
        
        if not backed_up_files:
            logging.info("No existing config files found. Creating default YAML configuration...")
        
        # Initialize YAML config service
        yaml_service = YAMLConfigService("config.yaml")
        
        # Perform migration
        logging.info("Starting configuration migration...")
        success = yaml_service.migrate_from_txt_configs()
        
        if not success:
            logging.error("❌ Migration failed!")
            return 1
        
        # Validate migrated configuration
        logging.info("Validating migrated configuration...")
        if not validate_migration(yaml_service):
            logging.error("❌ Migration validation failed!")
            return 1
        
        # Print success summary
        print_migration_summary(backed_up_files, yaml_path)
        
        return 0
        
    except Exception as e:
        logging.error(f"❌ Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())