from typing import Annotated
from fastapi import APIRouter, Depends,HTTPException,status

from app.api.pdf.schema import MdlQuotationPDFRequest, MdlInvoicePDFRequest
from app.api.pdf.service import ClsPdfGenerator
from app.core.dependency import fnGetContext

router = APIRouter(prefix="/pdf", tags=["PDF"])

@router.post("/quotation")
async def fnGenerateQuotationPDF(
    mdlRequest : MdlQuotationPDFRequest,
    objContext=Depends(fnGetContext)
):
    "generate the quotation print"
    
    try:
        insPdfService =   ClsPdfGenerator(objContext.objPool,objContext.intUserId)  
        mdlResponse = await insPdfService.fnGetQuotationPdf(mdlRequest)   
        return mdlResponse       
    
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

    try:
        insPdfService = ClsPdfGenerator(objContext.objPool, objContext.intUserId)
        mdlResponse = await insPdfService.fnGetInvoicePdf(mdlRequest)
        return mdlResponse

    except Exception as e:
        print(str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )