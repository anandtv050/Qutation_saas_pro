from datetime import datetime, timedelta
from asyncpg import Pool

from app.api.dashboard.schema import (
    MdlDashboardSummary, MdlDashboardResponse,
    MdlMetric, MdlRevenueMetric, MdlPlatformSummary,
    MdlDailyActivity, MdlUserRow, MdlAdminDashboardData, MdlAdminDashboardResponse,
    MdlUserDetail, MdlAdminUserDetailResponse,
)
from app.core.baseSchema import ResponseStatus
from app.core.logger import getUserLogger, getLogger

# ── Helpers ──

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def fnGetPeriodBounds(strPeriod: str):
    """Return (datCurrentStart, datPrevStart) datetimes. None means no filter."""
    if strPeriod not in PERIOD_DAYS:
        return None, None
    intDays = PERIOD_DAYS[strPeriod]
    datNow = datetime.utcnow()
    return datNow - timedelta(days=intDays), datNow - timedelta(days=intDays * 2)


def fnCalcPctChange(intCurrent, intPrevious):
    if intPrevious == 0:
        return 100.0 if intCurrent > 0 else 0.0
    return round((intCurrent - intPrevious) / intPrevious * 100, 1)


def fnGetHealthStatus(strLastActive: str | None, timHeartbeat=None) -> str:
    """Health based on latest of document creation OR heartbeat."""
    datLatest = None
    if strLastActive:
        try:
            datLatest = datetime.fromisoformat(str(strLastActive))
        except (ValueError, TypeError):
            pass
    if timHeartbeat:
        try:
            datHb = datetime.fromisoformat(str(timHeartbeat)) if isinstance(timHeartbeat, str) else timHeartbeat
            if datLatest is None or datHb > datLatest:
                datLatest = datHb
        except (ValueError, TypeError):
            pass
    if not datLatest:
        return "inactive"
    intDaysAgo = (datetime.utcnow() - datLatest).days
    if intDaysAgo <= 3:
        return "active"
    if intDaysAgo <= 7:
        return "at_risk"
    return "inactive"


def fnCheckIsOnline(timHeartbeat) -> bool:
    if not timHeartbeat:
        return False
    try:
        datHb = datetime.fromisoformat(str(timHeartbeat)) if isinstance(timHeartbeat, str) else timHeartbeat
        return (datetime.utcnow() - datHb).total_seconds() < 120
    except (ValueError, TypeError):
        return False


class ClsDashboardService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId

    # ────────────────────────────────────────────
    # User dashboard
    # ────────────────────────────────────────────
    async def fnGetDashboardSummary(self) -> MdlDashboardResponse:
        objLogger = getUserLogger(self.intUserId)
        objLogger.debug("Fetching dashboard summary")
        async with self.insPool.acquire() as conn:
            rstInvoice = await conn.fetchrow("""
                SELECT COALESCE(SUM(dbl_total_amount),0) as total,
                       COUNT(*) as cnt,
                       COUNT(CASE WHEN vchr_payment_status='paid' THEN 1 END) as paid,
                       COUNT(CASE WHEN vchr_payment_status!='paid' THEN 1 END) as pending
                FROM tbl_invoice WHERE fk_bint_user_id=$1
            """, self.intUserId)

            rstToday = await conn.fetchrow("""
                SELECT COALESCE(SUM(dbl_total_amount),0) as earnings, COUNT(*) as cnt
                FROM tbl_invoice WHERE fk_bint_user_id=$1
                AND DATE(dat_invoice_date)=CURRENT_DATE
            """, self.intUserId)

            intQuotationCount = await conn.fetchval(
                "SELECT COUNT(*) FROM tbl_quotation WHERE fk_bint_user_id=$1",
                self.intUserId
            )

            return MdlDashboardResponse(
                intStatus=ResponseStatus.SUCCESS,
                strStatus=ResponseStatus.SUCCESS_STR,
                intStatusCode=ResponseStatus.HTTP_OK,
                strMessage="OK",
                data=MdlDashboardSummary(
                    dblTotalCollected=float(rstInvoice['total']),
                    dblTodayEarnings=float(rstToday['earnings']),
                    intTotalInvoices=int(rstInvoice['cnt']),
                    intPaidInvoices=int(rstInvoice['paid']),
                    intPendingInvoices=int(rstInvoice['pending']),
                    intTotalQuotations=int(intQuotationCount),
                    intTodayInvoices=int(rstToday['cnt']),
                )
            )

    # ────────────────────────────────────────────
    # Admin summary (with period filtering)
    # ────────────────────────────────────────────
    async def fnGetAdminDashboard(self, strPeriod: str = "30d") -> MdlAdminDashboardResponse:
        objLogger = getLogger()
        objLogger.debug(f"Admin dashboard · period={strPeriod}")

        datCurrent, datPrev = fnGetPeriodBounds(strPeriod)
        blnAll = datCurrent is None

        async with self.insPool.acquire() as conn:
            # ── 1. Platform metrics ──
            if blnAll:
                rstMetrics = await conn.fetchrow("""
                    SELECT
                        (SELECT COUNT(*) FROM tbl_ai_response)       as ai_cur,
                        0                                             as ai_prev,
                        (SELECT COUNT(*) FROM tbl_quotation)          as q_cur,
                        0                                             as q_prev,
                        (SELECT COUNT(*) FROM tbl_invoice)            as i_cur,
                        0                                             as i_prev,
                        (SELECT COALESCE(SUM(dbl_total_amount),0) FROM tbl_invoice
                         WHERE vchr_payment_status='paid')            as rev_cur,
                        0                                             as rev_prev,
                        (SELECT COUNT(*) FROM tbl_quotation
                         WHERE fk_bint_ai_response_id IS NOT NULL)    as ai_quotes,
                        (SELECT COALESCE(AVG(dbl_total_amount),0)
                         FROM tbl_quotation)                          as avg_q_val,
                        (SELECT COALESCE(SUM(int_tokens_input+int_tokens_output),0)
                         FROM tbl_ai_response)                        as total_tokens
                """)
            else:
                rstMetrics = await conn.fetchrow("""
                    SELECT
                        (SELECT COUNT(*) FROM tbl_ai_response
                         WHERE tim_created_at >= $1)                   as ai_cur,
                        (SELECT COUNT(*) FROM tbl_ai_response
                         WHERE tim_created_at >= $2 AND tim_created_at < $1) as ai_prev,
                        (SELECT COUNT(*) FROM tbl_quotation
                         WHERE tim_created_at >= $1)                   as q_cur,
                        (SELECT COUNT(*) FROM tbl_quotation
                         WHERE tim_created_at >= $2 AND tim_created_at < $1) as q_prev,
                        (SELECT COUNT(*) FROM tbl_invoice
                         WHERE tim_created_at >= $1)                   as i_cur,
                        (SELECT COUNT(*) FROM tbl_invoice
                         WHERE tim_created_at >= $2 AND tim_created_at < $1) as i_prev,
                        (SELECT COALESCE(SUM(dbl_total_amount),0) FROM tbl_invoice
                         WHERE vchr_payment_status='paid' AND tim_created_at >= $1) as rev_cur,
                        (SELECT COALESCE(SUM(dbl_total_amount),0) FROM tbl_invoice
                         WHERE vchr_payment_status='paid'
                           AND tim_created_at >= $2 AND tim_created_at < $1) as rev_prev,
                        (SELECT COUNT(*) FROM tbl_quotation
                         WHERE fk_bint_ai_response_id IS NOT NULL
                           AND tim_created_at >= $1)                   as ai_quotes,
                        (SELECT COALESCE(AVG(dbl_total_amount),0)
                         FROM tbl_quotation WHERE tim_created_at >= $1) as avg_q_val,
                        (SELECT COALESCE(SUM(int_tokens_input+int_tokens_output),0)
                         FROM tbl_ai_response WHERE tim_created_at >= $1) as total_tokens
                """, datCurrent, datPrev)

            intAiCur = int(rstMetrics['ai_cur'])
            intAiPrev = int(rstMetrics['ai_prev'])
            intQCur = int(rstMetrics['q_cur'])
            intQPrev = int(rstMetrics['q_prev'])
            intICur = int(rstMetrics['i_cur'])
            intIPrev = int(rstMetrics['i_prev'])
            dblRevCur = float(rstMetrics['rev_cur'])
            dblRevPrev = float(rstMetrics['rev_prev'])
            intAiQuotes = int(rstMetrics['ai_quotes'])
            dblAiRatio = round(intAiQuotes / intQCur * 100, 1) if intQCur > 0 else 0.0

            # Active users + total users
            if blnAll:
                intActiveCount = await conn.fetchval("""
                    SELECT COUNT(DISTINCT fk_bint_user_id) FROM (
                        SELECT fk_bint_user_id FROM tbl_ai_response
                        UNION SELECT fk_bint_user_id FROM tbl_quotation
                        UNION SELECT fk_bint_user_id FROM tbl_invoice
                    ) x
                """)
            else:
                intActiveCount = await conn.fetchval("""
                    SELECT COUNT(DISTINCT fk_bint_user_id) FROM (
                        SELECT fk_bint_user_id FROM tbl_ai_response   WHERE tim_created_at >= $1
                        UNION
                        SELECT fk_bint_user_id FROM tbl_quotation     WHERE tim_created_at >= $1
                        UNION
                        SELECT fk_bint_user_id FROM tbl_invoice       WHERE tim_created_at >= $1
                    ) x
                """, datCurrent)

            intTotalUsers = await conn.fetchval("SELECT COUNT(*) FROM tbl_user")

            # ── Status breakdowns for charts ──
            if blnAll:
                rstQStatus = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_status='draft' THEN 1 END) as draft,
                        COUNT(CASE WHEN vchr_status='sent' THEN 1 END) as sent,
                        COUNT(CASE WHEN vchr_status='accepted' THEN 1 END) as accepted,
                        COUNT(CASE WHEN vchr_status='rejected' THEN 1 END) as rejected
                    FROM tbl_quotation
                """)
                rstIStatus = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_payment_status='paid' THEN 1 END) as paid,
                        COUNT(CASE WHEN vchr_payment_status!='paid' THEN 1 END) as pending
                    FROM tbl_invoice
                """)
            else:
                rstQStatus = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_status='draft' THEN 1 END) as draft,
                        COUNT(CASE WHEN vchr_status='sent' THEN 1 END) as sent,
                        COUNT(CASE WHEN vchr_status='accepted' THEN 1 END) as accepted,
                        COUNT(CASE WHEN vchr_status='rejected' THEN 1 END) as rejected
                    FROM tbl_quotation WHERE tim_created_at >= $1
                """, datCurrent)
                rstIStatus = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_payment_status='paid' THEN 1 END) as paid,
                        COUNT(CASE WHEN vchr_payment_status!='paid' THEN 1 END) as pending
                    FROM tbl_invoice WHERE tim_created_at >= $1
                """, datCurrent)

            intManualQuotes = intQCur - intAiQuotes

            objSummary = MdlPlatformSummary(
                objAiCalls=MdlMetric(intCurrent=intAiCur, intPrevious=intAiPrev,
                                     dblChange=fnCalcPctChange(intAiCur, intAiPrev) if not blnAll else 0),
                objQuotations=MdlMetric(intCurrent=intQCur, intPrevious=intQPrev,
                                        dblChange=fnCalcPctChange(intQCur, intQPrev) if not blnAll else 0),
                objInvoices=MdlMetric(intCurrent=intICur, intPrevious=intIPrev,
                                      dblChange=fnCalcPctChange(intICur, intIPrev) if not blnAll else 0),
                objRevenue=MdlRevenueMetric(dblCurrent=dblRevCur, dblPrevious=dblRevPrev,
                                            dblChange=fnCalcPctChange(dblRevCur, dblRevPrev) if not blnAll else 0),
                dblAiQuoteRatio=dblAiRatio,
                intActiveUsers=int(intActiveCount),
                intTotalUsers=int(intTotalUsers),
                dblAvgQuotationValue=float(rstMetrics['avg_q_val']),
                intTotalTokens=int(rstMetrics['total_tokens']),
                intAiQuotes=intAiQuotes,
                intManualQuotes=intManualQuotes,
                intQuotationsDraft=int(rstQStatus['draft']),
                intQuotationsSent=int(rstQStatus['sent']),
                intQuotationsAccepted=int(rstQStatus['accepted']),
                intQuotationsRejected=int(rstQStatus['rejected']),
                intInvoicesPaid=int(rstIStatus['paid']),
                intInvoicesPending=int(rstIStatus['pending']),
            )

            # ── 2. Daily breakdown ──
            if blnAll:
                lstDailyRows = await conn.fetch("""
                    SELECT dt, SUM(ai) as ai, SUM(q) as q, SUM(i) as i,
                           SUM(rev) as rev, SUM(tok) as tok
                    FROM (
                        SELECT tim_created_at::date as dt, COUNT(*) as ai, 0 as q, 0 as i, 0 as rev,
                               COALESCE(SUM(int_tokens_input+int_tokens_output),0) as tok
                        FROM tbl_ai_response GROUP BY dt
                        UNION ALL
                        SELECT tim_created_at::date, 0, COUNT(*), 0, 0, 0
                        FROM tbl_quotation GROUP BY 1
                        UNION ALL
                        SELECT tim_created_at::date, 0, 0, COUNT(*),
                               COALESCE(SUM(CASE WHEN vchr_payment_status='paid' THEN dbl_total_amount ELSE 0 END),0), 0
                        FROM tbl_invoice GROUP BY 1
                    ) combined GROUP BY dt ORDER BY dt DESC LIMIT 90
                """)
            else:
                lstDailyRows = await conn.fetch("""
                    SELECT dt, SUM(ai) as ai, SUM(q) as q, SUM(i) as i,
                           SUM(rev) as rev, SUM(tok) as tok
                    FROM (
                        SELECT tim_created_at::date as dt, COUNT(*) as ai, 0 as q, 0 as i, 0 as rev,
                               COALESCE(SUM(int_tokens_input+int_tokens_output),0) as tok
                        FROM tbl_ai_response WHERE tim_created_at >= $1 GROUP BY dt
                        UNION ALL
                        SELECT tim_created_at::date, 0, COUNT(*), 0, 0, 0
                        FROM tbl_quotation WHERE tim_created_at >= $1 GROUP BY 1
                        UNION ALL
                        SELECT tim_created_at::date, 0, 0, COUNT(*),
                               COALESCE(SUM(CASE WHEN vchr_payment_status='paid' THEN dbl_total_amount ELSE 0 END),0), 0
                        FROM tbl_invoice WHERE tim_created_at >= $1 GROUP BY 1
                    ) combined GROUP BY dt ORDER BY dt DESC
                """, datCurrent)

            lstDaily = [
                MdlDailyActivity(
                    datDay=str(r['dt']),
                    intAiCalls=int(r['ai']),
                    intQuotations=int(r['q']),
                    intInvoices=int(r['i']),
                    dblRevenue=float(r['rev']),
                    intTokens=int(r['tok']),
                ) for r in lstDailyRows
            ]

            # ── 3. Per-user rows ──
            if blnAll:
                lstUserRows = await conn.fetch("""
                    SELECT u.pk_bint_user_id as uid, u.vchr_email,
                           COALESCE(u.vchr_business_name, u.vchr_username, '') as name,
                           u.tim_last_heartbeat,
                           COALESCE(a.cnt,0) as ai_cnt,
                           COALESCE(q.cnt,0) as q_cnt,
                           COALESCE(i.cnt,0) as i_cnt,
                           COALESCE(i.rev,0) as rev,
                           COALESCE(u.tim_last_heartbeat, u.tim_created_at) as last_seen
                    FROM tbl_user u
                    LEFT JOIN (SELECT fk_bint_user_id, COUNT(*) cnt, MAX(tim_created_at) last_t
                               FROM tbl_ai_response GROUP BY 1) a ON a.fk_bint_user_id=u.pk_bint_user_id
                    LEFT JOIN (SELECT fk_bint_user_id, COUNT(*) cnt, MAX(tim_created_at) last_t
                               FROM tbl_quotation GROUP BY 1) q ON q.fk_bint_user_id=u.pk_bint_user_id
                    LEFT JOIN (SELECT fk_bint_user_id, COUNT(*) cnt,
                               SUM(CASE WHEN vchr_payment_status='paid' THEN dbl_total_amount ELSE 0 END) rev,
                               MAX(tim_created_at) last_t
                               FROM tbl_invoice GROUP BY 1) i ON i.fk_bint_user_id=u.pk_bint_user_id
                    ORDER BY last_seen DESC
                """)
            else:
                lstUserRows = await conn.fetch("""
                    SELECT u.pk_bint_user_id as uid, u.vchr_email,
                           COALESCE(u.vchr_business_name, u.vchr_username, '') as name,
                           u.tim_last_heartbeat,
                           COALESCE(a.cnt,0) as ai_cnt,
                           COALESCE(q.cnt,0) as q_cnt,
                           COALESCE(i.cnt,0) as i_cnt,
                           COALESCE(i.rev,0) as rev,
                           COALESCE(u.tim_last_heartbeat, u.tim_created_at) as last_seen
                    FROM tbl_user u
                    LEFT JOIN (SELECT fk_bint_user_id, COUNT(*) cnt, MAX(tim_created_at) last_t
                               FROM tbl_ai_response WHERE tim_created_at >= $1
                               GROUP BY 1) a ON a.fk_bint_user_id=u.pk_bint_user_id
                    LEFT JOIN (SELECT fk_bint_user_id, COUNT(*) cnt, MAX(tim_created_at) last_t
                               FROM tbl_quotation WHERE tim_created_at >= $1
                               GROUP BY 1) q ON q.fk_bint_user_id=u.pk_bint_user_id
                    LEFT JOIN (SELECT fk_bint_user_id, COUNT(*) cnt,
                               SUM(CASE WHEN vchr_payment_status='paid' THEN dbl_total_amount ELSE 0 END) rev,
                               MAX(tim_created_at) last_t
                               FROM tbl_invoice WHERE tim_created_at >= $1
                               GROUP BY 1) i ON i.fk_bint_user_id=u.pk_bint_user_id
                    ORDER BY last_seen DESC
                """, datCurrent)

            lstUsers = []
            for r in lstUserRows:
                timHb = r['tim_last_heartbeat']
                strLastSeen = str(timHb) if timHb else None
                lstUsers.append(MdlUserRow(
                    intUserId=int(r['uid']),
                    strName=r['name'] or r['vchr_email'],
                    strEmail=r['vchr_email'],
                    intAiCalls=int(r['ai_cnt']),
                    intQuotations=int(r['q_cnt']),
                    intInvoices=int(r['i_cnt']),
                    dblRevenue=float(r['rev']),
                    strLastSeen=strLastSeen,
                    strHealth=fnGetHealthStatus(strLastSeen, timHb),
                    blnOnline=fnCheckIsOnline(timHb),
                ))

            return MdlAdminDashboardResponse(
                intStatus=ResponseStatus.SUCCESS,
                strStatus=ResponseStatus.SUCCESS_STR,
                intStatusCode=ResponseStatus.HTTP_OK,
                strMessage="OK",
                data=MdlAdminDashboardData(
                    strPeriod=strPeriod,
                    objSummary=objSummary,
                    lstDaily=lstDaily,
                    lstUsers=lstUsers,
                )
            )

    # ────────────────────────────────────────────
    # Admin user detail (with period filtering)
    # ────────────────────────────────────────────
    async def fnGetAdminUserDetail(self, intTargetUserId: int, strPeriod: str = "30d") -> MdlAdminUserDetailResponse:
        objLogger = getLogger()
        objLogger.debug(f"Admin user detail · uid={intTargetUserId} period={strPeriod}")

        datCurrent, datPrev = fnGetPeriodBounds(strPeriod)
        blnAll = datCurrent is None

        async with self.insPool.acquire() as conn:
            # ── Profile ──
            rstUser = await conn.fetchrow("""
                SELECT pk_bint_user_id, vchr_email, vchr_username, vchr_business_name,
                       vchr_phone, tim_created_at, tim_last_heartbeat
                FROM tbl_user WHERE pk_bint_user_id=$1
            """, intTargetUserId)

            if not rstUser:
                return MdlAdminUserDetailResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                    strMessage="User not found", data=None
                )

            intDaysOnPlatform = max((datetime.utcnow() - rstUser['tim_created_at']).days, 1) if rstUser['tim_created_at'] else 1

            # ── Period metrics ──
            if blnAll:
                rstMetrics = await conn.fetchrow("""
                    SELECT
                        (SELECT COUNT(*) FROM tbl_ai_response WHERE fk_bint_user_id=$1) as ai_cur,
                        0 as ai_prev,
                        (SELECT COUNT(*) FROM tbl_quotation WHERE fk_bint_user_id=$1) as q_cur,
                        0 as q_prev,
                        (SELECT COUNT(*) FROM tbl_invoice WHERE fk_bint_user_id=$1) as i_cur,
                        0 as i_prev,
                        (SELECT COALESCE(SUM(dbl_total_amount),0) FROM tbl_invoice
                         WHERE fk_bint_user_id=$1 AND vchr_payment_status='paid') as rev_cur,
                        0 as rev_prev
                """, intTargetUserId)
            else:
                rstMetrics = await conn.fetchrow("""
                    SELECT
                        (SELECT COUNT(*) FROM tbl_ai_response
                         WHERE fk_bint_user_id=$1 AND tim_created_at >= $2) as ai_cur,
                        (SELECT COUNT(*) FROM tbl_ai_response
                         WHERE fk_bint_user_id=$1 AND tim_created_at >= $3 AND tim_created_at < $2) as ai_prev,
                        (SELECT COUNT(*) FROM tbl_quotation
                         WHERE fk_bint_user_id=$1 AND tim_created_at >= $2) as q_cur,
                        (SELECT COUNT(*) FROM tbl_quotation
                         WHERE fk_bint_user_id=$1 AND tim_created_at >= $3 AND tim_created_at < $2) as q_prev,
                        (SELECT COUNT(*) FROM tbl_invoice
                         WHERE fk_bint_user_id=$1 AND tim_created_at >= $2) as i_cur,
                        (SELECT COUNT(*) FROM tbl_invoice
                         WHERE fk_bint_user_id=$1 AND tim_created_at >= $3 AND tim_created_at < $2) as i_prev,
                        (SELECT COALESCE(SUM(dbl_total_amount),0) FROM tbl_invoice
                         WHERE fk_bint_user_id=$1 AND vchr_payment_status='paid'
                           AND tim_created_at >= $2) as rev_cur,
                        (SELECT COALESCE(SUM(dbl_total_amount),0) FROM tbl_invoice
                         WHERE fk_bint_user_id=$1 AND vchr_payment_status='paid'
                           AND tim_created_at >= $3 AND tim_created_at < $2) as rev_prev
                """, intTargetUserId, datCurrent, datPrev)

            intAiCur = int(rstMetrics['ai_cur'])
            intQCur = int(rstMetrics['q_cur'])
            intICur = int(rstMetrics['i_cur'])

            # ── AI performance ──
            if blnAll:
                rstAiPerf = await conn.fetchrow("""
                    SELECT COALESCE(SUM(int_tokens_input+int_tokens_output),0) as tokens,
                           COALESCE(SUM(dbl_cost_inr),0) as cost
                    FROM tbl_ai_response WHERE fk_bint_user_id=$1
                """, intTargetUserId)
                intAiQuoteCnt = await conn.fetchval("""
                    SELECT COUNT(*) FROM tbl_quotation
                    WHERE fk_bint_user_id=$1 AND fk_bint_ai_response_id IS NOT NULL
                """, intTargetUserId)
            else:
                rstAiPerf = await conn.fetchrow("""
                    SELECT COALESCE(SUM(int_tokens_input+int_tokens_output),0) as tokens,
                           COALESCE(SUM(dbl_cost_inr),0) as cost
                    FROM tbl_ai_response WHERE fk_bint_user_id=$1 AND tim_created_at >= $2
                """, intTargetUserId, datCurrent)
                intAiQuoteCnt = await conn.fetchval("""
                    SELECT COUNT(*) FROM tbl_quotation
                    WHERE fk_bint_user_id=$1 AND fk_bint_ai_response_id IS NOT NULL
                      AND tim_created_at >= $2
                """, intTargetUserId, datCurrent)

            dblAiRatio = round(intAiQuoteCnt / intQCur * 100, 1) if intQCur > 0 else 0.0

            # ── Value metrics ──
            if blnAll:
                rstValue = await conn.fetchrow("""
                    SELECT COALESCE(AVG(dbl_total_amount),0) as avg_val,
                           COUNT(DISTINCT vchr_customer_name) as uniq_cust,
                           (SELECT COUNT(*) FROM (
                               SELECT vchr_customer_name FROM tbl_quotation
                               WHERE fk_bint_user_id=$1
                               GROUP BY vchr_customer_name HAVING COUNT(*)>1
                           ) x) as repeat_cust
                    FROM tbl_quotation WHERE fk_bint_user_id=$1
                """, intTargetUserId)
            else:
                rstValue = await conn.fetchrow("""
                    SELECT COALESCE(AVG(dbl_total_amount),0) as avg_val,
                           COUNT(DISTINCT vchr_customer_name) as uniq_cust,
                           (SELECT COUNT(*) FROM (
                               SELECT vchr_customer_name FROM tbl_quotation
                               WHERE fk_bint_user_id=$1 AND tim_created_at >= $2
                               GROUP BY vchr_customer_name HAVING COUNT(*)>1
                           ) x) as repeat_cust
                    FROM tbl_quotation WHERE fk_bint_user_id=$1 AND tim_created_at >= $2
                """, intTargetUserId, datCurrent)

            intInvItems = await conn.fetchval(
                "SELECT COUNT(*) FROM tbl_inventory WHERE fk_bint_user_id=$1", intTargetUserId
            )

            # ── Inventory categories ──
            intInvCategories = await conn.fetchval(
                "SELECT COUNT(DISTINCT vchr_category) FROM tbl_inventory WHERE fk_bint_user_id=$1 AND vchr_category IS NOT NULL",
                intTargetUserId
            )

            # ── Last login ──
            datLastLogin = await conn.fetchval(
                "SELECT tim_last_login FROM tbl_user WHERE pk_bint_user_id=$1", intTargetUserId
            )

            # ── Avg invoice value ──
            if blnAll:
                dblAvgInvVal = await conn.fetchval(
                    "SELECT COALESCE(AVG(dbl_total_amount),0) FROM tbl_invoice WHERE fk_bint_user_id=$1",
                    intTargetUserId
                )
            else:
                dblAvgInvVal = await conn.fetchval(
                    "SELECT COALESCE(AVG(dbl_total_amount),0) FROM tbl_invoice WHERE fk_bint_user_id=$1 AND tim_created_at >= $2",
                    intTargetUserId, datCurrent
                )

            # ── Signup → first AI call (days) ──
            datFirstAi = await conn.fetchval(
                "SELECT MIN(tim_created_at) FROM tbl_ai_response WHERE fk_bint_user_id=$1",
                intTargetUserId
            )
            dblSignupToAiDays = -1.0
            if datFirstAi and rstUser['tim_created_at']:
                dblSignupToAiDays = round((datFirstAi - rstUser['tim_created_at']).total_seconds() / 86400, 1)

            # ── Avg time AI call → save quotation (hours) ──
            if blnAll:
                dblAiToQuoteAvg = await conn.fetchval("""
                    SELECT AVG(EXTRACT(EPOCH FROM (q.tim_created_at - a.tim_created_at)) / 3600)
                    FROM tbl_quotation q
                    JOIN tbl_ai_response a ON a.pk_bint_ai_response_id = q.fk_bint_ai_response_id
                    WHERE q.fk_bint_user_id=$1 AND q.fk_bint_ai_response_id IS NOT NULL
                """, intTargetUserId)
            else:
                dblAiToQuoteAvg = await conn.fetchval("""
                    SELECT AVG(EXTRACT(EPOCH FROM (q.tim_created_at - a.tim_created_at)) / 3600)
                    FROM tbl_quotation q
                    JOIN tbl_ai_response a ON a.pk_bint_ai_response_id = q.fk_bint_ai_response_id
                    WHERE q.fk_bint_user_id=$1 AND q.fk_bint_ai_response_id IS NOT NULL
                      AND q.tim_created_at >= $2
                """, intTargetUserId, datCurrent)
            dblAvgAiToQuoteHrs = round(float(dblAiToQuoteAvg), 1) if dblAiToQuoteAvg else -1.0

            # ── Avg items per quotation ──
            if blnAll:
                dblAvgItems = await conn.fetchval("""
                    SELECT COALESCE(AVG(item_count), 0) FROM (
                        SELECT COUNT(*) as item_count FROM tbl_quotation_item qi
                        JOIN tbl_quotation q ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
                        WHERE q.fk_bint_user_id=$1
                        GROUP BY qi.fk_bint_quotation_id
                    ) x
                """, intTargetUserId)
            else:
                dblAvgItems = await conn.fetchval("""
                    SELECT COALESCE(AVG(item_count), 0) FROM (
                        SELECT COUNT(*) as item_count FROM tbl_quotation_item qi
                        JOIN tbl_quotation q ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
                        WHERE q.fk_bint_user_id=$1 AND q.tim_created_at >= $2
                        GROUP BY qi.fk_bint_quotation_id
                    ) x
                """, intTargetUserId, datCurrent)

            # ── Tax & discount usage ──
            if blnAll:
                rstTaxDisc = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN dbl_tax_percent > 0 THEN 1 END) as with_tax,
                        COUNT(CASE WHEN dbl_discount_amount > 0 THEN 1 END) as with_disc
                    FROM tbl_quotation WHERE fk_bint_user_id=$1
                """, intTargetUserId)
            else:
                rstTaxDisc = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN dbl_tax_percent > 0 THEN 1 END) as with_tax,
                        COUNT(CASE WHEN dbl_discount_amount > 0 THEN 1 END) as with_disc
                    FROM tbl_quotation WHERE fk_bint_user_id=$1 AND tim_created_at >= $2
                """, intTargetUserId, datCurrent)

            # ── Engagement ──
            if blnAll:
                rstEng = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_status='draft' THEN 1 END) as q_draft,
                        COUNT(CASE WHEN vchr_status='sent' THEN 1 END) as q_sent,
                        COUNT(CASE WHEN vchr_status='accepted' THEN 1 END) as q_acc,
                        COUNT(CASE WHEN vchr_status='rejected' THEN 1 END) as q_rej
                    FROM tbl_quotation WHERE fk_bint_user_id=$1
                """, intTargetUserId)
                rstEngInv = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_payment_status='paid' THEN 1 END) as paid,
                        COUNT(CASE WHEN vchr_payment_status!='paid' THEN 1 END) as pending
                    FROM tbl_invoice WHERE fk_bint_user_id=$1
                """, intTargetUserId)
            else:
                rstEng = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_status='draft' THEN 1 END) as q_draft,
                        COUNT(CASE WHEN vchr_status='sent' THEN 1 END) as q_sent,
                        COUNT(CASE WHEN vchr_status='accepted' THEN 1 END) as q_acc,
                        COUNT(CASE WHEN vchr_status='rejected' THEN 1 END) as q_rej
                    FROM tbl_quotation WHERE fk_bint_user_id=$1 AND tim_created_at >= $2
                """, intTargetUserId, datCurrent)
                rstEngInv = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN vchr_payment_status='paid' THEN 1 END) as paid,
                        COUNT(CASE WHEN vchr_payment_status!='paid' THEN 1 END) as pending
                    FROM tbl_invoice WHERE fk_bint_user_id=$1 AND tim_created_at >= $2
                """, intTargetUserId, datCurrent)

            # ── Active days + daily breakdown ──
            if blnAll:
                lstDailyRows = await conn.fetch("""
                    SELECT dt, SUM(ai) ai, SUM(q) q, SUM(i) i, SUM(rev) rev, SUM(tok) tok
                    FROM (
                        SELECT tim_created_at::date dt, COUNT(*) ai, 0 q, 0 i, 0 rev,
                               COALESCE(SUM(int_tokens_input+int_tokens_output),0) tok
                        FROM tbl_ai_response WHERE fk_bint_user_id=$1 GROUP BY dt
                        UNION ALL
                        SELECT tim_created_at::date, 0, COUNT(*), 0, 0, 0
                        FROM tbl_quotation WHERE fk_bint_user_id=$1 GROUP BY 1
                        UNION ALL
                        SELECT tim_created_at::date, 0, 0, COUNT(*),
                               COALESCE(SUM(CASE WHEN vchr_payment_status='paid' THEN dbl_total_amount ELSE 0 END),0), 0
                        FROM tbl_invoice WHERE fk_bint_user_id=$1 GROUP BY 1
                    ) c GROUP BY dt ORDER BY dt DESC LIMIT 90
                """, intTargetUserId)
            else:
                lstDailyRows = await conn.fetch("""
                    SELECT dt, SUM(ai) ai, SUM(q) q, SUM(i) i, SUM(rev) rev, SUM(tok) tok
                    FROM (
                        SELECT tim_created_at::date dt, COUNT(*) ai, 0 q, 0 i, 0 rev,
                               COALESCE(SUM(int_tokens_input+int_tokens_output),0) tok
                        FROM tbl_ai_response WHERE fk_bint_user_id=$1 AND tim_created_at >= $2 GROUP BY dt
                        UNION ALL
                        SELECT tim_created_at::date, 0, COUNT(*), 0, 0, 0
                        FROM tbl_quotation WHERE fk_bint_user_id=$1 AND tim_created_at >= $2 GROUP BY 1
                        UNION ALL
                        SELECT tim_created_at::date, 0, 0, COUNT(*),
                               COALESCE(SUM(CASE WHEN vchr_payment_status='paid' THEN dbl_total_amount ELSE 0 END),0), 0
                        FROM tbl_invoice WHERE fk_bint_user_id=$1 AND tim_created_at >= $2 GROUP BY 1
                    ) c GROUP BY dt ORDER BY dt DESC
                """, intTargetUserId, datCurrent)

            lstDaily = [
                MdlDailyActivity(
                    datDay=str(r['dt']), intAiCalls=int(r['ai']),
                    intQuotations=int(r['q']), intInvoices=int(r['i']),
                    dblRevenue=float(r['rev']), intTokens=int(r['tok']),
                ) for r in lstDailyRows
            ]

            # Last seen = heartbeat (tracks every API call)
            timHb = rstUser['tim_last_heartbeat']
            datLastActive = timHb if timHb else None

            objDetail = MdlUserDetail(
                intUserId=rstUser['pk_bint_user_id'],
                strName=rstUser['vchr_business_name'] or rstUser['vchr_username'] or '',
                strEmail=rstUser['vchr_email'],
                strBusinessName=rstUser['vchr_business_name'] or '',
                strPhone=rstUser['vchr_phone'] or '',
                datJoined=str(rstUser['tim_created_at']) if rstUser['tim_created_at'] else None,
                blnOnline=fnCheckIsOnline(rstUser['tim_last_heartbeat']),
                strLastSeen=str(datLastActive) if datLastActive else None,
                # Funnel
                intAiCalls=intAiCur,
                intAiCallsPrev=int(rstMetrics['ai_prev']),
                intQuotations=intQCur,
                intQuotationsPrev=int(rstMetrics['q_prev']),
                intInvoices=intICur,
                intInvoicesPrev=int(rstMetrics['i_prev']),
                dblRevenue=float(rstMetrics['rev_cur']),
                dblRevenuePrev=float(rstMetrics['rev_prev']),
                # Conversion
                dblAiToQuoteRate=round(intQCur / intAiCur * 100, 1) if intAiCur > 0 else 0.0,
                dblQuoteToInvoiceRate=round(intICur / intQCur * 100, 1) if intQCur > 0 else 0.0,
                # AI
                intTotalTokens=int(rstAiPerf['tokens']),
                dblAiCostInr=float(rstAiPerf['cost']),
                dblAiQuoteRatio=dblAiRatio,
                # Value
                dblAvgQuotationValue=float(rstValue['avg_val']),
                dblAvgInvoiceValue=float(dblAvgInvVal),
                intUniqueCustomers=int(rstValue['uniq_cust']),
                intRepeatCustomers=int(rstValue['repeat_cust']),
                intInventoryItems=int(intInvItems),
                intInventoryCategories=int(intInvCategories),
                dblAvgItemsPerQuotation=round(float(dblAvgItems), 1),
                # Timing
                dblSignupToFirstAiDays=dblSignupToAiDays,
                dblAvgAiToQuoteHours=dblAvgAiToQuoteHrs,
                strLastLogin=str(datLastLogin) if datLastLogin else None,
                # Feature usage
                intQuotationsWithTax=int(rstTaxDisc['with_tax']),
                intQuotationsWithDiscount=int(rstTaxDisc['with_disc']),
                # Engagement
                intActiveDays=len(lstDailyRows),
                intDaysOnPlatform=intDaysOnPlatform,
                intQuotationsDraft=int(rstEng['q_draft']),
                intQuotationsSent=int(rstEng['q_sent']),
                intQuotationsAccepted=int(rstEng['q_acc']),
                intQuotationsRejected=int(rstEng['q_rej']),
                intInvoicesPaid=int(rstEngInv['paid']),
                intInvoicesPending=int(rstEngInv['pending']),
                lstDaily=lstDaily,
            )

            return MdlAdminUserDetailResponse(
                intStatus=ResponseStatus.SUCCESS,
                strStatus=ResponseStatus.SUCCESS_STR,
                intStatusCode=ResponseStatus.HTTP_OK,
                strMessage="OK",
                data=objDetail,
            )
