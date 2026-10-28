import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Base backend directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SQLITE_PATH = os.path.join(BACKEND_DIR, "healthlink.db").replace("\\", "/")

db_url = settings.DATABASE_URL
engine_kwargs = {}

# If SQLite is configured or fallback needed:
if not db_url or "sqlite" in db_url:
    # Always resolve to absolute path of healthlink.db in backend
    db_url = f"sqlite+aiosqlite:///{DEFAULT_SQLITE_PATH}"
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    engine_kwargs = {"pool_size": 20, "max_overflow": 10}

engine = create_async_engine(
    db_url,
    echo=False,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
