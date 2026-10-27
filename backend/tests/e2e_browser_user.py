"""
Helper for tests/e2e_browser.mjs (run it from backend/):

    venv/Scripts/python.exe tests/e2e_browser_user.py create    -> prints JSON {token, userInfo}
    venv/Scripts/python.exe tests/e2e_browser_user.py delete    -> removes the test user and its uploads

Creates a user exactly as a first Google sign-in does (free trial, needs onboarding), without
Google, so the browser test can start at the wizard.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

import asyncpg

from app.core.security import fnCreateAccesToken

EMAIL = "zz-e2e-browser@example.com"


async def main(strAction):
    c = await asyncpg.connect(host=os.getenv("DB_HOST"), port=int(os.getenv("DB_PORT", "5432")),
                              user=os.getenv("DB_USER"), password=os.getenv("DB_PASSWORD"),
                              database=os.getenv("DB_NAME"))
    try:
        await c.execute("DELETE FROM tbl_user WHERE vchr_email = $1", EMAIL)
        if strAction == "delete":
            for p in (ROOT / "uploads" / "logos").glob("logo_*"):
                pass  # logos are only written when a test uploads one; none in the default flow
            return
        plan = await c.fetchrow("SELECT pk_bint_plan_id, int_trial_days FROM tbl_subscription_plan WHERE vchr_plan_name = 'free_trial'")
        uid = await c.fetchval(
            """INSERT INTO tbl_user (vchr_email, vchr_password_hash, vchr_username, vchr_google_sub, bln_email_verified,
                   fk_bint_plan_id, vchr_plan_status, dat_plan_start_date, dat_plan_end_date,
                   bln_needs_onboarding, vchr_signup_source, vchr_signup_trade)
               VALUES ($1, NULL, 'Browser Tester', 'e2e-browser-sub', TRUE, $2, 'trial', CURRENT_DATE,
                       CURRENT_DATE + ($3::integer), TRUE, 'hero', NULL)
               RETURNING pk_bint_user_id""",
            EMAIL, plan["pk_bint_plan_id"], plan["int_trial_days"] or 7)
        info = {"intUserId": uid, "strEmail": EMAIL, "strUserName": "Browser Tester", "strBusinessName": None,
                "blnIsNewUser": True, "blnNeedsOnboarding": True,
                "dctSubscription": {"strStatus": "trial", "strPlanName": "Free", "intDaysRemaining": 7}}
        print(json.dumps({"token": fnCreateAccesToken(data={"user_id": uid, "email": EMAIL}), "userInfo": info}))
    finally:
        await c.close()


asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "create"))
