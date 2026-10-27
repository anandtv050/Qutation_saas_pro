"""
End-to-end API test for self-serve signup, run against the LOCAL dev database:

    cd backend
    venv/Scripts/python.exe tests/e2e_self_serve.py

Drives the real FastAPI app in-process (no server needed). Only the Google token check is
mocked. Creates throw-away users (zz-e2e-*@example.com) and deletes them at the end.
No extra dependencies: httpx and Pillow are already in requirements.
"""
import asyncio
import io
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

import httpx
from PIL import Image

from app.api.login.service import ClsLoginService
from app.core.database import ClsDatabasepool
from app.core.ratelimit import objSignupLimiter
from app.main import app

# Run against another database (e.g. a copy) without touching .env: QP_TEST_DB=name
os.environ["DB_NAME"] = os.environ.get("QP_TEST_DB") or os.environ["DB_NAME"]

EMAIL = "zz-e2e-owner@example.com"
EMAIL_SKIP = "zz-e2e-skip@example.com"
EMAILS = [EMAIL] + [f"zz-e2e-rl{i}@example.com" for i in range(6)] + ["zz-e2e-legacy@example.com", EMAIL_SKIP]
dctClaims = {}
lstLogos = []


def check(blnOk, strMsg):
    print(("  ok   " if blnOk else "  FAIL ") + strMsg)
    if not blnOk:
        raise SystemExit(1)


def fnPdfText(bytPdf):
    """All text drawn in a ReportLab PDF (streams are ASCII85 + Flate)."""
    import base64, re, zlib
    lstOut = []
    for m in re.finditer(rb"stream\r?\n(.*?)endstream", bytPdf, re.S):
        bytBody = m.group(1).strip()
        try:
            if bytBody.endswith(b"~>"):
                bytBody = base64.a85decode(bytBody[:-2])
            lstOut.append(zlib.decompress(bytBody))
        except Exception:
            continue
    return b"\n".join(lstOut).decode("latin1")


def fnFakeVerify(self, strToken):
    return dict(dctClaims)


ClsLoginService._fnVerifyGoogleToken = fnFakeVerify


def fnPng(intSize=64):
    buf = io.BytesIO()
    Image.new("RGB", (intSize, intSize), (200, 30, 30)).save(buf, "PNG")
    return buf.getvalue()


async def google(client, strSub, strEmail, strIp="10.0.0.1", **extra):
    dctClaims.update({"sub": strSub, "email": strEmail, "email_verified": True, "name": "E2E Owner"})
    return await client.post("/auth/google", json={"strIdToken": "x", **extra}, headers={"X-Forwarded-For": strIp})


async def main():
    pool = await ClsDatabasepool().fnGetPool() if False else None
    insDb = ClsDatabasepool()
    await insDb.fnStartUp()
    pool = await insDb.fnGetPool()
    try:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM tbl_user WHERE vchr_email = ANY($1::text[])", EMAILS)

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=60) as client:
            print("1. Google signup (source + trade hint)")
            r = await google(client, "e2e-sub-1", EMAIL, strSource="Hero", strIndustry="cctv")
            check(r.status_code == 200, "POST /auth/google -> 200")
            dctInfo = r.json()["dctUserInfo"]
            check(dctInfo["blnIsNewUser"] and dctInfo["blnNeedsOnboarding"], "new user flagged for onboarding")
            check(dctInfo["dctSubscription"]["strStatus"] == "trial", "7-day trial plan assigned")
            dctAuth = {"Authorization": f"Bearer {r.json()['strAccessToken']}"}
            async with pool.acquire() as conn:
                rowU = await conn.fetchrow(
                    "SELECT vchr_signup_source, vchr_signup_trade FROM tbl_user WHERE vchr_email = $1", EMAIL)
            check(rowU["vchr_signup_source"] == "hero" and rowU["vchr_signup_trade"] == "cctv", "source + trade hint stored")

            print("2. Onboarding state")
            r = await client.post("/onboarding/state", headers=dctAuth)
            dctState = r.json()
            check(r.status_code == 200 and len(dctState["lstTrades"]) == 15, "15 trade chips")
            check(dctState["strTrade"] == "cctv" and dctState["blnNeedsOnboarding"], "trade preselected from ?industry=")
            check(not dctState["blnShowChecklist"], "no dashboard checklist before the wizard is finished")

            print("3. Step 1 profile")
            r = await client.post("/onboarding/profile", json={"businessName": "  E2E Traders ", "phone": "+919876543210"}, headers=dctAuth)
            check(r.status_code == 200 and r.json()["strBusinessName"] == "E2E Traders", "business name saved + trimmed")
            r = await client.post("/onboarding/profile", json={"businessName": "   "}, headers=dctAuth)
            check(r.status_code == 422, "empty business name rejected")

            print("4. Step 2 trade seeding is idempotent")
            r = await client.post("/onboarding/trade", json={"strTrade": "cctv"}, headers=dctAuth)
            check(r.status_code == 200 and r.json()["intItemCount"] == 8, "cctv seeds 8 items")
            r = await client.post("/onboarding/trade", json={"strTrade": "cctv"}, headers=dctAuth)
            check(r.json()["intItemCount"] == 8, "same trade again: still 8 (no duplicates)")
            r = await client.post("/onboarding/trade", json={"strTrade": "nope"}, headers=dctAuth)
            check(r.status_code == 400, "unknown trade rejected")
            r = await client.post("/onboarding/trade", json={"strTrade": "plumbing"}, headers=dctAuth)
            check(r.json()["intItemCount"] == 10, "switching trade replaces untouched seeded items (10 plumbing)")
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE tbl_inventory SET dbl_unit_price = 12345 WHERE vchr_item_code = 'SMP-PLUMBING-01' "
                    "AND fk_bint_user_id = (SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1)", EMAIL)
            r = await client.post("/onboarding/trade", json={"strTrade": "cctv"}, headers=dctAuth)
            async with pool.acquire() as conn:
                intEdited = await conn.fetchval(
                    "SELECT COUNT(*) FROM tbl_inventory WHERE vchr_item_code = 'SMP-PLUMBING-01' AND dbl_unit_price = 12345 "
                    "AND fk_bint_user_id = (SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1)", EMAIL)
            check(intEdited == 1, "an item the user edited is kept when switching trade")

            print("5. Step 3 logo upload")
            r = await client.post("/onboarding/logo", files={"objFile": ("logo.png", fnPng(), "image/png")}, headers=dctAuth)
            check(r.status_code == 200 and r.json()["vchUrl"].startswith("uploads/logos/"), "PNG logo stored")
            lstLogos.append(r.json()["vchUrl"])
            r = await client.post("/onboarding/logo", files={"objFile": ("x.png", b"not an image", "image/png")}, headers=dctAuth)
            check(r.status_code in (400, 415), "fake image rejected")
            r = await client.post("/onboarding/logo", files={"objFile": ("big.png", b"\x00" * (2 * 1024 * 1024 + 10), "image/png")}, headers=dctAuth)
            check(r.status_code == 413, "file over 2 MB rejected")

            print("6. Finish creates the sample quotation once")
            r = await client.post("/onboarding/finish", headers=dctAuth)
            check(r.status_code == 200 and r.json()["intQuotationId"], "sample quotation created")
            intSample = r.json()["intQuotationId"]
            r = await client.post("/onboarding/finish", headers=dctAuth)
            check(r.json()["intQuotationId"] == intSample, "second finish returns the same quotation")
            async with pool.acquire() as conn:
                intCount = await conn.fetchval(
                    "SELECT COUNT(*) FROM tbl_quotation WHERE fk_bint_user_id = (SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1)", EMAIL)
                intLines = await conn.fetchval("SELECT COUNT(*) FROM tbl_quotation_item WHERE fk_bint_quotation_id = $1", intSample)
            check(intCount == 1 and intLines == 5, "exactly 1 quotation with 5 seeded lines")

            print("7. Checklist + PDF download")
            r = await client.post("/onboarding/state", headers=dctAuth)
            dctState = r.json()
            check(not dctState["blnNeedsOnboarding"] and dctState["blnShowChecklist"], "wizard closed, checklist visible")
            check(dctState["dctChecklist"]["blnLogo"] and not dctState["dctChecklist"]["blnFirstQuotation"], "logo ticked, own quotation not yet (sample excluded)")
            check(dctState["intSampleQuotationId"] == intSample, "state reports the sample quotation id")
            r = await client.post("/pdf/quotation", json={"intQuotationId": intSample, "blnIncludeInfoPage": True}, headers=dctAuth)
            check(r.status_code == 200 and r.content[:4] == b"%PDF", f"sample quotation PDF generated ({len(r.content)} bytes)")
            r = await client.post("/onboarding/state", headers=dctAuth)
            check(r.json()["dctChecklist"]["blnPdfDownloaded"], "first-PDF tick recorded")
            r = await client.post("/quotation/add", json={"strCustomerName": "Real Customer", "lstItems": [
                {"strItemName": "Item", "dblQuantity": 1, "dblUnitPrice": 100}]}, headers=dctAuth)
            check(r.status_code == 200 and r.json()["intStatus"] == 1, "user's own quotation saved")
            r = await client.post("/onboarding/state", headers=dctAuth)
            check(not r.json()["blnShowChecklist"], "all three ticked -> checklist hides")
            r = await client.post("/print-settings/get", json={"vchModule": "QUOTATION"}, headers=dctAuth)
            check(r.status_code in (402, 403), f"trial user has no print settings access (got {r.status_code})")

            print("8. Returning user + existing flows")
            r = await google(client, "e2e-sub-1", EMAIL)
            check(not r.json()["dctUserInfo"]["blnIsNewUser"] and not r.json()["dctUserInfo"]["blnNeedsOnboarding"], "returning Google user goes straight to the app")
            r = await client.post("/auth/login", json={"email": EMAIL, "password": "whatever123"})
            check(r.status_code == 401 and "Google" in r.json()["detail"], "password login on a Google-only account -> friendly 401")
            r = await client.post("/auth/signup", json={"email": "zz-e2e-legacy@example.com", "password": "password123", "username": "Legacy"})
            check(r.status_code == 200, "legacy /auth/signup still works")
            r = await client.post("/auth/login", json={"email": "zz-e2e-legacy@example.com", "password": "password123"})
            check(r.status_code == 200 and "blnNeedsOnboarding" not in r.json()["dctUserInfo"], "password login unchanged")
            dctLeg = {"Authorization": f"Bearer {r.json()['strAccessToken']}"}
            rq = await client.post("/quotation/add", json={"strCustomerName": "Cust", "lstItems": [{"strItemName": "Item", "dblQuantity": 1, "dblUnitPrice": 100}]}, headers=dctLeg)
            rp = await client.post("/pdf/quotation", json={"intQuotationId": rq.json()["data"]["intPkQuotationId"]}, headers=dctLeg)
            check(rp.status_code == 200 and "zz-e2e-legacy@example.com" in fnPdfText(rp.content), "password account with no print settings: email still printed on the PDF (unchanged)")
            r = await client.post("/onboarding/state", headers={"Authorization": f"Bearer {r.json()['strAccessToken']}"})
            check(r.status_code == 200 and not r.json()["blnNeedsOnboarding"] and not r.json()["blnShowChecklist"], "non-Google user: no wizard, no checklist")
            r = await client.post("/onboarding/state")
            check(r.status_code == 401, "onboarding endpoints need a login")

            print("8b. finish with blnSkipSample (website editor flow): no sample quotation")
            r = await google(client, "e2e-sub-skip", EMAIL_SKIP, strIp="198.51.100.20")
            dctSkipAuth = {"Authorization": f"Bearer {r.json()['strAccessToken']}"}
            check(r.json()["dctUserInfo"]["blnNeedsOnboarding"], "new user is flagged for onboarding")
            r = await client.post("/onboarding/profile", json={"businessName": "Skip Traders"}, headers=dctSkipAuth)
            r = await client.post("/onboarding/finish", json={"blnSkipSample": True}, headers=dctSkipAuth)
            check(r.status_code == 200 and r.json()["intQuotationId"] is None, "finish(skip) returns no quotation id")
            async with pool.acquire() as conn:
                intQ = await conn.fetchval("SELECT COUNT(*) FROM tbl_quotation WHERE fk_bint_user_id = (SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1)", EMAIL_SKIP)
                rowS = await conn.fetchrow("SELECT bln_needs_onboarding, tim_onboarded_at FROM tbl_user WHERE vchr_email = $1", EMAIL_SKIP)
            check(intQ == 0, "no sample quotation was created")
            check(rowS["bln_needs_onboarding"] is False and rowS["tim_onboarded_at"] is not None, "onboarding flag cleared, onboarded_at set")
            r = await client.post("/onboarding/finish", headers=dctSkipAuth)
            check(r.status_code == 200, "finish with no body still works (existing wizard callers)")
            rq = await client.post("/quotation/add", json={"strCustomerName": "Cust", "lstItems": [{"strItemName": "Item", "dblQuantity": 1, "dblUnitPrice": 100}]}, headers=dctSkipAuth)
            rp = await client.post("/pdf/quotation", json={"intQuotationId": rq.json()["data"]["intPkQuotationId"]}, headers=dctSkipAuth)
            strText = fnPdfText(rp.content)
            check(rp.status_code == 200 and "SKIP TRADERS" in strText and EMAIL_SKIP not in strText, "Google-only account with no print settings: its email is NOT printed on the PDF")

            print("9. Signup rate limit (5 new accounts / hour / IP)")
            objSignupLimiter.dctHits.clear()
            lstCodes = []
            for i in range(6):
                r = await google(client, f"e2e-rl-{i}", f"zz-e2e-rl{i}@example.com", strIp="203.0.113.9")
                lstCodes.append(r.status_code)
            check(lstCodes == [200] * 5 + [429], f"6th signup from one IP blocked ({lstCodes})")
            r = await google(client, "e2e-sub-1", EMAIL, strIp="203.0.113.9")
            check(r.status_code == 200, "existing users can still sign in from a limited IP")
    finally:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM tbl_user WHERE vchr_email = ANY($1::text[])", EMAILS)
            intLeft = await conn.fetchval("SELECT COUNT(*) FROM tbl_user WHERE vchr_email = ANY($1::text[])", EMAILS)
        for strRel in lstLogos:
            (ROOT / strRel).unlink(missing_ok=True)
        print(f"cleanup: {intLeft} test users left")
        await insDb.fnDisconnectPool()
    print("ALL PASSED")


asyncio.run(main())
