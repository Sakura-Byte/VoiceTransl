"""
Rate limiting and resource management for VoiceTransl API
"""

import time
import asyncio
import logging
from typing import Dict, Any, Optional, Tuple
from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from api.core.config import get_settings
from api.core.exceptions import RateLimitError
from api.core.error_handler import get_error_logger


logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter with sliding window"""
    
    def __init__(
        self,
        requests_per_window: int = 100,
        window_seconds: int = 3600,
        burst_size: Optional[int] = None
    ):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.burst_size = burst_size or requests_per_window
        
        # Storage for request tracking
        self.request_history: Dict[str, deque] = defaultdict(deque)
        self.token_buckets: Dict[str, Dict[str, Any]] = defaultdict(dict)
        
        # Cleanup tracking
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
    
    async def is_allowed(self, client_id: str, endpoint: str = "default") -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is allowed under rate limits
        
        Args:
            client_id: Unique identifier for the client (IP, user ID, etc.)
            endpoint: Endpoint identifier for per-endpoint limits
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        
        current_time = time.time()
        key = f"{client_id}:{endpoint}"
        
        # Cleanup old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            await self._cleanup_old_entries()
            self.last_cleanup = current_time
        
        # Initialize token bucket if not exists
        if key not in self.token_buckets:
            self.token_buckets[key] = {
                'tokens': self.burst_size,
                'last_refill': current_time
            }
        
        bucket = self.token_buckets[key]
        
        # Refill tokens based on time passed
        time_passed = current_time - bucket['last_refill']
        tokens_to_add = (time_passed / self.window_seconds) * self.requests_per_window
        bucket['tokens'] = min(self.burst_size, bucket['tokens'] + tokens_to_add)
        bucket['last_refill'] = current_time
        
        # Check if request is allowed
        if bucket['tokens'] >= 1:
            bucket['tokens'] -= 1
            
            # Track request in sliding window
            self.request_history[key].append(current_time)
            
            # Calculate rate limit info
            rate_limit_info = self._get_rate_limit_info(key, current_time)
            
            return True, rate_limit_info
        else:
            # Request denied
            rate_limit_info = self._get_rate_limit_info(key, current_time)
            rate_limit_info['retry_after'] = self._calculate_retry_after(bucket)
            
            return False, rate_limit_info
    
    def _get_rate_limit_info(self, key: str, current_time: float) -> Dict[str, Any]:
        """Get current rate limit information"""
        
        # Count requests in current window
        window_start = current_time - self.window_seconds
        history = self.request_history[key]
        
        # Remove old requests
        while history and history[0] < window_start:
            history.popleft()
        
        requests_in_window = len(history)
        remaining = max(0, self.requests_per_window - requests_in_window)
        
        # Calculate reset time
        if history:
            reset_time = history[0] + self.window_seconds
        else:
            reset_time = current_time + self.window_seconds
        
        return {
            'limit': self.requests_per_window,
            'remaining': remaining,
            'reset': int(reset_time),
            'window_seconds': self.window_seconds
        }
    
    def _calculate_retry_after(self, bucket: Dict[str, Any]) -> int:
        """Calculate retry-after time in seconds"""
        
        # Time needed to get one token
        time_per_token = self.window_seconds / self.requests_per_window
        return int(time_per_token) + 1
    
    async def _cleanup_old_entries(self):
        """Clean up old rate limit entries"""
        
        current_time = time.time()
        cutoff_time = current_time - (self.window_seconds * 2)  # Keep extra history
        
        # Clean up request history
        keys_to_remove = []
        for key, history in self.request_history.items():
            # Remove old requests
            while history and history[0] < cutoff_time:
                history.popleft()
            
            # Remove empty histories
            if not history:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.request_history[key]
            if key in self.token_buckets:
                del self.token_buckets[key]
        
        logger.debug(f"Cleaned up {len(keys_to_remove)} old rate limit entries")


class ResourceManager:
    """Manages system resources and prevents overload"""
    
    def __init__(self, max_concurrent_tasks: int = 5, max_memory_mb: int = 1024):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.max_memory_mb = max_memory_mb
        
        self.active_tasks = 0
        self.task_semaphore = asyncio.Semaphore(max_concurrent_tasks)
        
        # Resource monitoring
        self.last_resource_check = 0
        self.resource_check_interval = 30  # seconds
    
    async def acquire_task_slot(self) -> bool:
        """Acquire a slot for task processing"""
        
        # Check system resources
        if not await self._check_system_resources():
            return False
        
        # Try to acquire semaphore (non-blocking)
        try:
            self.task_semaphore.acquire_nowait()
            self.active_tasks += 1
            return True
        except asyncio.TimeoutError:
            return False
    
    def release_task_slot(self):
        """Release a task processing slot"""
        
        if self.active_tasks > 0:
            self.active_tasks -= 1
            self.task_semaphore.release()
    
    async def _check_system_resources(self) -> bool:
        """Check if system has enough resources"""
        
        current_time = time.time()
        
        # Only check resources periodically
        if current_time - self.last_resource_check < self.resource_check_interval:
            return True
        
        self.last_resource_check = current_time
        
        try:
            import psutil
            
            # Check memory usage
            memory = psutil.virtual_memory()
            memory_usage_mb = (memory.total - memory.available) / 1024 / 1024
            
            if memory_usage_mb > self.max_memory_mb:
                logger.warning(f"High memory usage: {memory_usage_mb:.1f}MB")
                return False
            
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 90:
                logger.warning(f"High CPU usage: {cpu_percent}%")
                return False
            
            return True
            
        except ImportError:
            # psutil not available, assume resources are OK
            return True
        except Exception as e:
            logger.error(f"Error checking system resources: {e}")
            return True  # Assume OK on error


class RateLimitMiddleware:
    """FastAPI middleware for rate limiting"""
    
    def __init__(self):
        settings = get_settings()
        
        # Create rate limiters for different endpoint types
        self.global_limiter = RateLimiter(
            requests_per_window=settings.rate_limit_requests,
            window_seconds=settings.rate_limit_window
        )
        
        # More restrictive limits for resource-intensive endpoints
        self.task_limiter = RateLimiter(
            requests_per_window=10,  # 10 tasks per hour
            window_seconds=3600,
            burst_size=3  # Allow small bursts
        )
        
        self.resource_manager = ResourceManager(
            max_concurrent_tasks=settings.max_concurrent_tasks
        )
        
        self.error_logger = get_error_logger()
    
    async def __call__(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        # Get client identifier
        client_id = self._get_client_id(request)
        endpoint = request.url.path
        
        # Determine which limiter to use
        if self._is_task_endpoint(endpoint):
            limiter = self.task_limiter
            endpoint_type = "task"
        else:
            limiter = self.global_limiter
            endpoint_type = "general"
        
        # Check rate limits
        allowed, rate_info = await limiter.is_allowed(client_id, endpoint_type)
        
        if not allowed:
            # Log rate limit violation
            self.error_logger.log_rate_limit_exceeded(client_id, endpoint)
            
            # Return rate limit error
            headers = {
                "X-RateLimit-Limit": str(rate_info['limit']),
                "X-RateLimit-Remaining": str(rate_info['remaining']),
                "X-RateLimit-Reset": str(rate_info['reset']),
                "Retry-After": str(rate_info.get('retry_after', 60))
            }
            
            raise HTTPException(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers=headers
            )
        
        # For task endpoints, also check resource availability
        if self._is_task_endpoint(endpoint):
            if not await self.resource_manager.acquire_task_slot():
                raise HTTPException(
                    status_code=503,
                    detail="Server is currently overloaded. Please try again later."
                )
            
            try:
                response = await call_next(request)
            finally:
                self.resource_manager.release_task_slot()
        else:
            response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(rate_info['limit'])
        response.headers["X-RateLimit-Remaining"] = str(rate_info['remaining'])
        response.headers["X-RateLimit-Reset"] = str(rate_info['reset'])
        
        return response
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        
        # Try to get client IP
        if request.client:
            client_ip = request.client.host
        else:
            client_ip = "unknown"
        
        # In production, you might want to use authentication info
        # For now, use IP address
        return client_ip
    
    def _is_task_endpoint(self, path: str) -> bool:
        """Check if endpoint creates tasks"""
        
        task_endpoints = ["/api/transcribe", "/api/translate"]
        return any(path.startswith(endpoint) for endpoint in task_endpoints)


# Global instances
_rate_limiter = None
_resource_manager = None


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter instance"""
    global _rate_limiter
    if _rate_limiter is None:
        settings = get_settings()
        _rate_limiter = RateLimiter(
            requests_per_window=settings.rate_limit_requests,
            window_seconds=settings.rate_limit_window
        )
    return _rate_limiter


def get_resource_manager() -> ResourceManager:
    """Get global resource manager instance"""
    global _resource_manager
    if _resource_manager is None:
        settings = get_settings()
        _resource_manager = ResourceManager(
            max_concurrent_tasks=settings.max_concurrent_tasks
        )
    return _resource_manager
