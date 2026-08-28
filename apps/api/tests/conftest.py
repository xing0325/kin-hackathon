import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["DEMO_MODE"] = "true"
os.environ["AGENT_GATEWAY_TOKEN"] = "test-agent-token"
os.environ["AUTH_EXCHANGE_TOKEN"] = "test-auth-exchange-token"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as test_client:
        yield test_client
