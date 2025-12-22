from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# =====================================================
# QUOTATION ITEM MODELS
# =====================================================

class MdlQuotationItemRequest(BaseModel):
    """
    Single item when CREATING or UPDATING quotation

    USED IN:
    - MdlCreateQuotationRequest.lstItems
    - MdlUpdateQuotationRequest.lstItems

    EXAMPLE:
    {
        "intInventoryId": 5,
        "strItemCode": "CAM-001",
        "strItemName": "Hikvision 2MP Camera",
        "strUnit": "piece",
        "dblQuantity": 4,
        "dblUnitPrice": 2500.00,
        "intSortOrder": 0
    }
    """
    intInventoryId: Optional[int] = None  # NULL if custom item (not from inventory)
    strItemCode: Optional[str] = None
    strItemName: str
    strUnit: Optional[str] = "piece"
    dblQuantity: float
    dblUnitPrice: float
    intSortOrder: Optional[int] = 0


class MdlQuotationItem(BaseModel):
    """
    Single item in API RESPONSE (after save)

    USED IN:
    - MdlQuotation.lstItems (when getting quotation details)

    DIFFERENCE FROM REQUEST:
    - Has intPkQuotationItemId (database ID)
    - Has dblTotalPrice (calculated: qty * price)

    EXAMPLE:
    {
        "intPkQuotationItemId": 101,
        "intInventoryId": 5,
        "strItemCode": "CAM-001",
        "strItemName": "Hikvision 2MP Camera",
        "strUnit": "piece",
        "dblQuantity": 4,
        "dblUnitPrice": 2500.00,
        "dblTotalPrice": 10000.00,
        "intSortOrder": 0
    }
    """
    intPkQuotationItemId: int
    intInventoryId: Optional[int] = None
    strItemCode: Optional[str] = None
    strItemName: str
    strUnit: Optional[str] = None
    dblQuantity: float
    dblUnitPrice: float
    dblTotalPrice: float  # Calculated by backend
    intSortOrder: int


# =====================================================
# REQUEST MODELS (Frontend -> Backend)
# =====================================================

class MdlCreateQuotationRequest(MdlBaseRequest):
    """
    REQUEST: Create new quotation

    ENDPOINT: POST /quotation/add

    FRONTEND USAGE:
    quotationService.add({
        strCustomerName: "John",
        strCustomerPhone: "9876543210",
        lstItems: [...]
    })

    EXAMPLE:
    {
        "strCustomerName": "Ramesh Kumar",
        "strCustomerPhone": "9876543210",
        "strCustomerAddress": "123 Main St, Chennai",
        "datQuotationDate": "2024-12-21",
        "datValidUntil": "2025-01-21",
        "dblTaxPercent": 18.0,
        "dblDiscountAmount": 500.00,
        "strNotes": "Installation included",
        "strStatus": "draft",
        "lstItems": [
            {
                "strItemName": "Hikvision Camera",
                "dblQuantity": 4,
                "dblUnitPrice": 2500
            }
        ]
    }
    """
    strCustomerName: str                              # Required
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    datQuotationDate: Optional[date] = None           # Default: today
    datValidUntil: Optional[date] = None
    dblTaxPercent: Optional[float] = 0.00             # GST %
    dblDiscountAmount: Optional[float] = 0.00         # Flat discount
    strNotes: Optional[str] = None
    strStatus: Optional[str] = "draft"                # draft, sent, accepted, rejected
    lstItems: List[MdlQuotationItemRequest]           # Required: at least 1 item


class MdlUpdateQuotationRequest(MdlBaseRequest):
    """
    REQUEST: Update existing quotation

    ENDPOINT: POST /quotation/update

    NOTE: All fields OPTIONAL except intPkQuotationId
    Only send fields you want to update!

    FRONTEND USAGE:
    quotationService.update({
        intPkQuotationId: 25,
        strCustomerName: "New Name",
        lstItems: [...]
    })

    EXAMPLE - Update only customer name:
    {
        "intPkQuotationId": 25,
        "strCustomerName": "Updated Name"
    }

    EXAMPLE - Update items (replaces ALL items):
    {
        "intPkQuotationId": 25,
        "lstItems": [
            {"strItemName": "Camera", "dblQuantity": 2, "dblUnitPrice": 3000}
        ]
    }
    """
    intPkQuotationId: int                             # Required: which quotation
    strCustomerName: Optional[str] = None
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    datQuotationDate: Optional[date] = None
    datValidUntil: Optional[date] = None
    dblTaxPercent: Optional[float] = None
    dblDiscountAmount: Optional[float] = None
    strNotes: Optional[str] = None
    strStatus: Optional[str] = None
    lstItems: Optional[List[MdlQuotationItemRequest]] = None  # Replaces ALL items


class MdlGetQuotationRequest(MdlBaseRequest):
    """
    REQUEST: Get single quotation with all items

    ENDPOINT: POST /quotation/get

    FRONTEND USAGE:
    quotationService.get({ intQuotationId: 25 })

    EXAMPLE:
    {
        "intQuotationId": 25
    }
    """
    intQuotationId: int


class MdlDeleteQuotationRequest(MdlBaseRequest):
    """
    REQUEST: Delete quotation

    ENDPOINT: POST /quotation/delete

    NOTE: Also deletes all quotation items (CASCADE)

    FRONTEND USAGE:
    quotationService.delete({ intQuotationId: 25 })

    EXAMPLE:
    {
        "intQuotationId": 25
    }
    """
    intQuotationId: int


# =====================================================
# RESPONSE MODELS (Backend -> Frontend)
# =====================================================

class MdlQuotation(BaseModel):
    """
    Full quotation data with all items

    USED IN:
    - MdlQuotationResponse.lstQutation

    RETURNED BY:
    - POST /quotation/add    -> After creating
    - POST /quotation/update -> After updating
    - POST /quotation/get    -> When fetching

    EXAMPLE:
    {
        "intPkQuotationId": 25,
        "strQuotationNumber": "QT-2024-0001",
        "datQuotationDate": "2024-12-21",
        "strCustomerName": "Ramesh Kumar",
        "strCustomerPhone": "9876543210",
        "strCustomerAddress": "123 Main St",
        "dblSubtotal": 10000.00,
        "dblTaxPercent": 18.0,
        "dblTaxAmount": 1800.00,
        "dblDiscountAmount": 500.00,
        "dblTotalAmount": 11300.00,
        "strNotes": "Installation included",
        "strStatus": "draft",
        "datValidUntil": "2025-01-21",
        "lstItems": [...]
    }
    """
    intPkQuotationId: int
    strQuotationNumber: str                           # Auto: QT-2024-0001
    datQuotationDate: date
    strCustomerName: str
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    dblSubtotal: float                                # Sum of items
    dblTaxPercent: float
    dblTaxAmount: float                               # subtotal * tax%
    dblDiscountAmount: float
    dblTotalAmount: float                             # subtotal + tax - discount
    strNotes: Optional[str] = None
    strStatus: str                                    # draft, sent, accepted, rejected
    datValidUntil: Optional[date] = None
    lstItems: List[MdlQuotationItem] = []


class MdlQuotationListItem(BaseModel):
    """
    Quotation SUMMARY for list view (without items)

    USED IN:
    - MdlQuotationListResponse.lstQuotation

    RETURNED BY:
    - POST /quotation/list

    WHY SEPARATE?
    - Faster: no items fetched
    - Lighter: only fields needed for list

    EXAMPLE:
    {
        "intPkQuotationId": 25,
        "strQuotationNumber": "QT-2024-0001",
        "datQuotationDate": "2024-12-21",
        "strCustomerName": "Ramesh Kumar",
        "strCustomerPhone": "9876543210",
        "dblTotalAmount": 11300.00,
        "strStatus": "draft",
        "intItemCount": 4
    }
    """
    intPkQuotationId: int
    strQuotationNumber: str
    datQuotationDate: date
    strCustomerName: str
    strCustomerPhone: Optional[str] = None
    dblTotalAmount: float
    strStatus: str
    intItemCount: int                                 # For display


class MdlQuotationResponse(MdlBaseResponse):
    """
    RESPONSE: Single quotation with full details

    RETURNED BY:
    - POST /quotation/add    -> After creating
    - POST /quotation/update -> After updating
    - POST /quotation/get    -> When fetching

    FRONTEND USAGE:
    const res = await quotationService.add({...});
    if (res.intStatus === 1) {
        const quotation = res.data;
        console.log(quotation.strQuotationNumber);
    }

    SUCCESS EXAMPLE:
    {
        "intStatus": 1,
        "strStatus": "SUCCESS",
        "intStatusCode": 200,
        "strMessage": "Quotation created",
        "data": { ...MdlQuotation... }
    }

    ERROR EXAMPLE:
    {
        "intStatus": 0,
        "strStatus": "ERROR",
        "intStatusCode": 404,
        "strMessage": "Quotation not found",
        "data": null
    }
    """
    data: Optional[MdlQuotation] = None


class MdlQuotationListResponse(MdlBaseResponse):
    """
    RESPONSE: List of all quotations (summary only)

    RETURNED BY:
    - POST /quotation/list

    FRONTEND USAGE:
    const res = await quotationService.list();
    if (res.intStatus === 1) {
        res.lstQuotation.forEach(q => {
            console.log(q.strQuotationNumber);
        });
    }

    SUCCESS EXAMPLE:
    {
        "intStatus": 1,
        "strStatus": "SUCCESS",
        "intStatusCode": 200,
        "strMessage": "Found 15 quotations",
        "lstQuotation": [
            { "intPkQuotationId": 25, ... },
            { "intPkQuotationId": 24, ... }
        ]
    }

    NO DATA EXAMPLE:
    {
        "intStatus": -1,
        "strStatus": "NO_DATA",
        "intStatusCode": 404,
        "strMessage": "No quotations found",
        "lstQuotation": []
    }
    """
    lstQuotation: List[MdlQuotationListItem] = []


class MdlDeleteQuotationResponse(MdlBaseResponse):
    """
    RESPONSE: After deleting quotation

    RETURNED BY:
    - POST /quotation/delete

    FRONTEND USAGE:
    const res = await quotationService.delete({ intQuotationId: 25 });
    if (res.intStatus === 1) {
        console.log("Deleted:", res.intDeletedId);
    }

    SUCCESS EXAMPLE:
    {
        "intStatus": 1,
        "strStatus": "SUCCESS",
        "intStatusCode": 200,
        "strMessage": "Quotation deleted",
        "intDeletedId": 25
    }

    NOT FOUND EXAMPLE:
    {
        "intStatus": -1,
        "strStatus": "NO_DATA",
        "intStatusCode": 404,
        "strMessage": "Quotation not found",
        "intDeletedId": null
    }
    """
    intDeletedId: Optional[int] = None
