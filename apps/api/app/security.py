import hashlib
import hmac
import json
import secrets
import time
import base64
from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User


def new_id(prefix: str) -> str:
    return "%s_%s" % (prefix, secrets.token_hex(8))


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_access_token(user_id: str, now: Optional[int] = None) -> str:
    settings = get_settings()
    issued_at = int(time.time() if now is None else now)
    payload = _b64(json.dumps({"sub": user_id, "iat": issued_at, "exp": issued_at + settings.token_ttl_seconds}, separators=(",", ":")).encode())
    signature = _b64(hmac.new(settings.auth_secret.encode(), payload.encode(), hashlib.sha256).digest())
    return f"kin1.{payload}.{signature}"


def verify_access_token(token: str, now: Optional[int] = None) -> Optional[str]:
    try:
        version, payload, signature = token.split(".")
        if version != "kin1":
            return None
        expected = _b64(hmac.new(get_settings().auth_secret.encode(), payload.encode(), hashlib.sha256).digest())
        if not secrets.compare_digest(signature, expected):
            return None
        claims = json.loads(_unb64(payload))
        current = int(time.time() if now is None else now)
        if not isinstance(claims.get("sub"), str) or current >= int(claims["exp"]):
            return None
        return claims["sub"]
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def get_current_user(
    authorization: Optional[str] = Header(default=None), kin_session: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif kin_session:
        token = kin_session
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    user_id = verify_access_token(token)
    if user_id is None and get_settings().demo_mode:
        user_id = token
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid access token")
    return user


def require_agent_gateway(x_agent_gateway_token: Optional[str] = Header(default=None)) -> None:
    expected = get_settings().agent_gateway_token
    if not secrets.compare_digest(x_agent_gateway_token or "", expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid agent gateway token")


def require_auth_exchange(x_auth_exchange_token: Optional[str] = Header(default=None)) -> None:
    expected = get_settings().auth_exchange_token
    if not secrets.compare_digest(x_auth_exchange_token or "", expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid auth exchange token")
