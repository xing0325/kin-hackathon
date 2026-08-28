.PHONY: api-install api-test api-run api-seed api-simulate api-openapi worker-once

API_VENV := apps/api/.venv
API_PY := $(API_VENV)/bin/python

api-install:
	python3 -m venv $(API_VENV)
	$(API_VENV)/bin/pip install -e 'apps/api[dev]'

api-test:
	cd apps/api && .venv/bin/pytest

api-run:
	cd apps/api && .venv/bin/uvicorn app.main:app --reload

api-seed:
	curl -fsS -X POST http://127.0.0.1:8000/v1/demo/seed

api-simulate:
	cd apps/api && .venv/bin/python scripts/simulate_two_devices.py

api-openapi:
	cd apps/api && .venv/bin/python -c 'import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))' > ../../packages/contracts/openapi.json

worker-once:
	cd apps/api && .venv/bin/python -m app.worker --once
