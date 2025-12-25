import os
import json
import httpx
from typing import Optional
from asyncpg import Pool
from pathlib import Path

from app.api.ai.schema import (
    MdlProcessQuotationResponse,
    MdlAIQuotationItem
)
from app.core.baseSchema import ResponseStatus


class ClsAIQuotationService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId
        self.strGroqApiKey = os.getenv("GROQ_API_KEY", "")
        self.strGroqUrl = "https://api.groq.com/openai/v1/chat/completions"
        self.strModelName = "llama-3.3-70b-versatile"
        self.strPromptVersion = "v1.0"

    def fnLoadSystemPrompt(self) -> str:
        """Load system prompt from file"""
        strPromptPath = Path(__file__).parent / "system_prompt.txt"
        try:
            with open(strPromptPath, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            return "You are a helpful assistant for creating CCTV quotations."

    async def fnGetInventoryList(self) -> str:
        """Fetch inventory items for AI context"""
        async with self.insPool.acquire() as conn:
            strQuery = """
                SELECT
                    pk_bint_inventory_id,
                    vchr_item_code,
                    vchr_item_name,
                    vchr_unit,
                    dbl_unit_price
                FROM tbl_inventory
                WHERE fk_bint_user_id = $1
                ORDER BY vchr_item_name
            """
            lstRows = await conn.fetch(strQuery, self.intUserId)

            if not lstRows:
                return "No inventory items available."

            strInventoryText = "AVAILABLE INVENTORY:\n"
            for dctRow in lstRows:
                strInventoryText += f"- ID:{dctRow['pk_bint_inventory_id']} | Code:{dctRow['vchr_item_code'] or 'N/A'} | {dctRow['vchr_item_name']} | Unit:{dctRow['vchr_unit']} | Price:{dctRow['dbl_unit_price']}\n"

            return strInventoryText

    async def fnSaveRawInput(self, strRawText: str, strCustomerName: Optional[str] = None, strCustomerPhone: Optional[str] = None) -> int:
        """Save raw input to tbl_raw_input and return the ID"""
        async with self.insPool.acquire() as conn:
            strQuery = """
                INSERT INTO tbl_raw_input (
                    fk_bint_user_id,
                    vchr_customer_name,
                    vchr_customer_phone,
                    txt_site_notes
                ) VALUES ($1, $2, $3, $4)
                RETURNING pk_bint_raw_input_id
            """
            dctResult = await conn.fetchrow(
                strQuery,
                self.intUserId,
                strCustomerName,
                strCustomerPhone,
                strRawText
            )
            return dctResult['pk_bint_raw_input_id']

    async def fnSaveAiResponse(
        self,
        intRawInputId: int,
        dctJsonResponse: dict,
        intTokensInput: int = 0,
        intTokensOutput: int = 0
    ) -> int:
        """Save AI response to tbl_ai_response and return the ID"""
        async with self.insPool.acquire() as conn:
            strQuery = """
                INSERT INTO tbl_ai_response (
                    fk_bint_raw_input_id,
                    fk_bint_user_id,
                    json_ai_response,
                    vchr_prompt_version,
                    vchr_model_used,
                    int_tokens_input,
                    int_tokens_output,
                    dbl_cost_inr
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING pk_bint_ai_response_id
            """
            # Calculate cost (Groq is free, but track for future)
            # Approximate: $0.05/1M input, $0.10/1M output tokens
            dblCost = ((intTokensInput * 0.05) + (intTokensOutput * 0.10)) / 1000000
            # Convert to INR (approx 83 INR per USD)
            dblCostInr = dblCost * 83

            dctResult = await conn.fetchrow(
                strQuery,
                intRawInputId,
                self.intUserId,
                json.dumps(dctJsonResponse),
                self.strPromptVersion,
                self.strModelName,
                intTokensInput,
                intTokensOutput,
                dblCostInr
            )
            return dctResult['pk_bint_ai_response_id']

    async def fnProcessQuotation(self, strRawText: str) -> MdlProcessQuotationResponse:
        """Process raw text using Groq AI to generate quotation items"""

        if not self.strGroqApiKey:
            return MdlProcessQuotationResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="GROQ API key not configured",
                lstItems=[]
            )

        try:
            # Step 1: Save raw input to database
            intRawInputId = await self.fnSaveRawInput(strRawText)

            # Load system prompt and inventory
            strSystemPrompt = self.fnLoadSystemPrompt()
            strInventoryList = await self.fnGetInventoryList()

            # Build user message
            strUserMessage = f"""
{strInventoryList}

CUSTOMER REQUEST:
{strRawText}

Generate quotation items based on the above request. Match inventory items where possible.
Return ONLY valid JSON, no markdown formatting.
"""

            # Call Groq API
            dctHeaders = {
                "Authorization": f"Bearer {self.strGroqApiKey}",
                "Content-Type": "application/json"
            }

            dctPayload = {
                "model": self.strModelName,
                "messages": [
                    {"role": "system", "content": strSystemPrompt},
                    {"role": "user", "content": strUserMessage}
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }

            async with httpx.AsyncClient(timeout=30.0) as insClient:
                insResponse = await insClient.post(
                    self.strGroqUrl,
                    headers=dctHeaders,
                    json=dctPayload
                )

                if insResponse.status_code != 200:
                    return MdlProcessQuotationResponse(
                        intStatus=ResponseStatus.ERROR,
                        strStatus=ResponseStatus.ERROR_STR,
                        intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
                        strMessage=f"Groq API error: {insResponse.status_code}",
                        lstItems=[]
                    )

                dctResult = insResponse.json()

                # Extract token usage
                dctUsage = dctResult.get("usage", {})
                intTokensInput = dctUsage.get("prompt_tokens", 0)
                intTokensOutput = dctUsage.get("completion_tokens", 0)

                strAiResponse = dctResult["choices"][0]["message"]["content"]

                # Parse JSON from AI response
                # Clean up response (remove markdown if present)
                strAiResponseClean = strAiResponse.strip()
                if strAiResponseClean.startswith("```json"):
                    strAiResponseClean = strAiResponseClean[7:]
                if strAiResponseClean.startswith("```"):
                    strAiResponseClean = strAiResponseClean[3:]
                if strAiResponseClean.endswith("```"):
                    strAiResponseClean = strAiResponseClean[:-3]
                strAiResponseClean = strAiResponseClean.strip()

                dctParsed = json.loads(strAiResponseClean)

                # Step 2: Save AI response to database and get ID
                intAiResponseId = await self.fnSaveAiResponse(
                    intRawInputId=intRawInputId,
                    dctJsonResponse=dctParsed,
                    intTokensInput=intTokensInput,
                    intTokensOutput=intTokensOutput
                )

                # Convert to response model
                lstItems = []
                for dctItem in dctParsed.get("items", []):
                    lstItems.append(MdlAIQuotationItem(
                        strItemName=dctItem.get("item_name", "Unknown Item"),
                        strItemCode=dctItem.get("item_code"),
                        intInventoryId=dctItem.get("inventory_id"),
                        dblQuantity=float(dctItem.get("quantity", 1)),
                        dblUnitPrice=float(dctItem.get("unit_price", 0)),
                        strUnit=dctItem.get("unit", "piece")
                    ))

                return MdlProcessQuotationResponse(
                    intStatus=ResponseStatus.SUCCESS,
                    strStatus=ResponseStatus.SUCCESS_STR,
                    intStatusCode=ResponseStatus.HTTP_OK,
                    strMessage="Quotation generated successfully",
                    intAiResponseId=intAiResponseId,
                    lstItems=lstItems,
                    strCustomerName=dctParsed.get("customer_name"),
                    strCustomerPhone=dctParsed.get("customer_phone"),
                    strNotes=dctParsed.get("notes"),
                    intTokensInput=intTokensInput,
                    intTokensOutput=intTokensOutput
                )

        except json.JSONDecodeError as e:
            return MdlProcessQuotationResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
                strMessage=f"Failed to parse AI response: {str(e)}",
                lstItems=[]
            )
        except Exception as e:
            return MdlProcessQuotationResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
                strMessage=f"AI processing failed: {str(e)}",
                lstItems=[]
            )
