"""telegram_id -> {intUserId, strEmail} mapping in a JSON file.

Validation-stage simplicity. Move to a DB table (tbl_user_telegram) later
if/when multi-user proves out.
"""
from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Optional

_SESSIONS_FILE = Path(__file__).resolve().parents[2] / ".bot_sessions.json"
_lock = Lock()


def _fnLoad() -> dict:
    if not _SESSIONS_FILE.exists():
        return {}
    try:
        return json.loads(_SESSIONS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _fnSave(dctData: dict) -> None:
    _SESSIONS_FILE.write_text(json.dumps(dctData, indent=2), encoding="utf-8")


def fnGetSession(intTelegramId: int) -> Optional[dict]:
    with _lock:
        return _fnLoad().get(str(intTelegramId))


def fnSetSession(intTelegramId: int, intUserId: int, strEmail: str) -> None:
    with _lock:
        dctData = _fnLoad()
        dctData[str(intTelegramId)] = {"intUserId": intUserId, "strEmail": strEmail}
        _fnSave(dctData)


def fnClearSession(intTelegramId: int) -> None:
    with _lock:
        dctData = _fnLoad()
        dctData.pop(str(intTelegramId), None)
        _fnSave(dctData)
