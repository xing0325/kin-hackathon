import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List

from dotenv import load_dotenv


load_dotenv()


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    env: str
    database_url: str
    demo_mode: bool
    agent_gateway_token: str
    cors_origins: List[str]
    embedding_dim: int
    auth_secret: str
    auth_exchange_token: str
    token_ttl_seconds: int
    release_sha: str


@lru_cache
def get_settings() -> Settings:
    origins = [v.strip() for v in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:4174,http://127.0.0.1:4174",
    ).split(",") if v.strip()]
    return Settings(
        env=os.getenv("NODE_ENV", "development"),
        database_url=os.getenv("DATABASE_URL", "sqlite:///./node_dev.db"),
        demo_mode=_bool("DEMO_MODE", True),
        agent_gateway_token=os.getenv("AGENT_GATEWAY_TOKEN", "change-me"),
        cors_origins=origins,
        embedding_dim=int(os.getenv("EMBEDDING_DIM", "64")),
        auth_secret=os.getenv("AUTH_SECRET", "development-only-change-me"),
        auth_exchange_token=os.getenv("AUTH_EXCHANGE_TOKEN", "change-me"),
        token_ttl_seconds=int(os.getenv("TOKEN_TTL_SECONDS", "86400")),
        release_sha=os.getenv("RELEASE_SHA", "dev"),
    )
