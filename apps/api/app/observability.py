import json
import logging
import threading
import time
from collections import Counter
from typing import Dict


logger = logging.getLogger("kin.request")
_lock = threading.Lock()
_requests = Counter()
_duration_ms = Counter()
_in_flight = 0
_started_at = time.time()


def request_started() -> float:
    global _in_flight
    with _lock:
        _in_flight += 1
    return time.perf_counter()


def request_finished(method: str, route: str, status: int, started: float, request_id: str) -> None:
    global _in_flight
    elapsed_ms = (time.perf_counter() - started) * 1000
    key = (method, route, str(status))
    with _lock:
        _in_flight -= 1
        _requests[key] += 1
        _duration_ms[(method, route)] += elapsed_ms
    logger.info(json.dumps({
        "event": "http_request", "request_id": request_id, "method": method,
        "route": route, "status": status, "duration_ms": round(elapsed_ms, 2),
    }, separators=(",", ":")))


def snapshot() -> Dict[str, object]:
    with _lock:
        return {
            "uptime_seconds": int(time.time() - _started_at),
            "in_flight": _in_flight,
            "requests": dict(_requests),
            "duration_ms": dict(_duration_ms),
        }


def prometheus_text() -> str:
    state = snapshot()
    lines = [
        "# HELP kin_uptime_seconds Process uptime in seconds.",
        "# TYPE kin_uptime_seconds gauge",
        f"kin_uptime_seconds {state['uptime_seconds']}",
        "# HELP kin_http_requests_in_flight Current in-flight HTTP requests.",
        "# TYPE kin_http_requests_in_flight gauge",
        f"kin_http_requests_in_flight {state['in_flight']}",
        "# HELP kin_http_requests_total Total HTTP requests.",
        "# TYPE kin_http_requests_total counter",
    ]
    for (method, route, status), value in sorted(state["requests"].items()):
        lines.append(f'kin_http_requests_total{{method="{method}",route="{route}",status="{status}"}} {value}')
    lines.extend([
        "# HELP kin_http_request_duration_milliseconds_total Accumulated request duration.",
        "# TYPE kin_http_request_duration_milliseconds_total counter",
    ])
    for (method, route), value in sorted(state["duration_ms"].items()):
        lines.append(f'kin_http_request_duration_milliseconds_total{{method="{method}",route="{route}"}} {value:.3f}')
    return "\n".join(lines) + "\n"
