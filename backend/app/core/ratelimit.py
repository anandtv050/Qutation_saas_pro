"""
Tiny in-memory rate limiter (fixed window, per key). One process only — enough to slow
down scripted signups; not a replacement for a proxy-level limit.
"""
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class ClsRateLimiter:
    def __init__(self, intMaxHits: int, intWindowSeconds: int) -> None:
        self.intMaxHits = intMaxHits
        self.intWindowSeconds = intWindowSeconds
        self.dctHits: dict[str, list[float]] = defaultdict(list)

    def fnCheck(self, strKey: str, strMessage: str) -> None:
        """Count one hit for strKey; raise HTTP 429 once it exceeds the window's budget."""
        fltNow = time.monotonic()
        lstRecent = [t for t in self.dctHits[strKey] if fltNow - t < self.intWindowSeconds]
        if len(lstRecent) >= self.intMaxHits:
            self.dctHits[strKey] = lstRecent
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=strMessage)
        lstRecent.append(fltNow)
        self.dctHits[strKey] = lstRecent
        if len(self.dctHits) > 5000:  # drop stale keys so memory stays bounded
            for strOld in [k for k, v in self.dctHits.items() if not v or fltNow - v[-1] >= self.intWindowSeconds]:
                del self.dctHits[strOld]


def fnClientIp(request: Request) -> str:
    """Client IP, honouring the first X-Forwarded-For hop (the app runs behind a proxy)."""
    strForwarded = request.headers.get("x-forwarded-for", "")
    if strForwarded:
        return strForwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# New accounts per IP: 5 per hour.
objSignupLimiter = ClsRateLimiter(intMaxHits=5, intWindowSeconds=3600)
