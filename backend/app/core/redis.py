import asyncio
import time
from abc import ABC, abstractmethod

import redis.asyncio as redis

from app.core.config import get_settings


class AsyncCacheBackend(ABC):
    backend_name: str = "unknown"

    @abstractmethod
    async def ping(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def get(self, key: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        raise NotImplementedError

    @abstractmethod
    async def lrem(self, key: str, count: int, value: str) -> int:
        raise NotImplementedError

    @abstractmethod
    async def lpop(self, key: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def rpush(self, key: str, *values: str) -> int:
        raise NotImplementedError

    @abstractmethod
    async def expire(self, key: str, seconds: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def sadd(self, key: str, *members: str) -> int:
        raise NotImplementedError

    @abstractmethod
    async def aclose(self) -> None:
        raise NotImplementedError


class InMemoryCacheBackend(AsyncCacheBackend):
    backend_name = "memory"

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._strings: dict[str, str] = {}
        self._lists: dict[str, list[str]] = {}
        self._sets: dict[str, set[str]] = {}
        self._expiry: dict[str, float] = {}

    async def _purge_expired(self, key: str) -> None:
        expires_at = self._expiry.get(key)
        if expires_at is not None and expires_at <= time.monotonic():
            self._strings.pop(key, None)
            self._lists.pop(key, None)
            self._sets.pop(key, None)
            self._expiry.pop(key, None)

    async def ping(self) -> bool:
        return True

    async def get(self, key: str) -> str | None:
        async with self._lock:
            await self._purge_expired(key)
            return self._strings.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        async with self._lock:
            self._strings[key] = value
            if ex is not None:
                self._expiry[key] = time.monotonic() + ex
            else:
                self._expiry.pop(key, None)

    async def lrem(self, key: str, count: int, value: str) -> int:
        async with self._lock:
            await self._purge_expired(key)
            items = self._lists.setdefault(key, [])
            if count == 0:
                removed = items.count(value)
                self._lists[key] = [item for item in items if item != value]
                return removed
            removed = 0
            new_items: list[str] = []
            for item in items:
                if item == value and removed < abs(count):
                    removed += 1
                    continue
                new_items.append(item)
            self._lists[key] = new_items
            return removed

    async def lpop(self, key: str) -> str | None:
        async with self._lock:
            await self._purge_expired(key)
            items = self._lists.get(key, [])
            if not items:
                return None
            return items.pop(0)

    async def rpush(self, key: str, *values: str) -> int:
        async with self._lock:
            await self._purge_expired(key)
            items = self._lists.setdefault(key, [])
            items.extend(values)
            return len(items)

    async def expire(self, key: str, seconds: int) -> bool:
        async with self._lock:
            if key not in self._strings and key not in self._lists and key not in self._sets:
                return False
            self._expiry[key] = time.monotonic() + seconds
            return True

    async def sadd(self, key: str, *members: str) -> int:
        async with self._lock:
            await self._purge_expired(key)
            bucket = self._sets.setdefault(key, set())
            before = len(bucket)
            bucket.update(members)
            return len(bucket) - before

    async def aclose(self) -> None:
        return None


class RedisCacheBackend(AsyncCacheBackend):
    backend_name = "redis"

    def __init__(self, url: str) -> None:
        self._client = redis.from_url(url, decode_responses=True)

    async def ping(self) -> bool:
        await self._client.ping()
        return True

    async def get(self, key: str) -> str | None:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        await self._client.set(key, value, ex=ex)

    async def lrem(self, key: str, count: int, value: str) -> int:
        return await self._client.lrem(key, count, value)

    async def lpop(self, key: str) -> str | None:
        return await self._client.lpop(key)

    async def rpush(self, key: str, *values: str) -> int:
        return await self._client.rpush(key, *values)

    async def expire(self, key: str, seconds: int) -> bool:
        return bool(await self._client.expire(key, seconds))

    async def sadd(self, key: str, *members: str) -> int:
        return await self._client.sadd(key, *members)

    async def aclose(self) -> None:
        await self._client.aclose()


_cache_backend: AsyncCacheBackend | None = None


async def _create_cache_backend() -> AsyncCacheBackend:
    settings = get_settings()
    if settings.redis_configured:
        backend = RedisCacheBackend(settings.REDIS_URL.strip())
        try:
            await backend.ping()
            return backend
        except Exception:
            await backend.aclose()
    return InMemoryCacheBackend()


def get_redis() -> AsyncCacheBackend:
    if _cache_backend is None:
        return InMemoryCacheBackend()
    return _cache_backend


async def init_cache() -> AsyncCacheBackend:
    global _cache_backend
    _cache_backend = await _create_cache_backend()
    return _cache_backend


async def get_cache() -> AsyncCacheBackend:
    if _cache_backend is None:
        return await init_cache()
    return _cache_backend


async def close_redis() -> None:
    global _cache_backend
    if _cache_backend is not None:
        await _cache_backend.aclose()
        _cache_backend = None
