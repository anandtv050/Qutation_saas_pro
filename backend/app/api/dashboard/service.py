from asyncpg import Pool

from app.api.dashboard.schema import (
    MdlDashboardSummary,
    MdlDashboardResponse
)
from app.core.baseSchema import ResponseStatus


class ClsDashboardService:
    def __init__(self, pool: Pool, intUserId: int):
        self.pool = pool
        self.intUserId = intUserId

    async def fnGetDashboardSummary(self) -> MdlDashboardResponse:
        """Get dashboard summary with collected and pending amounts"""
        async with self.pool.acquire() as conn:
            # Get invoice summary - collected (paid) and pending amounts
            strQuery = """
                SELECT
                    COALESCE(SUM(CASE WHEN vchr_payment_status = 'paid' THEN dbl_total_amount ELSE 0 END), 0) as total_collected,
                    COALESCE(SUM(CASE WHEN vchr_payment_status != 'paid' THEN dbl_total_amount ELSE 0 END), 0) as total_pending,
                    COUNT(*) as total_invoices,
                    COUNT(CASE WHEN vchr_payment_status = 'paid' THEN 1 END) as paid_invoices,
                    COUNT(CASE WHEN vchr_payment_status != 'paid' THEN 1 END) as pending_invoices
                FROM tbl_invoice
                WHERE fk_bint_user_id = $1
            """

            invoiceRow = await conn.fetchrow(strQuery, self.intUserId)

            # Get quotation count
            strQuotationQuery = """
                SELECT COUNT(*) as total_quotations
                FROM tbl_quotation
                WHERE fk_bint_user_id = $1
            """

            quotationRow = await conn.fetchrow(strQuotationQuery, self.intUserId)

            summary = MdlDashboardSummary(
                dblTotalCollected=float(invoiceRow['total_collected']) if invoiceRow else 0.0,
                dblTotalPending=float(invoiceRow['total_pending']) if invoiceRow else 0.0,
                intTotalInvoices=int(invoiceRow['total_invoices']) if invoiceRow else 0,
                intPaidInvoices=int(invoiceRow['paid_invoices']) if invoiceRow else 0,
                intPendingInvoices=int(invoiceRow['pending_invoices']) if invoiceRow else 0,
                intTotalQuotations=int(quotationRow['total_quotations']) if quotationRow else 0
            )

            return MdlDashboardResponse(
                intStatus=ResponseStatus.SUCCESS,
                strStatus=ResponseStatus.SUCCESS_STR,
                intStatusCode=ResponseStatus.HTTP_SUCCESS,
                strMessage="Dashboard summary fetched successfully",
                data=summary
            )
