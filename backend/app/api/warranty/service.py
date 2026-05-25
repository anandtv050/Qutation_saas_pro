import datetime

from app.api.warranty.schema import (
    MdlWarrantyReportItem,
    MdlWarrantyReportResponse,
)
from app.core.baseSchema import ResponseStatus
from app.core.logger import getUserLogger


class ClsWarrantyService:
    """Warranty domain service.

    Currently only serves the warranty REPORT (list of warranty-bearing items
    across the user's quotations). The warranty UPDATE flow stays in the
    quotation module — those columns are on tbl_quotation_item.
    """

    def __init__(self, pool, intUserId: int) -> None:
        self.insPool = pool
        self.intUserId = intUserId
        self.logger = getUserLogger(intUserId)

    async def fnGetWarrantyReportList(self):
        """Return a flat list of all warranty-bearing items across the user's
        quotations, with computed status (active / expiring_soon / expired / unset)."""

        strQuery = """
            SELECT
                qi.pk_bint_quotation_item_id,
                q.pk_bint_quotation_id,
                q.vchr_quotation_number,
                q.dat_quotation_date,
                q.vchr_customer_name,
                q.vchr_customer_phone,
                qi.vchr_item_name,
                qi.vchr_item_code,
                qi.dbl_quantity,
                qi.int_warranty_years,
                qi.int_warranty_months,
                qi.int_warranty_days,
                qi.dat_implementation_date,
                qi.dat_expiry_date
            FROM tbl_quotation_item qi
            JOIN tbl_quotation q ON q.pk_bint_quotation_id = qi.fk_bint_quotation_id
            WHERE q.fk_bint_user_id = $1
              AND (
                  COALESCE(qi.int_warranty_years, 0) > 0
                  OR COALESCE(qi.int_warranty_months, 0) > 0
                  OR COALESCE(qi.int_warranty_days, 0) > 0
              )
            ORDER BY qi.dat_expiry_date ASC NULLS LAST, q.dat_quotation_date DESC
        """
        async with self.insPool.acquire() as conn:
            lstRows = await conn.fetch(strQuery, self.intUserId)

        if not lstRows:
            return MdlWarrantyReportResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No warranty items found",
                lstWarranty=[]
            )

        today = datetime.date.today()
        lstItems = []
        for row in lstRows:
            datExpiry = row['dat_expiry_date']
            if datExpiry is None:
                intDaysRemaining = None
                strStatus = "unset"
            else:
                intDaysRemaining = (datExpiry - today).days
                if intDaysRemaining < 0:
                    strStatus = "expired"
                elif intDaysRemaining <= 30:
                    strStatus = "expiring_soon"
                else:
                    strStatus = "active"

            lstItems.append(MdlWarrantyReportItem(
                intPkQuotationItemId=row['pk_bint_quotation_item_id'],
                intPkQuotationId=row['pk_bint_quotation_id'],
                strQuotationNumber=row['vchr_quotation_number'],
                datQuotationDate=row['dat_quotation_date'],
                strCustomerName=row['vchr_customer_name'],
                strCustomerPhone=row['vchr_customer_phone'],
                strItemName=row['vchr_item_name'],
                strItemCode=row['vchr_item_code'],
                dblQuantity=float(row['dbl_quantity'] or 0),
                intWarrantyYears=row['int_warranty_years'] or 0,
                intWarrantyMonths=row['int_warranty_months'] or 0,
                intWarrantyDays=row['int_warranty_days'] or 0,
                datImplementationDate=row['dat_implementation_date'],
                datExpiryDate=datExpiry,
                intDaysRemaining=intDaysRemaining,
                strStatus=strStatus,
            ))

        return MdlWarrantyReportResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstItems)} warranty items",
            lstWarranty=lstItems
        )
