"""
In-Memory / Safe Cache Stub.
Eliminates external Redis dependency for the prototype while keeping
all function signatures identical for caller compatibility.
"""
_local_cache = {}


async def get_cache(key: str):
    return _local_cache.get(key)


async def set_cache(key: str, value: str, ttl: int = 60):
    _local_cache[key] = value


async def delete_cache(key: str):
    _local_cache.pop(key, None)


async def publish(channel: str, message: str):
    pass
