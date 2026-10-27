"""Trade catalogue seeds (backend/app/data/trade_seed.json).

Generated from the website's sample quotations by frontend/scripts/export-trade-seed.mjs,
so the items and rates a new user starts with match the public sample pages.
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

SEED_FILE = Path(__file__).resolve().parents[2] / "data" / "trade_seed.json"


@lru_cache(maxsize=1)
def fnLoadTrades() -> dict:
    """{trade key: {key, label, service, items[]}}"""
    with open(SEED_FILE, encoding="utf-8") as f:
        return {t["key"]: t for t in json.load(f)["trades"]}


def fnGetTrade(strKey: Optional[str]) -> Optional[dict]:
    return fnLoadTrades().get((strKey or "").strip().lower())
