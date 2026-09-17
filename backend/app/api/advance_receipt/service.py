import datetime
from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.core.logger import getUserLogger
from app.api.advance_receipt.schema import (
    MdlCreateAdvanceReceiptRequest,
    MdlUpdateAdvanceReceiptRequest,
    MdlAdvanceReceiptResponse,
    MdlAdvanceReceiptListResponse,
    MdlAdvanceReceipt,
)


class ClsAdvanceReceiptService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId
        self.logger = getUserLogger(intUserId)

    async def fnGenerateReceiptNumber(self) -> str:
        """Generate unique receipt number: RCT-YYYY-NNNN (same counter table as
        quotation/invoice numbering, keyed by document type 'RECEIPT')."""
        intYear = datetime.datetime.now().year
        strQuery = """
            INSERT INTO tbl_document_counter (
                fk_bint_user_id, Vchr_document_type, int_year, int_last_number
            )
            VALUES ($1, 'RECEIPT', $2, 6)
            ON CONFLICT (fk_bint_user_id, Vchr_document_type, int_year)
            DO UPDATE SET int_last_number = tbl_document_counter.int_last_number + 1
            RETURNING int_last_number;
        """
        async with self.insPool.acquire() as conn:
            rstMax = await conn.fetchrow(strQuery, self.intUserId, intYear)
        intNextNum = rstMax["int_last_number"]
        return f"RCT-{intYear}-{intNextNum:04d}"

    def _fnRowToModel(self, row) -> MdlAdvanceReceipt:
        return MdlAdvanceReceipt(
            intPkReceiptId=row["pk_bint_advance_receipt_id"],
            intQuotationId=row["fk_bint_quotation_id"],
            strQuotationNumber=row.get("vchr_quotation_number"),
            strReceiptNumber=row["vchr_receipt_number"],
            datReceiptDate=row["dat_receipt_date"],
            strReceivedFrom=row["vchr_received_from"],
            dblAmountPaid=float(row["dbl_amount_paid"]),
            strPaymentFor=row["txt_payment_for"],
            strPaymentMode=row["vchr_payment_mode"],
            strReceivedBy=row["vchr_received_by"],
            dblAmountDueSnapshot=float(row["dbl_amount_due_snapshot"]) if row["dbl_amount_due_snapshot"] is not None else None,
            dblBalanceSnapshot=float(row["dbl_balance_snapshot"]) if row["dbl_balance_snapshot"] is not None else None,
            strStatus=row["vchr_status"],
        )

    async def _fnGetQuotationTotalsAndReceived(self, conn, intQuotationId: int):
        """Returns (dblQuotationTotal, dblTotalReceivedSoFar) for a quotation, or (None, 0) if not found/owned."""
        rstQuotation = await conn.fetchrow(
            "SELECT dbl_total_amount, vchr_customer_name FROM tbl_quotation "
            "WHERE pk_bint_quotation_id = $1 AND fk_bint_user_id = $2",
            intQuotationId, self.intUserId,
        )
        if not rstQuotation:
            return None, None, 0.0
        rstReceived = await conn.fetchrow(
            "SELECT COALESCE(SUM(dbl_amount_paid), 0) AS total FROM tbl_advance_receipt "
            "WHERE fk_bint_quotation_id = $1 AND vchr_status = 'issued'",
            intQuotationId,
        )
        return float(rstQuotation["dbl_total_amount"]), rstQuotation["vchr_customer_name"], float(rstReceived["total"])

    async def fnCreate(self, mdlRequest: MdlCreateAdvanceReceiptRequest) -> MdlAdvanceReceiptResponse:
        self.logger.info(f"Creating advance receipt for quotation {mdlRequest.intQuotationId}")

        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                dblTotal, strCustomerName, dblReceivedSoFar = await self._fnGetQuotationTotalsAndReceived(
                    conn, mdlRequest.intQuotationId
                )
                if dblTotal is None:
                    return MdlAdvanceReceiptResponse(
                        intStatus=ResponseStatus.NO_DATA,
                        strStatus=ResponseStatus.NO_DATA_STR,
                        intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                        strMessage="Quotation not found",
                        data=None,
                    )

                dblAmountDueSnapshot = dblTotal - dblReceivedSoFar
                dblBalanceSnapshot = dblAmountDueSnapshot - mdlRequest.dblAmountPaid
                strReceiptNumber = await self.fnGenerateReceiptNumber()

                rstNew = await conn.fetchrow(
                    """
                    INSERT INTO tbl_advance_receipt (
                        fk_bint_user_id, fk_bint_quotation_id, vchr_receipt_number,
                        dat_receipt_date, vchr_received_from, dbl_amount_paid,
                        txt_payment_for, vchr_payment_mode, vchr_received_by,
                        dbl_amount_due_snapshot, dbl_balance_snapshot
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING pk_bint_advance_receipt_id
                    """,
                    self.intUserId,
                    mdlRequest.intQuotationId,
                    strReceiptNumber,
                    mdlRequest.datReceiptDate or datetime.date.today(),
                    mdlRequest.strReceivedFrom or strCustomerName,
                    mdlRequest.dblAmountPaid,
                    mdlRequest.strPaymentFor,
                    mdlRequest.strPaymentMode or "cash",
                    mdlRequest.strReceivedBy,
                    dblAmountDueSnapshot,
                    dblBalanceSnapshot,
                )
                intReceiptId = rstNew["pk_bint_advance_receipt_id"]

        self.logger.info(f"Advance receipt created: {strReceiptNumber} | ID={intReceiptId}")
        return await self.fnGet(intReceiptId)

    async def fnGet(self, intReceiptId: int) -> MdlAdvanceReceiptResponse:
        strQuery = """
            SELECT r.*, q.vchr_quotation_number
            FROM tbl_advance_receipt r
            JOIN tbl_quotation q ON q.pk_bint_quotation_id = r.fk_bint_quotation_id
            WHERE r.pk_bint_advance_receipt_id = $1 AND r.fk_bint_user_id = $2
        """
        async with self.insPool.acquire() as conn:
            row = await conn.fetchrow(strQuery, intReceiptId, self.intUserId)

        if not row:
            return MdlAdvanceReceiptResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Receipt not found",
                data=None,
            )

        return MdlAdvanceReceiptResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Receipt retrieved",
            data=self._fnRowToModel(dict(row)),
        )

    async def fnGetByQuotation(self, intQuotationId: int) -> MdlAdvanceReceiptListResponse:
        async with self.insPool.acquire() as conn:
            dblTotal, _, dblReceived = await self._fnGetQuotationTotalsAndReceived(conn, intQuotationId)
            if dblTotal is None:
                return MdlAdvanceReceiptListResponse(
                    intStatus=ResponseStatus.NO_DATA,
                    strStatus=ResponseStatus.NO_DATA_STR,
                    intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                    strMessage="Quotation not found",
                    lstReceipts=[],
                )
            rstRows = await conn.fetch(
                """
                SELECT r.*, q.vchr_quotation_number
                FROM tbl_advance_receipt r
                JOIN tbl_quotation q ON q.pk_bint_quotation_id = r.fk_bint_quotation_id
                WHERE r.fk_bint_quotation_id = $1 AND r.fk_bint_user_id = $2
                ORDER BY r.dat_receipt_date, r.pk_bint_advance_receipt_id
                """,
                intQuotationId, self.intUserId,
            )

        lstReceipts = [self._fnRowToModel(dict(row)) for row in rstRows]
        return MdlAdvanceReceiptListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstReceipts)} receipt(s)",
            lstReceipts=lstReceipts,
            dblQuotationTotal=dblTotal,
            dblTotalReceived=dblReceived,
            dblBalanceDue=dblTotal - dblReceived,
        )

    async def fnGetList(self) -> MdlAdvanceReceiptListResponse:
        """All receipts for the user (used by Reports)."""
        strQuery = """
            SELECT r.*, q.vchr_quotation_number
            FROM tbl_advance_receipt r
            JOIN tbl_quotation q ON q.pk_bint_quotation_id = r.fk_bint_quotation_id
            WHERE r.fk_bint_user_id = $1
            ORDER BY r.tim_created_at DESC
        """
        async with self.insPool.acquire() as conn:
            rstRows = await conn.fetch(strQuery, self.intUserId)

        lstReceipts = [self._fnRowToModel(dict(row)) for row in rstRows]
        return MdlAdvanceReceiptListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstReceipts)} receipt(s)",
            lstReceipts=lstReceipts,
        )

    async def fnUpdate(self, mdlRequest: MdlUpdateAdvanceReceiptRequest) -> MdlAdvanceReceiptResponse:
        async with self.insPool.acquire() as conn:
            async with conn.transaction():
                rstExisting = await conn.fetchrow(
                    "SELECT * FROM tbl_advance_receipt WHERE pk_bint_advance_receipt_id = $1 AND fk_bint_user_id = $2",
                    mdlRequest.intReceiptId, self.intUserId,
                )
                if not rstExisting:
                    return MdlAdvanceReceiptResponse(
                        intStatus=ResponseStatus.NO_DATA,
                        strStatus=ResponseStatus.NO_DATA_STR,
                        intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                        strMessage="Receipt not found",
                        data=None,
                    )
                if rstExisting["vchr_status"] == "void":
                    return MdlAdvanceReceiptResponse(
                        intStatus=ResponseStatus.ERROR,
                        strStatus=ResponseStatus.ERROR_STR,
                        intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                        strMessage="Cannot edit a voided receipt",
                        data=None,
                    )

                dblAmountPaid = mdlRequest.dblAmountPaid if mdlRequest.dblAmountPaid is not None else float(rstExisting["dbl_amount_paid"])

                # Recompute this receipt's own snapshot (excludes itself from "received so far")
                dblTotal, _, dblReceivedExclSelf = await self._fnGetQuotationTotalsAndReceived(
                    conn, rstExisting["fk_bint_quotation_id"]
                )
                dblReceivedExclSelf -= float(rstExisting["dbl_amount_paid"])
                dblAmountDueSnapshot = dblTotal - dblReceivedExclSelf
                dblBalanceSnapshot = dblAmountDueSnapshot - dblAmountPaid

                await conn.execute(
                    """
                    UPDATE tbl_advance_receipt SET
                        dat_receipt_date = $1, vchr_received_from = $2, dbl_amount_paid = $3,
                        txt_payment_for = $4, vchr_payment_mode = $5, vchr_received_by = $6,
                        dbl_amount_due_snapshot = $7, dbl_balance_snapshot = $8
                    WHERE pk_bint_advance_receipt_id = $9 AND fk_bint_user_id = $10
                    """,
                    mdlRequest.datReceiptDate or rstExisting["dat_receipt_date"],
                    mdlRequest.strReceivedFrom or rstExisting["vchr_received_from"],
                    dblAmountPaid,
                    mdlRequest.strPaymentFor if mdlRequest.strPaymentFor is not None else rstExisting["txt_payment_for"],
                    mdlRequest.strPaymentMode or rstExisting["vchr_payment_mode"],
                    mdlRequest.strReceivedBy if mdlRequest.strReceivedBy is not None else rstExisting["vchr_received_by"],
                    dblAmountDueSnapshot,
                    dblBalanceSnapshot,
                    mdlRequest.intReceiptId,
                    self.intUserId,
                )

        return await self.fnGet(mdlRequest.intReceiptId)

    async def fnVoid(self, intReceiptId: int) -> MdlAdvanceReceiptResponse:
        """Soft-delete: mark void, keep the record for audit trail."""
        async with self.insPool.acquire() as conn:
            rstUpdated = await conn.fetchrow(
                """UPDATE tbl_advance_receipt SET vchr_status = 'void'
                   WHERE pk_bint_advance_receipt_id = $1 AND fk_bint_user_id = $2
                   RETURNING pk_bint_advance_receipt_id""",
                intReceiptId, self.intUserId,
            )
        if not rstUpdated:
            return MdlAdvanceReceiptResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Receipt not found",
                data=None,
            )
        self.logger.info(f"Advance receipt voided: ID={intReceiptId}")
        return await self.fnGet(intReceiptId)
