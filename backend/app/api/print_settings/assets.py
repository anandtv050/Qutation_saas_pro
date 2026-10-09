"""Logo / signature image upload for print settings.

Files are stored under uploads/{logos|signatures}/ and only the relative path
(e.g. "uploads/logos/logo_12_QUOTATION_ab12cd34.png") is saved in
tbl_print_model_settings, the same shape ClsPdfGenerator._asset_path_or_url()
already resolves.

Every upload gets a fresh file name so that:
  * browsers never show a stale cached image after a replace, and
  * the file the DB currently points at (the live PDF) is untouched until the
    user presses Save.
Older files for the same (user, module, kind) are removed, except the one the
DB still references.
"""
import io
import os
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError

UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads"

MAX_BYTES = 2 * 1024 * 1024          # 2 MB raw upload
MAX_PIXELS = 25_000_000              # reject decompression bombs
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}

# kind -> (sub-folder, file prefix, max long-side px, DB column)
KINDS = {
    "logo":      ("logos",      "logo",      600, "vchr_logo_url"),
    "signature": ("signatures", "signature", 500, "vchr_signature_url"),
}
MODULES = {"QUOTATION", "INVOICE", "WARRANTY", "ADVANCE_RECEIPT"}


def fnValidateKindModule(strKind: str, strModule: str):
    strKind = (strKind or "").strip().lower()
    strModule = (strModule or "").strip().upper()
    if strKind not in KINDS:
        raise HTTPException(status_code=400, detail="Invalid asset type.")
    if strModule not in MODULES:
        raise HTTPException(status_code=400, detail="Invalid module.")
    return strKind, strModule


async def fnReadLimited(objFile: UploadFile) -> bytes:
    """Read the upload, aborting as soon as it exceeds MAX_BYTES."""
    bufData = bytearray()
    while True:
        chunk = await objFile.read(64 * 1024)
        if not chunk:
            break
        bufData.extend(chunk)
        if len(bufData) > MAX_BYTES:
            raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 2 MB.")
    if not bufData:
        raise HTTPException(status_code=400, detail="The selected file is empty.")
    return bytes(bufData)


def fnProcessImage(bytData: bytes, intMaxSide: int) -> bytes:
    """Validate the bytes are a real PNG/JPEG/WEBP, normalise and shrink to PNG."""
    try:
        with Image.open(io.BytesIO(bytData)) as probe:
            if probe.format not in ALLOWED_FORMATS:
                raise HTTPException(status_code=415, detail="Only PNG, JPG or WEBP images are allowed.")
            if probe.width * probe.height > MAX_PIXELS:
                raise HTTPException(status_code=400, detail="Image dimensions are too large.")
            probe.load()                      # full decode: catches truncated files
            img = ImageOps.exif_transpose(probe)  # honour phone-camera rotation
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="This file is not a valid image.")

    # Keep transparency for logos/stamps; flatten anything exotic (CMYK, 16-bit, palette).
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")

    if max(img.size) > intMaxSide:
        img.thumbnail((intMaxSide, intMaxSide), Image.LANCZOS)

    bufOut = io.BytesIO()
    img.save(bufOut, format="PNG", optimize=True)
    return bufOut.getvalue()


def fnSaveAtomic(pathFile: Path, bytData: bytes) -> None:
    """Write via temp file + rename so a crash never leaves a half-written image."""
    pathFile.parent.mkdir(parents=True, exist_ok=True)
    pathTmp = pathFile.with_suffix(".tmp")
    try:
        pathTmp.write_bytes(bytData)
        os.replace(pathTmp, pathFile)
    finally:
        if pathTmp.exists():
            try:
                pathTmp.unlink()
            except OSError:
                pass


def fnCleanupOld(strFolder: str, strPrefix: str, intUserId: int, strModule: str, setKeep: set) -> None:
    """Delete earlier uploads for this user/module/kind, keeping `setKeep` file names."""
    pathDir = UPLOADS_DIR / strFolder
    if not pathDir.is_dir():
        return
    rxOwn = re.compile(rf"^{strPrefix}_{intUserId}_{strModule}_[0-9a-f]{{8}}\.png$")
    for pathOld in pathDir.iterdir():
        if rxOwn.match(pathOld.name) and pathOld.name not in setKeep:
            try:
                pathOld.unlink()
            except OSError:
                pass


async def fnStoreAsset(objPool, intUserId: int, strKind: str, strModule: str, objFile: UploadFile) -> str:
    """Validate, process and store an upload. Returns the relative path to save in the DB."""
    strKind, strModule = fnValidateKindModule(strKind, strModule)
    strFolder, strPrefix, intMaxSide, strColumn = KINDS[strKind]

    bytRaw = await fnReadLimited(objFile)
    bytPng = await run_in_threadpool(fnProcessImage, bytRaw, intMaxSide)

    strName = f"{strPrefix}_{intUserId}_{strModule}_{uuid.uuid4().hex[:8]}.png"
    fnSaveAtomic(UPLOADS_DIR / strFolder / strName, bytPng)

    # Keep the file the DB currently uses (live PDFs) and the one just written.
    setKeep = {strName}
    async with objPool.acquire() as conn:
        strCurrent = await conn.fetchval(
            f"SELECT {strColumn} FROM tbl_print_model_settings "
            "WHERE fk_bint_user_id = $1 AND vchr_module = $2",
            intUserId, strModule,
        )
    if strCurrent:
        setKeep.add(Path(str(strCurrent)).name)
    fnCleanupOld(strFolder, strPrefix, intUserId, strModule, setKeep)

    return f"uploads/{strFolder}/{strName}"
