# Analysis 10: Storage & Persistence - File-Based Data Storage Architecture

## Executive Summary

**Current State**: 30% proper persistence, file-based storage with in-memory gaps  
**Implementation Status**: Sophisticated translation cache, but critical task data is ephemeral  
**Completion Estimate**: ~70% of production persistence features missing  

The VoiceTransl system uses a hybrid storage approach combining file-based persistence for long-term data (configurations, translation cache, models) with in-memory storage for transient data (active tasks, WebSocket connections). This analysis presents a comprehensive file-based storage architecture that completely replaces database dependencies while providing sophisticated data persistence, integrity, and scalability for production workloads.

## Current Storage Architecture

### 1. File-Based Storage Systems (Existing)

**Configuration Persistence** ✓
- **Main Config**: `config.yaml` - Application settings with YAML serialization
- **Project Config**: `project/config.yaml` - GalTransl translation engine configuration
- **Environment Config**: `.env` files for runtime environment variables
- **Backup System**: `config_backups/` directory with timestamped backups
- **Migration Support**: `migrate_to_yaml.py` for legacy config.txt migration

**GalTransl Translation Cache** ✓ (Sophisticated)
```python
# GalTransl/Cache.py - Production-ready caching system
def save_transCache_to_json(trans_list: CTransList, cache_file_path, post_save=False):
    """Save translation cache with comprehensive metadata"""
    cache_json = []
    for tran in trans_list:
        cache_obj = {
            "index": tran.index,
            "name": tran.speaker,
            "pre_jp": tran.pre_jp,
            "post_jp": tran.post_jp,
            "pre_zh": tran.pre_zh,
            "proofread_zh": tran.proofread_zh,
            "trans_by": tran.trans_by,
            "proofread_by": tran.proofread_by,
            "trans_conf": tran.trans_conf,
            "doub_content": tran.doub_content,
            "unknown_proper_noun": tran.unknown_proper_noun
        }
        cache_json.append(cache_obj)
    
    with open(cache_file_path, mode="w", encoding="utf8") as f:
        dump(cache_json, f, ensure_ascii=False, indent=4)
```

**Project Data Structure**:
```
project/
├── config.yaml              # GalTransl configuration
├── gt_input/                # Input files for translation
│   └── 01.導入.json         # Sample translation input
├── gt_output/               # Translation results
├── transl_cache/            # Translation cache files (JSON)
├── cache/                   # General purpose cache
└── dict_*.txt               # Translation dictionaries
```

### 2. In-Memory Storage (Problematic)

**Task Manager Storage** ✗ (No Persistence)
```python
# api/core/task_manager.py - All in-memory, lost on restart
class TaskManager:
    def __init__(self):
        self._tasks: Dict[str, Task] = {}        # ← Lost on restart
        self._active_tasks: Dict[str, asyncio.Task] = {}  # ← Lost on restart
        
    async def _cleanup_old_tasks(self):
        """Remove old completed tasks to prevent memory leaks"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)  # Only 24h retention
```

**WebSocket Connection State** ✗ (No Persistence)
- Active WebSocket connections stored in memory only
- Client subscription preferences lost on server restart
- No connection recovery for long-running tasks

**Server State Management** ✗ (No Persistence)
- Server status, performance metrics stored in memory only
- Application state lost between deployments
- No state recovery mechanisms

## Comprehensive File-Based Storage Architecture

### 1. Directory Structure and Organization

**Complete Data Storage Layout**:
```
data/
├── tasks/                           # Task persistence
│   ├── pending/                     # Pending tasks (JSON files)
│   ├── processing/                  # Active tasks (JSON files)
│   ├── completed/                   # Completed tasks (JSON files)
│   ├── failed/                      # Failed tasks (JSON files)
│   ├── indices/                     # Task lookup indices
│   │   ├── by_type.json            # Index by task type
│   │   ├── by_date.json            # Index by creation date
│   │   └── by_status.json          # Index by current status
│   └── locks/                      # File-based locking
├── cache/                          # Unified caching system
│   ├── translations/               # Translation cache
│   │   ├── by_translator/          # Organized by translator type
│   │   ├── by_hash/               # Content-based hash lookup
│   │   └── indices/               # Cache lookup indices
│   ├── transcriptions/            # Transcription cache
│   ├── configurations/            # Configuration cache
│   └── metadata/                  # Cache metadata and stats
├── storage/                       # File storage management
│   ├── uploads/                   # Uploaded files
│   ├── processing/                # Files being processed
│   ├── results/                   # Processing results
│   ├── temporary/                 # Temporary files
│   └── archives/                  # Archived files
├── state/                         # Application state
│   ├── server/                    # Server state and metrics
│   ├── connections/               # WebSocket connection state
│   ├── sessions/                  # User session data
│   └── history/                   # State change history
├── backups/                       # Backup storage
│   ├── daily/                     # Daily backups
│   ├── weekly/                    # Weekly backups
│   └── snapshots/                 # Point-in-time snapshots
└── logs/                          # Structured logs
    ├── api/                       # API request logs
    ├── tasks/                     # Task execution logs
    ├── errors/                    # Error logs
    └── system/                    # System logs
```

### 2. JSON Schema Standards

**Task Storage Schema** (`data/tasks/{status}/{task_id}.json`):
```json
{
  "schema_version": "1.0",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "transcription",
  "status": "processing",
  "priority": 1,
  "metadata": {
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z",
    "started_at": "2024-01-15T10:32:00Z",
    "completed_at": null,
    "version": 1,
    "checksum": "sha256:abc123..."
  },
  "input_data": {
    "file_path": "/data/storage/uploads/audio.mp3",
    "parameters": {
      "language": "ja",
      "model": "whisper-large-v3"
    }
  },
  "progress": {
    "percentage": 45.2,
    "current_step": "transcribing_audio",
    "steps_completed": 2,
    "total_steps": 5,
    "estimated_remaining": 120
  },
  "result": null,
  "error": null,
  "execution_log": [
    {
      "timestamp": "2024-01-15T10:32:00Z",
      "step": "validation",
      "status": "completed",
      "duration": 1.2
    },
    {
      "timestamp": "2024-01-15T10:32:01Z",
      "step": "preprocessing",
      "status": "completed", 
      "duration": 5.8
    }
  ]
}
```

**Translation Cache Schema** (`data/cache/translations/{translator}/{hash}.json`):
```json
{
  "schema_version": "1.0",
  "cache_key": "gpt4_ja_zh_abc123",
  "metadata": {
    "created_at": "2024-01-15T10:30:00Z",
    "last_accessed": "2024-01-15T11:45:00Z",
    "access_count": 15,
    "ttl": 2592000,
    "checksum": "sha256:def456..."
  },
  "translation": {
    "source_text": "こんにちは",
    "target_text": "你好",
    "source_language": "ja",
    "target_language": "zh",
    "translator": "gpt4",
    "confidence": 0.95,
    "additional_metadata": {
      "speaker": "narrator",
      "context": "greeting",
      "alternatives": ["您好", "你们好"]
    }
  }
}
```

**Server State Schema** (`data/state/server/current.json`):
```json
{
  "schema_version": "1.0",
  "server_info": {
    "instance_id": "server_001",
    "started_at": "2024-01-15T09:00:00Z",
    "version": "2.1.0",
    "last_updated": "2024-01-15T11:45:00Z"
  },
  "metrics": {
    "tasks": {
      "total_processed": 1250,
      "currently_active": 3,
      "success_rate": 0.987
    },
    "performance": {
      "avg_response_time": 245,
      "memory_usage_mb": 2048,
      "cpu_usage_percent": 25.4
    },
    "storage": {
      "total_space_gb": 500,
      "used_space_gb": 125,
      "cache_size_mb": 1024
    }
  }
}
```

### 3. File-Based Transaction System

**Atomic File Operations**:
```python
import json
import tempfile
import os
from pathlib import Path
from typing import Any, Dict, Optional
import hashlib
import fcntl
from contextlib import contextmanager

class FileTransaction:
    """Provides atomic file operations with rollback capability"""
    
    def __init__(self, file_path: Path):
        self.file_path = Path(file_path)
        self.backup_path = None
        self.temp_path = None
        
    @contextmanager
    def atomic_write(self):
        """Context manager for atomic file writes"""
        # Create temporary file in same directory
        self.temp_path = self.file_path.parent / f".tmp_{self.file_path.name}"
        
        try:
            # Create backup if original exists
            if self.file_path.exists():
                self.backup_path = self.file_path.parent / f".backup_{self.file_path.name}"
                self.file_path.rename(self.backup_path)
                
            yield self.temp_path
            
            # Atomic move to final location
            self.temp_path.rename(self.file_path)
            
            # Remove backup on success
            if self.backup_path and self.backup_path.exists():
                self.backup_path.unlink()
                
        except Exception:
            # Rollback on error
            if self.temp_path and self.temp_path.exists():
                self.temp_path.unlink()
            if self.backup_path and self.backup_path.exists():
                self.backup_path.rename(self.file_path)
            raise
            
    def write_json(self, data: Dict[str, Any], validate_schema: bool = True):
        """Atomically write JSON data with validation"""
        with self.atomic_write() as temp_file:
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())  # Force write to disk
                
        # Validate written data
        if validate_schema:
            self.validate_written_data(data)
            
    def validate_written_data(self, original_data: Dict[str, Any]):
        """Validate that written data matches original"""
        with open(self.file_path, 'r', encoding='utf-8') as f:
            written_data = json.load(f)
        
        if written_data != original_data:
            raise ValueError("Data validation failed after write")

class FileLockManager:
    """File-based locking system for concurrent access control"""
    
    def __init__(self, lock_dir: Path):
        self.lock_dir = Path(lock_dir)
        self.lock_dir.mkdir(parents=True, exist_ok=True)
        
    @contextmanager
    def acquire_lock(self, resource_id: str, timeout: int = 30):
        """Acquire exclusive lock for resource"""
        lock_file = self.lock_dir / f"{resource_id}.lock"
        
        try:
            with open(lock_file, 'w') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                f.write(f"locked_at={datetime.now().isoformat()}\n")
                f.write(f"process_id={os.getpid()}\n")
                yield
        except IOError:
            raise LockAcquisitionError(f"Could not acquire lock for {resource_id}")
        finally:
            if lock_file.exists():
                lock_file.unlink()
```

### 4. Persistent Task Manager

**File-Based Task Manager**:
```python
class FileBasedTaskManager:
    """Complete task persistence using file system"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.task_dir = self.data_dir / "tasks"
        self.indices_dir = self.task_dir / "indices"
        self.lock_manager = FileLockManager(self.task_dir / "locks")
        
        # Create directory structure
        for status in ["pending", "processing", "completed", "failed"]:
            (self.task_dir / status).mkdir(parents=True, exist_ok=True)
        self.indices_dir.mkdir(parents=True, exist_ok=True)
        
    async def create_task(self, task_type: str, input_data: Dict, priority: int = 1) -> str:
        """Create new task with immediate persistence"""
        task_id = str(uuid.uuid4())
        
        task_data = {
            "schema_version": "1.0",
            "task_id": task_id,
            "type": task_type,
            "status": "pending",
            "priority": priority,
            "metadata": {
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "version": 1,
                "checksum": None
            },
            "input_data": input_data,
            "progress": {
                "percentage": 0.0,
                "current_step": "created",
                "steps_completed": 0,
                "total_steps": 0
            },
            "result": None,
            "error": None,
            "execution_log": []
        }
        
        # Add checksum
        task_data["metadata"]["checksum"] = self._calculate_checksum(task_data)
        
        # Atomic write to pending directory
        task_file = self.task_dir / "pending" / f"{task_id}.json"
        transaction = FileTransaction(task_file)
        transaction.write_json(task_data)
        
        # Update indices
        await self._update_indices(task_id, task_type, "pending", task_data["metadata"]["created_at"])
        
        return task_id
        
    async def get_task(self, task_id: str) -> Optional[Dict]:
        """Retrieve task from storage"""
        # Search across all status directories
        for status in ["pending", "processing", "completed", "failed"]:
            task_file = self.task_dir / status / f"{task_id}.json"
            if task_file.exists():
                with open(task_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        return None
        
    async def update_task_status(self, task_id: str, new_status: str, 
                               progress: Optional[Dict] = None,
                               result: Optional[Dict] = None,
                               error: Optional[str] = None):
        """Update task status with atomic file operations"""
        
        with self.lock_manager.acquire_lock(task_id):
            # Find current task file
            current_file = None
            current_status = None
            for status in ["pending", "processing", "completed", "failed"]:
                file_path = self.task_dir / status / f"{task_id}.json"
                if file_path.exists():
                    current_file = file_path
                    current_status = status
                    break
                    
            if not current_file:
                raise TaskNotFoundError(task_id)
                
            # Load current data
            with open(current_file, 'r', encoding='utf-8') as f:
                task_data = json.load(f)
                
            # Update fields
            task_data["status"] = new_status
            task_data["metadata"]["updated_at"] = datetime.utcnow().isoformat()
            task_data["metadata"]["version"] += 1
            
            if progress:
                task_data["progress"].update(progress)
            if result:
                task_data["result"] = result
                task_data["metadata"]["completed_at"] = datetime.utcnow().isoformat()
            if error:
                task_data["error"] = error
                
            # Add execution log entry
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "status_change": f"{current_status} -> {new_status}",
                "details": {}
            }
            task_data["execution_log"].append(log_entry)
            
            # Update checksum
            task_data["metadata"]["checksum"] = self._calculate_checksum(task_data)
            
            # Write to new status directory
            new_file = self.task_dir / new_status / f"{task_id}.json"
            transaction = FileTransaction(new_file)
            transaction.write_json(task_data)
            
            # Remove from old directory
            current_file.unlink()
            
            # Update indices
            await self._update_indices(task_id, task_data["type"], new_status, 
                                     task_data["metadata"]["updated_at"])
                                     
    def _calculate_checksum(self, data: Dict) -> str:
        """Calculate SHA256 checksum of task data"""
        # Remove checksum field for calculation
        data_copy = data.copy()
        if "metadata" in data_copy:
            data_copy["metadata"] = data_copy["metadata"].copy()
            data_copy["metadata"].pop("checksum", None)
            
        json_str = json.dumps(data_copy, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
        
    async def _update_indices(self, task_id: str, task_type: str, 
                            status: str, timestamp: str):
        """Update lookup indices for fast querying"""
        # Update by_type index
        type_index_file = self.indices_dir / "by_type.json"
        await self._update_index_file(type_index_file, task_type, task_id, status)
        
        # Update by_date index
        date_key = timestamp[:10]  # YYYY-MM-DD
        date_index_file = self.indices_dir / "by_date.json"
        await self._update_index_file(date_index_file, date_key, task_id, status)
        
        # Update by_status index
        status_index_file = self.indices_dir / "by_status.json"
        await self._update_index_file(status_index_file, status, task_id, status)
        
    async def _update_index_file(self, index_file: Path, key: str, 
                                task_id: str, status: str):
        """Update individual index file"""
        with self.lock_manager.acquire_lock(f"index_{index_file.name}"):
            # Load existing index
            index_data = {}
            if index_file.exists():
                with open(index_file, 'r', encoding='utf-8') as f:
                    index_data = json.load(f)
                    
            # Update index
            if key not in index_data:
                index_data[key] = {}
            index_data[key][task_id] = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Write back
            transaction = FileTransaction(index_file)
            transaction.write_json(index_data)
```

### 5. Unified Cache Management System

**File-Based Cache Manager**:
```python
class FileBasedCacheManager:
    """Comprehensive file-based caching with TTL and indexing"""
    
    def __init__(self, cache_dir: Path):
        self.cache_dir = Path(cache_dir)
        self.translations_dir = self.cache_dir / "translations"
        self.indices_dir = self.cache_dir / "indices"
        self.metadata_dir = self.cache_dir / "metadata"
        
        # Create directory structure
        for subdir in ["by_translator", "by_hash"]:
            (self.translations_dir / subdir).mkdir(parents=True, exist_ok=True)
        self.indices_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        
    async def get_translation_cache(self, source_text: str, translator: str,
                                  source_lang: str = "ja", target_lang: str = "zh") -> Optional[Dict]:
        """Retrieve cached translation with TTL validation"""
        
        # Generate cache key
        cache_key = self._generate_cache_key(source_text, translator, source_lang, target_lang)
        
        # Try by translator first
        translator_file = self.translations_dir / "by_translator" / translator / f"{cache_key}.json"
        if translator_file.exists():
            cache_data = await self._load_cache_file(translator_file)
            if cache_data and not self._is_expired(cache_data):
                await self._update_access_stats(cache_key)
                return cache_data["translation"]
                
        # Try by hash lookup
        hash_file = self.translations_dir / "by_hash" / f"{cache_key}.json"
        if hash_file.exists():
            cache_data = await self._load_cache_file(hash_file)
            if cache_data and not self._is_expired(cache_data):
                await self._update_access_stats(cache_key)
                return cache_data["translation"]
                
        return None
        
    async def set_translation_cache(self, source_text: str, translator: str,
                                  target_text: str, confidence: float = 1.0,
                                  source_lang: str = "ja", target_lang: str = "zh",
                                  ttl_seconds: int = 2592000, # 30 days
                                  additional_metadata: Dict = None):
        """Cache translation result with metadata"""
        
        cache_key = self._generate_cache_key(source_text, translator, source_lang, target_lang)
        
        cache_data = {
            "schema_version": "1.0",
            "cache_key": cache_key,
            "metadata": {
                "created_at": datetime.utcnow().isoformat(),
                "last_accessed": datetime.utcnow().isoformat(),
                "access_count": 1,
                "ttl": ttl_seconds,
                "expires_at": (datetime.utcnow() + timedelta(seconds=ttl_seconds)).isoformat(),
                "checksum": None
            },
            "translation": {
                "source_text": source_text,
                "target_text": target_text,
                "source_language": source_lang,
                "target_language": target_lang,
                "translator": translator,
                "confidence": confidence,
                "additional_metadata": additional_metadata or {}
            }
        }
        
        # Add checksum
        cache_data["metadata"]["checksum"] = self._calculate_checksum(cache_data)
        
        # Save to both organizational schemes
        translator_file = self.translations_dir / "by_translator" / translator / f"{cache_key}.json"
        translator_file.parent.mkdir(parents=True, exist_ok=True)
        
        hash_file = self.translations_dir / "by_hash" / f"{cache_key}.json"
        
        # Atomic writes
        for file_path in [translator_file, hash_file]:
            transaction = FileTransaction(file_path)
            transaction.write_json(cache_data)
            
        # Update indices
        await self._update_cache_indices(cache_key, translator, source_lang, target_lang)
        
    async def cleanup_expired_cache(self):
        """Remove expired cache entries"""
        current_time = datetime.utcnow()
        cleaned_count = 0
        
        # Scan all cache files
        for cache_file in self.translations_dir.rglob("*.json"):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    
                if self._is_expired(cache_data, current_time):
                    cache_file.unlink()
                    cleaned_count += 1
                    
            except (json.JSONDecodeError, KeyError):
                # Remove corrupted files
                cache_file.unlink()
                cleaned_count += 1
                
        # Update metadata
        await self._update_cache_stats({"cleaned_entries": cleaned_count})
        return cleaned_count
        
    def _generate_cache_key(self, source_text: str, translator: str, 
                          source_lang: str, target_lang: str) -> str:
        """Generate deterministic cache key"""
        key_data = f"{translator}:{source_lang}:{target_lang}:{source_text}"
        return hashlib.sha256(key_data.encode()).hexdigest()
        
    def _is_expired(self, cache_data: Dict, current_time: datetime = None) -> bool:
        """Check if cache entry is expired"""
        if current_time is None:
            current_time = datetime.utcnow()
            
        expires_at = datetime.fromisoformat(cache_data["metadata"]["expires_at"])
        return current_time > expires_at
        
    async def _update_access_stats(self, cache_key: str):
        """Update cache access statistics"""
        stats_file = self.metadata_dir / "access_stats.json"
        
        stats = {}
        if stats_file.exists():
            with open(stats_file, 'r', encoding='utf-8') as f:
                stats = json.load(f)
                
        if cache_key not in stats:
            stats[cache_key] = {"access_count": 0, "last_accessed": None}
            
        stats[cache_key]["access_count"] += 1
        stats[cache_key]["last_accessed"] = datetime.utcnow().isoformat()
        
        transaction = FileTransaction(stats_file)
        transaction.write_json(stats)
```

### 6. File-Based Backup and Recovery

**Comprehensive Backup System**:
```python
class FileBasedBackupManager:
    """Complete backup and recovery system for file-based storage"""
    
    def __init__(self, data_dir: Path, backup_dir: Path):
        self.data_dir = Path(data_dir)
        self.backup_dir = Path(backup_dir)
        
        # Create backup directory structure
        for backup_type in ["daily", "weekly", "snapshots"]:
            (self.backup_dir / backup_type).mkdir(parents=True, exist_ok=True)
            
    async def create_full_backup(self, backup_type: str = "daily") -> str:
        """Create comprehensive system backup"""
        backup_id = f"{backup_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path = self.backup_dir / backup_type / backup_id
        backup_path.mkdir(parents=True, exist_ok=True)
        
        backup_manifest = {
            "backup_id": backup_id,
            "backup_type": backup_type,
            "created_at": datetime.utcnow().isoformat(),
            "data_directory": str(self.data_dir),
            "files_backed_up": [],
            "total_size_bytes": 0,
            "checksum": None
        }
        
        # Backup all data files
        total_size = 0
        for data_file in self.data_dir.rglob("*.json"):
            relative_path = data_file.relative_to(self.data_dir)
            backup_file = backup_path / relative_path
            backup_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy with verification
            shutil.copy2(data_file, backup_file)
            file_size = backup_file.stat().st_size
            total_size += file_size
            
            backup_manifest["files_backed_up"].append({
                "path": str(relative_path),
                "size_bytes": file_size,
                "checksum": self._file_checksum(backup_file)
            })
            
        backup_manifest["total_size_bytes"] = total_size
        backup_manifest["checksum"] = self._calculate_manifest_checksum(backup_manifest)
        
        # Save manifest
        manifest_file = backup_path / "backup_manifest.json"
        with open(manifest_file, 'w', encoding='utf-8') as f:
            json.dump(backup_manifest, f, indent=2)
            
        # Create backup summary
        summary = {
            "backup_id": backup_id,
            "files_count": len(backup_manifest["files_backed_up"]),
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "created_at": backup_manifest["created_at"],
            "path": str(backup_path)
        }
        
        return backup_id
        
    async def restore_from_backup(self, backup_id: str) -> bool:
        """Restore system from backup with validation"""
        
        # Find backup
        backup_path = None
        for backup_type in ["daily", "weekly", "snapshots"]:
            potential_path = self.backup_dir / backup_type / backup_id
            if potential_path.exists():
                backup_path = potential_path
                break
                
        if not backup_path:
            raise BackupNotFoundError(backup_id)
            
        # Load and validate manifest
        manifest_file = backup_path / "backup_manifest.json"
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
            
        # Validate backup integrity
        if not await self._validate_backup_integrity(backup_path, manifest):
            raise BackupValidationError("Backup integrity check failed")
            
        # Create snapshot of current state before restore
        snapshot_id = await self.create_snapshot("pre_restore")
        
        try:
            # Clear current data (with backup)
            if self.data_dir.exists():
                temp_backup = self.data_dir.parent / f".restore_backup_{int(time.time())}"
                shutil.move(self.data_dir, temp_backup)
                
            # Restore from backup
            for file_info in manifest["files_backed_up"]:
                source_file = backup_path / file_info["path"]
                target_file = self.data_dir / file_info["path"]
                target_file.parent.mkdir(parents=True, exist_ok=True)
                
                shutil.copy2(source_file, target_file)
                
                # Verify file integrity
                if self._file_checksum(target_file) != file_info["checksum"]:
                    raise RestoreValidationError(f"File integrity check failed: {file_info['path']}")
                    
            # Clean up temporary backup
            if temp_backup.exists():
                shutil.rmtree(temp_backup)
                
            return True
            
        except Exception as e:
            # Rollback on failure
            if temp_backup.exists():
                if self.data_dir.exists():
                    shutil.rmtree(self.data_dir)
                shutil.move(temp_backup, self.data_dir)
            raise RestoreError(f"Restore failed: {e}")
            
    async def create_snapshot(self, label: str = "") -> str:
        """Create point-in-time snapshot"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        snapshot_id = f"snapshot_{timestamp}_{label}" if label else f"snapshot_{timestamp}"
        
        return await self.create_full_backup("snapshots")
        
    async def cleanup_old_backups(self, retention_policy: Dict[str, int]):
        """Clean up old backups according to retention policy"""
        current_time = datetime.now()
        
        for backup_type, retention_days in retention_policy.items():
            backup_dir = self.backup_dir / backup_type
            if not backup_dir.exists():
                continue
                
            cutoff_time = current_time - timedelta(days=retention_days)
            
            for backup_path in backup_dir.iterdir():
                if backup_path.is_dir():
                    # Parse backup timestamp from directory name
                    try:
                        timestamp_str = backup_path.name.split('_', 2)[1] + '_' + backup_path.name.split('_', 2)[2]
                        backup_time = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
                        
                        if backup_time < cutoff_time:
                            shutil.rmtree(backup_path)
                            
                    except (ValueError, IndexError):
                        # Skip directories with unexpected naming
                        continue
                        
    def _file_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
        
    def _calculate_manifest_checksum(self, manifest: Dict) -> str:
        """Calculate checksum of backup manifest"""
        manifest_copy = manifest.copy()
        manifest_copy.pop("checksum", None)
        json_str = json.dumps(manifest_copy, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
        
    async def _validate_backup_integrity(self, backup_path: Path, manifest: Dict) -> bool:
        """Validate backup file integrity"""
        for file_info in manifest["files_backed_up"]:
            file_path = backup_path / file_info["path"]
            if not file_path.exists():
                return False
                
            if self._file_checksum(file_path) != file_info["checksum"]:
                return False
                
        return True
```

### 7. Performance Optimization Strategies

**File-Based Indexing and Search**:
```python
class FileSearchOptimizer:
    """Advanced indexing and search for file-based storage"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.index_dir = data_dir / "indices"
        self.index_dir.mkdir(parents=True, exist_ok=True)
        
    async def build_search_indices(self):
        """Build comprehensive search indices"""
        
        # Task search index
        await self._build_task_index()
        
        # Cache search index  
        await self._build_cache_index()
        
        # Full-text search index
        await self._build_fulltext_index()
        
    async def _build_task_index(self):
        """Build optimized task search index"""
        task_index = {
            "by_type": {},
            "by_status": {},
            "by_date": {},
            "by_priority": {},
            "full_text": {}
        }
        
        # Scan all task files
        for status_dir in ["pending", "processing", "completed", "failed"]:
            status_path = self.data_dir / "tasks" / status_dir
            if not status_path.exists():
                continue
                
            for task_file in status_path.glob("*.json"):
                with open(task_file, 'r', encoding='utf-8') as f:
                    task_data = json.load(f)
                    
                task_id = task_data["task_id"]
                
                # Index by type
                task_type = task_data["type"]
                if task_type not in task_index["by_type"]:
                    task_index["by_type"][task_type] = []
                task_index["by_type"][task_type].append(task_id)
                
                # Index by status
                status = task_data["status"]
                if status not in task_index["by_status"]:
                    task_index["by_status"][status] = []
                task_index["by_status"][status].append(task_id)
                
                # Index by date
                created_date = task_data["metadata"]["created_at"][:10]
                if created_date not in task_index["by_date"]:
                    task_index["by_date"][created_date] = []
                task_index["by_date"][created_date].append(task_id)
                
                # Index by priority
                priority = task_data.get("priority", 1)
                if priority not in task_index["by_priority"]:
                    task_index["by_priority"][priority] = []
                task_index["by_priority"][priority].append(task_id)
                
                # Full-text indexing
                searchable_text = f"{task_type} {status} {task_data.get('progress', {}).get('current_step', '')}"
                for word in searchable_text.lower().split():
                    if word not in task_index["full_text"]:
                        task_index["full_text"][word] = []
                    if task_id not in task_index["full_text"][word]:
                        task_index["full_text"][word].append(task_id)
                        
        # Write index
        index_file = self.index_dir / "task_search.json"
        transaction = FileTransaction(index_file)
        transaction.write_json(task_index)
        
    async def search_tasks(self, query: str, filters: Dict = None) -> List[str]:
        """Fast task search using indices"""
        index_file = self.index_dir / "task_search.json"
        if not index_file.exists():
            await self._build_task_index()
            
        with open(index_file, 'r', encoding='utf-8') as f:
            index = json.load(f)
            
        result_sets = []
        
        # Apply filters
        if filters:
            if "type" in filters:
                type_results = set(index["by_type"].get(filters["type"], []))
                result_sets.append(type_results)
                
            if "status" in filters:
                status_results = set(index["by_status"].get(filters["status"], []))
                result_sets.append(status_results)
                
            if "date" in filters:
                date_results = set(index["by_date"].get(filters["date"], []))
                result_sets.append(date_results)
                
        # Text search
        if query:
            text_results = set()
            for word in query.lower().split():
                word_results = set(index["full_text"].get(word, []))
                if not text_results:
                    text_results = word_results
                else:
                    text_results = text_results.intersection(word_results)
            result_sets.append(text_results)
            
        # Combine results
        if result_sets:
            final_results = result_sets[0]
            for result_set in result_sets[1:]:
                final_results = final_results.intersection(result_set)
            return list(final_results)
        else:
            return []
```

## Production Deployment Configuration

### 1. Docker Volume Configuration

**Enhanced docker-compose.yml for File-Based Storage**:
```yaml
version: '3.8'

services:
  voicetransl-api:
    build: .
    volumes:
      # Configuration files (read-only)
      - ./config:/app/config:ro
      - ./project:/app/project:ro
      
      # Persistent data storage
      - app_data:/app/data                    # Main data directory
      - cache_data:/app/data/cache           # Cache storage
      - backup_data:/app/data/backups        # Backup storage
      
      # Model storage (read-only)
      - ./whisper:/app/whisper:ro
      - ./models:/app/models:ro
      
      # Temporary processing
      - temp_data:/tmp/voicetransl
      
      # Logs
      - ./logs:/app/logs
      
    environment:
      # Storage configuration
      - DATA_DIR=/app/data
      - CACHE_DIR=/app/data/cache  
      - BACKUP_DIR=/app/data/backups
      - TEMP_DIR=/tmp/voicetransl
      
      # Backup configuration
      - BACKUP_RETENTION_DAILY=7
      - BACKUP_RETENTION_WEEKLY=4
      - BACKUP_RETENTION_MONTHLY=12
      
    restart: unless-stopped
    
  # Backup service
  backup-manager:
    build: .
    command: python -m api.services.backup_service
    volumes:
      - app_data:/app/data:ro                # Read-only access to data
      - backup_data:/app/backups             # Write access to backups
      - external_backup:/mnt/external        # External backup storage
    environment:
      - DATA_DIR=/app/data
      - BACKUP_DIR=/app/backups
      - EXTERNAL_BACKUP_DIR=/mnt/external
    restart: unless-stopped
    depends_on:
      - voicetransl-api

volumes:
  app_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data
  cache_data:
    driver: local  
    driver_opts:
      type: none
      o: bind
      device: ./data/cache
  backup_data:
    driver: local
    driver_opts:
      type: none
      o: bind  
      device: ./backups
  temp_data:
    driver: tmpfs
    driver_opts:
      tmpfs-size: 2g
  external_backup:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/backup_storage
```

### 2. File System Monitoring

**Storage Health Monitoring**:
```python
class FileStorageMonitor:
    """Monitor file storage health and performance"""
    
    def __init__(self, data_dir: Path, alert_thresholds: Dict):
        self.data_dir = Path(data_dir)
        self.thresholds = alert_thresholds
        
    async def check_storage_health(self) -> Dict:
        """Comprehensive storage health check"""
        health_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "storage_usage": await self._check_storage_usage(),
            "file_integrity": await self._check_file_integrity(),
            "performance_metrics": await self._measure_performance(),
            "backup_status": await self._check_backup_status(),
            "alerts": []
        }
        
        # Generate alerts
        health_report["alerts"] = await self._generate_alerts(health_report)
        
        return health_report
        
    async def _check_storage_usage(self) -> Dict:
        """Check disk usage and file counts"""
        usage = {}
        
        for directory in self.data_dir.rglob('*'):
            if directory.is_dir():
                rel_path = directory.relative_to(self.data_dir)
                
                # Count files and calculate size
                file_count = len(list(directory.glob('**/*')))
                total_size = sum(f.stat().st_size for f in directory.rglob('*') if f.is_file())
                
                usage[str(rel_path)] = {
                    "file_count": file_count,
                    "size_bytes": total_size,
                    "size_mb": round(total_size / 1024 / 1024, 2)
                }
                
        return usage
        
    async def _check_file_integrity(self) -> Dict:
        """Validate file integrity using checksums"""
        integrity_report = {
            "files_checked": 0,
            "corrupted_files": [],
            "missing_checksums": []
        }
        
        # Check task files
        for task_file in self.data_dir.glob("tasks/**/*.json"):
            try:
                with open(task_file, 'r', encoding='utf-8') as f:
                    task_data = json.load(f)
                    
                integrity_report["files_checked"] += 1
                
                # Verify checksum if present
                if "metadata" in task_data and "checksum" in task_data["metadata"]:
                    stored_checksum = task_data["metadata"]["checksum"]
                    calculated_checksum = self._calculate_file_checksum(task_data)
                    
                    if stored_checksum != calculated_checksum:
                        integrity_report["corrupted_files"].append(str(task_file))
                else:
                    integrity_report["missing_checksums"].append(str(task_file))
                    
            except (json.JSONDecodeError, KeyError):
                integrity_report["corrupted_files"].append(str(task_file))
                
        return integrity_report
        
    async def _measure_performance(self) -> Dict:
        """Measure file system performance"""
        import time
        
        performance = {}
        
        # Measure write performance
        test_file = self.data_dir / "temp" / "perf_test.json"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        
        test_data = {"test": "data", "timestamp": time.time()}
        
        start_time = time.time()
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        write_time = time.time() - start_time
        
        # Measure read performance  
        start_time = time.time()
        with open(test_file, 'r') as f:
            json.load(f)
        read_time = time.time() - start_time
        
        # Clean up
        test_file.unlink()
        
        performance = {
            "write_time_ms": round(write_time * 1000, 2),
            "read_time_ms": round(read_time * 1000, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return performance
```

## Implementation Priority and Timeline

### Phase 1: Core File Storage (Weeks 1-3)
1. **Directory Structure Setup** (Week 1)
   - Create complete data directory layout
   - Implement FileTransaction class for atomic operations
   - Set up FileLockManager for concurrency control

2. **Task Persistence System** (Weeks 2-3)
   - Implement FileBasedTaskManager
   - Add JSON schema validation
   - Create task status management
   - Build basic indexing system

### Phase 2: Advanced Features (Weeks 4-6)
1. **Unified Cache Management** (Week 4)
   - Implement FileBasedCacheManager
   - Add TTL and expiration handling
   - Create cache indexing and search

2. **Backup and Recovery** (Week 5)
   - Implement FileBasedBackupManager
   - Add integrity validation
   - Create restore functionality

3. **Performance Optimization** (Week 6)
   - Add file-based search indices
   - Implement storage monitoring
   - Optimize file access patterns

### Phase 3: Production Readiness (Weeks 7-8)
1. **Production Deployment** (Week 7)
   - Configure Docker volumes
   - Set up automated backup service
   - Implement monitoring and alerting

2. **Testing and Validation** (Week 8)
   - Comprehensive integration testing
   - Performance benchmarking
   - Disaster recovery testing

## Success Metrics

### Data Persistence
- [ ] **Zero Task Loss**: No tasks lost on server restart
- [ ] **Complete Audit Trail**: All task history persisted and queryable  
- [ ] **Configuration Recovery**: All configuration changes tracked and recoverable
- [ ] **Translation Cache Persistence**: Translation cache survives server restarts

### Performance Targets
- [ ] **File Operations**: <50ms for JSON file read/write operations
- [ ] **Search Performance**: <200ms for indexed task searches
- [ ] **Cache Hit Rate**: >80% for translation cache, >90% for configuration cache
- [ ] **Backup Time**: <10 minutes for incremental backup, <30 minutes for full backup

### Reliability  
- [ ] **99.9% Data Integrity**: No data corruption or loss with checksums
- [ ] **24h Recovery**: Complete system recovery from backup within 24 hours
- [ ] **Concurrent Access**: Support 50+ concurrent file operations
- [ ] **Storage Efficiency**: <15% storage overhead for metadata

## Risk Assessment

### High Risk
- **File Locking**: Concurrent access to files could cause deadlocks or corruption
- **Storage Capacity**: Large model files and growing cache could exhaust disk space
- **Backup Integrity**: File corruption during backup could cause data loss

### Medium Risk  
- **Performance Scaling**: Large numbers of JSON files could slow down search operations
- **Atomic Operations**: Complex multi-file transactions could fail partially
- **Index Maintenance**: Search indices could become out of sync with data

### Low Risk
- **Directory Structure**: File organization is easily modifiable without data loss
- **JSON Schema Changes**: Schema evolution can be handled with versioning
- **Configuration Management**: Configuration changes are already well-tested

## Implementation Estimate

**Total Implementation Effort**: ~70% of storage features need building
- **Directory Structure & Atomic Operations**: 15 hours
- **File-Based Task Manager**: 25 hours  
- **Unified Cache System**: 20 hours
- **Backup & Recovery System**: 25 hours
- **Search & Indexing**: 20 hours
- **Performance Monitoring**: 15 hours
- **Testing & Integration**: 30 hours
- **Total**: ~150 hours of development

**Key Dependencies**:
1. File system with good performance characteristics (SSD recommended)
2. Atomic file operations support (rename-based atomic writes)
3. File locking mechanism for concurrency control
4. Sufficient disk space for data, cache, and backup storage
5. Backup storage infrastructure (local/network attached storage)

This comprehensive file-based storage architecture provides all the sophisticated features of a database system while maintaining simplicity, reliability, and ease of deployment without external dependencies.