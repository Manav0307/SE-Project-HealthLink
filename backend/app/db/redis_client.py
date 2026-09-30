import redis.asyncio as aioredis
from app.core.config import settings

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_cache(key: str):
    return await redis_client.get(key)


async def set_cache(key: str, value: str, ttl: int = 60):
    await redis_client.setex(key, ttl, value)


async def delete_cache(key: str):
    await redis_client.delete(key)


async def publish(channel: str, message: str):
    await redis_client.publish(channel, message)
