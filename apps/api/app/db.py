from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {
    # TiDB Serverless should fail a dead network operation quickly enough for
    # the API to return an actionable error instead of hanging indefinitely.
    "connect_timeout": 10,
    "read_timeout": 15,
    "write_timeout": 15,
}
engine_kwargs = {"pool_pre_ping": True, "connect_args": connect_args}
if not is_sqlite:
    # SQLAlchemy normally emits an extra ROLLBACK whenever a connection is
    # returned to the pool.  TiDB has already ended the transaction after our
    # explicit commit/rollback, and that redundant round trip can take the full
    # serverless idle timeout.  Connection/Session close still rolls back any
    # genuinely open transaction.
    engine_kwargs.update(pool_reset_on_return=None, pool_recycle=300, pool_timeout=15)
if settings.database_url in {"sqlite://", "sqlite:///:memory:"}:
    engine_kwargs["poolclass"] = StaticPool
engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_sqlite_schema() -> None:
    if engine.dialect.name == "sqlite":
        from . import models  # noqa: F401

        Base.metadata.create_all(engine)
