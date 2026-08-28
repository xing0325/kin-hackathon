import argparse
import json
import time

from sqlalchemy import select

from .db import SessionLocal, create_sqlite_schema
from .models import Job, utcnow


def process_one() -> bool:
    with SessionLocal() as db:
        job = db.scalar(
            select(Job).where(Job.status == "pending", Job.available_at <= utcnow()).order_by(Job.available_at).limit(1)
        )
        if not job:
            return False
        job.status = "running"
        job.attempts += 1
        db.commit()
        try:
            payload = json.loads(job.payload_json)
            # The deterministic API result is already usable. This worker is the seam
            # for OpenAI-compatible summary/embedding providers in deployment.
            print(json.dumps({"job": job.id, "type": job.type, "payload": payload}, ensure_ascii=False))
            job.status = "done"
            job.last_error = None
        except Exception as exc:  # pragma: no cover - defensive worker boundary
            job.status = "failed"
            job.last_error = str(exc)
        db.add(job)
        db.commit()
        return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--poll-seconds", type=float, default=1.0)
    args = parser.parse_args()
    create_sqlite_schema()
    if args.once:
        process_one()
        return
    while True:
        if not process_one():
            time.sleep(args.poll_seconds)


if __name__ == "__main__":
    main()
