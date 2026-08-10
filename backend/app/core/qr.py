"""Shared QR-code image generation helper.

Used by print_settings (and anything else that needs a QR PNG saved under
the shared /uploads static mount) so the generation logic lives in one place.
"""
import qrcode
from pathlib import Path

# backend/app/core/qr.py -> parents[2] == backend/
UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
QR_SUBDIR = "qrcodes"


def fnGenerateQrImage(strLink: str, intUserId: int, strModule: str) -> str | None:
    """Generate a QR PNG for `strLink` and save it under uploads/qrcodes/.

    Filename is deterministic per (user, module) so re-saving overwrites the
    previous QR instead of accumulating orphaned files.

    Returns the relative path (e.g. "uploads/qrcodes/qr_12_QUOTATION.png"),
    the same shape as stored vchr_logo_url/vchr_signature_url values, so it
    can be resolved by ClsPdfGenerator._asset_path_or_url() unchanged.
    Returns None if strLink is blank.
    """
    link = (strLink or "").strip()
    if not link:
        return None

    qr_dir = UPLOADS_DIR / QR_SUBDIR
    qr_dir.mkdir(parents=True, exist_ok=True)

    strModule = (strModule or "QUOTATION").upper()
    filename = f"qr_{intUserId}_{strModule}.png"
    file_path = qr_dir / filename

    img = qrcode.make(link)
    img.save(str(file_path))

    return f"uploads/{QR_SUBDIR}/{filename}"


def fnDeleteQrImage(intUserId: int, strModule: str) -> None:
    """Remove a previously generated QR PNG for (user, module), if present."""
    strModule = (strModule or "QUOTATION").upper()
    file_path = UPLOADS_DIR / QR_SUBDIR / f"qr_{intUserId}_{strModule}.png"
    try:
        if file_path.exists():
            file_path.unlink()
    except OSError:
        pass
