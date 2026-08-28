import asyncio
import json
from typing import Any, AsyncIterator, Dict, Set


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: Set[asyncio.Queue] = set()

    async def publish(self, event: Dict[str, Any]) -> None:
        for queue in list(self._subscribers):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            queue.put_nowait(event)

    async def stream(self) -> AsyncIterator[str]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=64)
        self._subscribers.add(queue)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield "event: update\ndata: %s\n\n" % json.dumps(event, ensure_ascii=False, default=str)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            self._subscribers.discard(queue)


broker = EventBroker()
