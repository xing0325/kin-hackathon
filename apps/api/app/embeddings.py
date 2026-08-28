import hashlib
import math
import re
from typing import Iterable, List

from .config import get_settings


TOKEN_RE = re.compile(r"[\w+#.-]+", re.UNICODE)


def deterministic_embedding(text: str, dim: int = 0) -> List[float]:
    """Dependency-free demo embedding; replace through the worker in production."""
    size = dim or get_settings().embedding_dim
    vector = [0.0] * size
    for token in TOKEN_RE.findall(text.lower()):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % size
        sign = 1.0 if digest[4] & 1 else -1.0
        vector[index] += sign * (1.0 + min(len(token), 12) / 12.0)
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [round(v / norm, 8) for v in vector]


def cosine_similarity(a: Iterable[float], b: Iterable[float]) -> float:
    left = list(a)
    right = list(b)
    if not left or len(left) != len(right):
        return 0.0
    dot = sum(x * y for x, y in zip(left, right))
    ln = math.sqrt(sum(x * x for x in left))
    rn = math.sqrt(sum(y * y for y in right))
    return 0.0 if not ln or not rn else max(-1.0, min(1.0, dot / (ln * rn)))
