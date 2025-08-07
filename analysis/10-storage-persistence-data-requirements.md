# Analysis 10: Storage & Persistence - Data Storage Requirements

## Executive Summary

**Current State**: 30% proper persistence, file-based storage with in-memory gaps  
**Implementation Status**: Sophisticated translation cache, but critical task data is ephemeral  
**Completion Estimate**: ~70% of production persistence features missing  

The VoiceTransl system uses a hybrid storage approach combining file-based persistence for long-term data (configurations, translation cache, models) with in-memory storage for transient data (active tasks, WebSocket connections). While the GalTransl translation system has sophisticated JSON-based caching, the core API task management system lacks persistence, causing data loss on server restarts and limiting production scalability.

## Current Storage Architecture

### 1. File-Based Storage Systems

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

### 3. Docker Volume Configuration

**Persistent Volumes** (`docker-compose.yml`):
```yaml
voicetransl-api:
  volumes:
    # Configuration persistence
    - ./config:/app/config:ro                    # Read-only config
    - ./project:/app/project:rw                  # Read-write project data
    
    # Model storage (read-only)
    - ./whisper:/app/whisper:ro                  # Whisper models
    - ./models:/app/models:ro                    # Other AI models
    
    # Runtime data
    - ./logs:/app/logs:rw                        # Application logs
    - ./temp:/tmp/voicetransl:rw                 # Temporary files

# Monitoring persistence
grafana:
  volumes:
    - grafana-storage:/var/lib/grafana           # Grafana dashboards/data
```

**Storage Allocation**:
- **Configuration**: ~10MB (YAML configs, backups)
- **Models**: ~2-10GB (Whisper, Sakura, other AI models)
- **Project Data**: Variable (translations, cache, dictionaries)
- **Temporary Files**: Variable (audio processing, uploads)
- **Logs**: ~100MB-1GB (rotating logs)

## Storage Gaps and Issues

### 1. Critical Task Persistence Gap

**Problem**: Task Manager stores all data in memory
```python
# Current implementation - data lost on restart
class TaskManager:
    def __init__(self):
        self._tasks: Dict[str, Task] = {}  # No persistence
        
# Required: Database or file-based task persistence
class PersistentTaskManager:
    def __init__(self, storage_backend):
        self.storage = storage_backend
        
    async def create_task(self, task_data):
        task = Task(**task_data)
        await self.storage.save_task(task)  # Persist immediately
        return task.task_id
        
    async def get_task(self, task_id):
        return await self.storage.load_task(task_id)
```

**Impact**:
- Long-running transcription tasks lost on server restart
- External integrations (Kikoeru) lose task status on deployment
- No audit trail of completed tasks
- Cannot implement task resume functionality

### 2. Missing Database Layer

**Current State**: No database system
- All data stored in files or memory
- No relational data management
- No ACID transaction support
- No concurrent access coordination

**Required Database Schema**:
```sql
-- Task persistence
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    input_data JSONB NOT NULL,
    result JSONB,
    error TEXT,
    progress FLOAT DEFAULT 0.0,
    current_step TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Configuration history
CREATE TABLE config_versions (
    id SERIAL PRIMARY KEY,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    version VARCHAR(20),
    description TEXT
);

-- Translation cache (centralized)
CREATE TABLE translation_cache (
    id SERIAL PRIMARY KEY,
    source_text TEXT NOT NULL,
    target_text TEXT NOT NULL,
    source_lang VARCHAR(10),
    target_lang VARCHAR(10),
    translator VARCHAR(50),
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_text, source_lang, target_lang, translator)
);
```

### 3. No Backup and Recovery Strategy

**Missing Backup Systems**:
- Task data not backed up (because it's not persisted)
- Translation cache files not centrally backed up
- Configuration backups exist but not automated
- No disaster recovery procedures

**Required Backup Strategy**:
```python
class BackupManager:
    def __init__(self, storage_paths: Dict[str, str]):
        self.paths = storage_paths
        
    async def create_full_backup(self) -> str:
        """Create comprehensive system backup"""
        backup_id = f"backup_{datetime.now().isoformat()}"
        
        # Backup database
        await self._backup_database(backup_id)
        
        # Backup file storage
        await self._backup_files(backup_id)
        
        # Backup configuration
        await self._backup_configuration(backup_id)
        
        return backup_id
        
    async def restore_from_backup(self, backup_id: str):
        """Restore system from backup"""
        pass
```

## Required Storage Architecture

### 1. Database Layer Implementation

**Database Selection**: PostgreSQL
- **JSON Support**: Native JSONB for task input/result data
- **Performance**: Excellent for read-heavy task queries
- **Reliability**: ACID transactions, proven in production
- **Extensions**: Full-text search for logs, time-series for metrics

**SQLAlchemy Integration**:
```python
# api/core/database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

class DatabaseManager:
    def __init__(self, database_url: str):
        self.engine = create_async_engine(database_url)
        self.session_factory = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )
        
    async def get_session(self) -> AsyncSession:
        async with self.session_factory() as session:
            yield session
            
# Task model
class TaskModel(Base):
    __tablename__ = "tasks"
    
    id = Column(UUID, primary_key=True)
    type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    input_data = Column(JSON, nullable=False)
    result = Column(JSON)
    progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 2. Persistent Task Manager

**Enhanced Task Manager with Database**:
```python
class PersistentTaskManager(TaskManager):
    def __init__(self, database_manager: DatabaseManager):
        super().__init__()
        self.db = database_manager
        
    async def create_task(self, task_type, input_data, processor) -> str:
        # Create task in database immediately
        async with self.db.get_session() as session:
            task = TaskModel(
                id=str(uuid.uuid4()),
                type=task_type,
                status="pending",
                input_data=input_data
            )
            session.add(task)
            await session.commit()
            
        # Start processing
        asyncio.create_task(self._process_persistent_task(task.id, processor))
        return task.id
        
    async def get_task_status(self, task_id: str):
        async with self.db.get_session() as session:
            result = await session.get(TaskModel, task_id)
            if not result:
                raise TaskNotFoundError(task_id)
            return result.to_dict()
            
    async def _process_persistent_task(self, task_id: str, processor):
        # Update status in database throughout processing
        async with self.db.get_session() as session:
            task = await session.get(TaskModel, task_id)
            task.status = "processing"
            task.started_at = datetime.utcnow()
            await session.commit()
            
        try:
            result = await processor(task)
            
            # Save result to database
            async with self.db.get_session() as session:
                task = await session.get(TaskModel, task_id)
                task.status = "completed"
                task.result = result
                task.completed_at = datetime.utcnow()
                await session.commit()
                
        except Exception as e:
            # Save error to database
            async with self.db.get_session() as session:
                task = await session.get(TaskModel, task_id)
                task.status = "failed"
                task.error = str(e)
                await session.commit()
```

### 3. Centralized Cache Management

**Unified Caching Layer**:
```python
class CacheManager:
    def __init__(self, redis_url: str = None):
        # Redis for high-performance caching (optional)
        self.redis = redis.asyncio.from_url(redis_url) if redis_url else None
        # File-based cache as fallback
        self.file_cache_dir = "cache"
        
    async def get_translation_cache(self, source_text: str, translator: str):
        """Get cached translation"""
        cache_key = f"translation:{translator}:{hash(source_text)}"
        
        # Try Redis first
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
                
        # Fall back to database/file cache
        return await self._get_file_cache(cache_key)
        
    async def set_translation_cache(self, source_text: str, translator: str, result: dict):
        """Cache translation result"""
        cache_key = f"translation:{translator}:{hash(source_text)}"
        
        # Cache in Redis
        if self.redis:
            await self.redis.setex(
                cache_key, 
                timedelta(hours=24).total_seconds(), 
                json.dumps(result)
            )
            
        # Also save to persistent storage
        await self._set_file_cache(cache_key, result)
```

### 4. File Storage Management

**Organized File Storage**:
```python
class FileStorageManager:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.structure = {
            "uploads": self.base_path / "uploads",
            "processing": self.base_path / "processing", 
            "results": self.base_path / "results",
            "cache": self.base_path / "cache",
            "logs": self.base_path / "logs",
            "backups": self.base_path / "backups"
        }
        
    async def initialize(self):
        """Create directory structure"""
        for directory in self.structure.values():
            directory.mkdir(parents=True, exist_ok=True)
            
    async def store_upload(self, file_data: bytes, filename: str) -> str:
        """Store uploaded file with unique name"""
        file_id = str(uuid.uuid4())
        file_path = self.structure["uploads"] / f"{file_id}_{filename}"
        
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_data)
            
        return str(file_path)
        
    async def move_to_processing(self, upload_path: str) -> str:
        """Move file from uploads to processing"""
        src = Path(upload_path)
        dst = self.structure["processing"] / src.name
        shutil.move(src, dst)
        return str(dst)
        
    async def cleanup_old_files(self, max_age_days: int = 7):
        """Clean up old temporary files"""
        cutoff = datetime.now() - timedelta(days=max_age_days)
        
        for directory in [self.structure["processing"], self.structure["uploads"]]:
            for file_path in directory.glob("*"):
                if file_path.stat().st_mtime < cutoff.timestamp():
                    file_path.unlink()
```

## Production Deployment Storage

### 1. Docker Compose with Database

**Enhanced docker-compose.yml**:
```yaml
services:
  # Database service
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: voicetransl
      POSTGRES_USER: voicetransl
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    restart: unless-stopped
    
  # Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  # Main API service
  voicetransl-api:
    depends_on:
      - postgres
      - redis
    environment:
      # Database configuration
      - DATABASE_URL=postgresql+asyncpg://voicetransl:${DB_PASSWORD}@postgres/voicetransl
      - REDIS_URL=redis://redis:6379/0
    volumes:
      # Persistent storage
      - app_data:/app/data           # Application data
      - model_data:/app/models:ro    # AI models (read-only)
      - backup_data:/app/backups     # Backup storage

volumes:
  postgres_data:
  redis_data:
  app_data:
  model_data:
  backup_data:
```

### 2. Backup and Recovery System

**Automated Backup Service**:
```python
class ProductionBackupService:
    def __init__(self, db_manager, file_manager, backup_storage):
        self.db = db_manager
        self.files = file_manager
        self.storage = backup_storage
        
    async def create_daily_backup(self):
        """Create comprehensive daily backup"""
        backup_id = f"daily_{datetime.now().strftime('%Y%m%d')}"
        
        # Database backup
        db_backup = await self._backup_database()
        
        # File storage backup
        files_backup = await self._backup_files()
        
        # Configuration backup
        config_backup = await self._backup_configuration()
        
        # Create backup manifest
        manifest = {
            "backup_id": backup_id,
            "created_at": datetime.utcnow().isoformat(),
            "database_backup": db_backup,
            "files_backup": files_backup,
            "config_backup": config_backup,
            "version": self._get_app_version()
        }
        
        # Upload to backup storage (S3, etc.)
        await self.storage.upload_backup(backup_id, manifest)
        
    async def restore_from_backup(self, backup_id: str):
        """Restore system from backup"""
        manifest = await self.storage.download_backup_manifest(backup_id)
        
        # Stop application services
        await self._stop_services()
        
        # Restore database
        await self._restore_database(manifest["database_backup"])
        
        # Restore files
        await self._restore_files(manifest["files_backup"])
        
        # Restore configuration
        await self._restore_configuration(manifest["config_backup"])
        
        # Restart services
        await self._start_services()
```

## Implementation Priority

### Phase 1: Critical Persistence (High Priority)
1. **Database Setup**: PostgreSQL with basic tables (tasks, config)
2. **Persistent Task Manager**: Replace in-memory storage with database
3. **Basic Backup**: Automated database and config backups
4. **File Storage Organization**: Structured file storage management

### Phase 2: Advanced Storage (Medium Priority)  
1. **Redis Caching**: High-performance cache layer
2. **Translation Cache Integration**: Centralize GalTransl cache
3. **Monitoring Storage**: Persistent metrics and logs
4. **Backup Recovery**: Full backup/restore capabilities

### Phase 3: Enterprise Features (Low Priority)
1. **Distributed Storage**: Multi-node storage coordination
2. **Advanced Analytics**: Data warehouse for usage analytics
3. **Automated Cleanup**: Intelligent data lifecycle management
4. **Disaster Recovery**: Hot backup and failover systems

## Success Metrics

### Data Persistence
- [ ] **Zero Task Loss**: No tasks lost on server restart
- [ ] **Complete Audit Trail**: All task history persisted and queryable
- [ ] **Configuration Recovery**: All configuration changes tracked and recoverable
- [ ] **Translation Cache Persistence**: Translation cache survives server restarts

### Performance Targets
- [ ] **Database Response**: <100ms for task status queries
- [ ] **File Storage Performance**: <2s for 100MB file operations  
- [ ] **Cache Hit Rate**: >80% for translation cache, >90% for configuration cache
- [ ] **Backup Time**: <30 minutes for complete system backup

### Reliability
- [ ] **99.9% Data Integrity**: No data corruption or loss
- [ ] **24h Recovery**: Complete system recovery from backup within 24 hours
- [ ] **Concurrent Access**: Support 50+ concurrent database operations
- [ ] **Storage Efficiency**: <20% storage overhead for metadata

## Risk Assessment

### High Risk
- **Database Migration**: Moving from file-based to database storage requires careful migration
- **Data Loss**: Risk of losing existing translation cache and configuration during migration
- **Performance Impact**: Database operations could slow down API response times

### Medium Risk
- **Storage Capacity**: Large model files and growing cache could exhaust disk space
- **Backup Complexity**: Comprehensive backup/restore system requires significant testing
- **Concurrent Access**: Multiple API instances could create database locking issues

### Low Risk
- **Redis Dependency**: Redis is optional, system can fall back to database/file cache
- **File Organization**: File storage reorganization is non-destructive
- **Configuration Management**: Configuration changes are already tracked

## Implementation Estimate

**Total Implementation Effort**: ~70% of storage features need building
- **Database Schema & Setup**: 20 hours
- **Persistent Task Manager**: 25 hours
- **File Storage Management**: 15 hours
- **Backup & Recovery System**: 20 hours
- **Cache Integration**: 15 hours
- **Testing & Migration**: 25 hours
- **Total**: ~120 hours of development

**Key Dependencies**:
1. PostgreSQL database setup and configuration
2. SQLAlchemy ORM integration with FastAPI
3. Data migration strategy for existing cache files
4. Docker volume configuration for persistent storage
5. Backup storage infrastructure (local/cloud)

This analysis reveals that VoiceTransl has solid foundations for file-based storage but critical gaps in task persistence and centralized data management. Implementing a proper database layer will dramatically improve reliability, enable production scalability, and provide the data persistence required for external integrations like Kikoeru.