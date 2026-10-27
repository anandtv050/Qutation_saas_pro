"""
Owner alerts on Telegram (new signups etc.).

Needs TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID; silently does nothing when
either is unset. Never raises — an alert failure must not break the request.
"""
import os

import httpx

from app.core.logger import getLogger

logger = getLogger()


async def fnNotifyOwner(strText: str) -> None:
    # Telegram alerts are switched off in this release: the callers stay, nothing is sent.
    # To turn them back on, remove this return (and set TELEGRAM_ADMIN_CHAT_ID).
    return
    # strToken = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    # strChatId = (os.getenv("TELEGRAM_ADMIN_CHAT_ID") or "").strip()
    # if not strToken or not strChatId:
    #     return
    # try:
    #     async with httpx.AsyncClient(timeout=5) as client:
    #         await client.post(
    #             f"https://api.telegram.org/bot{strToken}/sendMessage",
    #             json={"chat_id": strChatId, "text": strText},
    #         )
    # except Exception as e:
    #     logger.warning(f"Owner alert failed: {e}")
