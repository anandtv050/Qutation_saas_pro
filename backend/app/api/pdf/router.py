from typing import Annotated
from fastapi import APIRouter, Depends,HTTPException,status

from app.api.pdf.schema import (
    MdlQuotationPDFRequest,
    MdlInvoicePDFRequest,
    MdlWarrantyCertificatePDFRequest,
)
from app.api.pdf.service import ClsPdfGenerator
from app.core.dependency import fnGetContext
from app.core.feature import fnCheckModuleOperation

router = APIRouter(prefix="/pdf", tags=["PDF"])

@router.post("/quotation")
async def fnGenerateQuotationPDF(
    mdlRequest : MdlQuotationPDFRequest,
    objContext=Depends(fnGetContext)
):
    "generate the quotation print"
    await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "print_settings", "print")
    try:
        insPdfService = ClsPdfGenerator(objContext.objPool, objContext.intUserId)
        return await insPdfService.fnGetQuotationPdf(mdlRequest)
    except HTTPException:
        raise
    except Exception as e:
        print(str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/invoice")
async def fnGenerateInvoicePDF(
    mdlRequest: MdlInvoicePDFRequest,
    objContext=Depends(fnGetContext)
):
    "generate the invoice print"
    await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "print_settings", "print")
    try:
        insPdfService = ClsPdfGenerator(objContext.objPool, objContext.intUserId)
        return await insPdfService.fnGetInvoicePdf(mdlRequest)
    except HTTPException:
        raise
    except Exception as e:
        print(str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/warranty-certificate")
async def fnGenerateWarrantyCertificatePDF(
    mdlRequest: MdlWarrantyCertificatePDFRequest,
    objContext=Depends(fnGetContext)
):
    "generate warranty certificate print"
    await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "warranty", "print")
    try:
        insPdfService = ClsPdfGenerator(objContext.objPool, objContext.intUserId)
        return await insPdfService.fnGetWarrantyCertificatePdf(mdlRequest)
    except HTTPException:
        raise
    except Exception as e:
        print(str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
