"""
PROTOTYPE MODE: Redis is optional.
All cache functions silently do nothing if Redis is not running.
Original Redis logic preserved — just wrapped in try/except.
"""
import logging

logger = logging.getLogger(__name__)

# Try to connect to Redis, but don't crash if it's unavailable
try:
    import redis.asyncio as aioredis
    from app.core.config import settings
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    logger.info("Redis client initialized (connection will be tested on first use)")
except Exception as e:
    redis_client = None
    logger.warning(f"Redis unavailable, caching disabled: {e}")


async def get_cache(key: str):
    if not redis_client:
        return None
    try:
        return await redis_client.get(key)
    except Exception:
        return None


async def set_cache(key: str, value: str, ttl: int = 60):
    if not redis_client:
        return
    try:
        await redis_client.setex(key, ttl, value)
    except Exception:
        pass


async def delete_cache(key: str):
    if not redis_client:
        return
    try:
        await redis_client.delete(key)
    except Exception:
        pass


async def publish(channel: str, message: str):
    if not redis_client:
        return
    try:
        await redis_client.publish(channel, message)
    except Exception:
        pass
