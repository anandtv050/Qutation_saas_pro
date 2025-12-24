import os
import json
import httpx
from asyncpg import Pool
from pathlib import Path

from app.api.ai.schema import (
    MdlProcessQuotationResponse,
    MdlAIQuotationItem
)
from app.core.baseSchema import ResponseStatus


class ClsAIQuotationService:
    def __init__(self, pool: Pool, intUserId: int):
        self.pool = pool
        self.intUserId = intUserId
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"

    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        prompt_path = Path(__file__).parent / "system_prompt.txt"
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            return "You are a helpful assistant for creating CCTV quotations."

    async def _get_inventory_list(self) -> str:
        """Fetch inventory items for AI context"""
        async with self.pool.acquire() as conn:
            query = """
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
            rows = await conn.fetch(query, self.intUserId)

            if not rows:
                return "No inventory items available."

            inventory_text = "AVAILABLE INVENTORY:\n"
            for row in rows:
                inventory_text += f"- ID:{row['pk_bint_inventory_id']} | Code:{row['vchr_item_code'] or 'N/A'} | {row['vchr_item_name']} | Unit:{row['vchr_unit']} | Price:{row['dbl_unit_price']}\n"

            return inventory_text

    async def fnProcessQuotation(self, strRawText: str) -> MdlProcessQuotationResponse:
        """Process raw text using Groq AI to generate quotation items"""

        if not self.groq_api_key:
            return MdlProcessQuotationResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="GROQ API key not configured",
                lstItems=[]
            )

        try:
            # Load system prompt and inventory
            system_prompt = self._load_system_prompt()
            inventory_list = await self._get_inventory_list()

            # Build user message
            user_message = f"""
{inventory_list}

CUSTOMER REQUEST:
{strRawText}

Generate quotation items based on the above request. Match inventory items where possible.
Return ONLY valid JSON, no markdown formatting.
"""

            # Call Groq API
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.groq_url,
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    return MdlProcessQuotationResponse(
                        intStatus=ResponseStatus.ERROR,
                        strStatus=ResponseStatus.ERROR_STR,
                        intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
                        strMessage=f"Groq API error: {response.status_code}",
                        lstItems=[]
                    )

                result = response.json()
                ai_response = result["choices"][0]["message"]["content"]

                # Parse JSON from AI response
                # Clean up response (remove markdown if present)
                ai_response = ai_response.strip()
                if ai_response.startswith("```json"):
                    ai_response = ai_response[7:]
                if ai_response.startswith("```"):
                    ai_response = ai_response[3:]
                if ai_response.endswith("```"):
                    ai_response = ai_response[:-3]
                ai_response = ai_response.strip()

                parsed = json.loads(ai_response)

                # Convert to response model
                items = []
                for item in parsed.get("items", []):
                    items.append(MdlAIQuotationItem(
                        strItemName=item.get("item_name", "Unknown Item"),
                        strItemCode=item.get("item_code"),
                        intInventoryId=item.get("inventory_id"),
                        dblQuantity=float(item.get("quantity", 1)),
                        dblUnitPrice=float(item.get("unit_price", 0)),
                        strUnit=item.get("unit", "piece")
                    ))

                return MdlProcessQuotationResponse(
                    intStatus=ResponseStatus.SUCCESS,
                    strStatus=ResponseStatus.SUCCESS_STR,
                    intStatusCode=ResponseStatus.HTTP_OK,
                    strMessage="Quotation generated successfully",
                    lstItems=items,
                    strCustomerName=parsed.get("customer_name"),
                    strCustomerPhone=parsed.get("customer_phone"),
                    strNotes=parsed.get("notes")
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
