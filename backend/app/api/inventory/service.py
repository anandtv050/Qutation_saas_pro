import datetime

from app.api.inventory.schema import (
    MdlInventoryListResponse,
    MdlInventoryResponse,
    MdlInventoryItem,
    MdlDeleteInventoryResponse
)
from app.core.baseSchema import ResponseStatus


class ClsInventoryService:
    def __init__(self, pool) -> None:
        self.insPool = pool

    async def fnGetInventoryListService(self, mdlGetInventoryList):
        """Inventory listing"""

        intUserId = mdlGetInventoryList.intUserId

        strQuery = """
                SELECT
                    pk_bint_inventory_id,
                    vchr_item_code,
                    vchr_item_name,
                    vchr_category,
                    vchr_unit,
                    dbl_unit_price,
                    int_stock_qty
                FROM
                    tbl_inventory
                WHERE
                    fk_bint_user_id = $1
                """
        async with self.insPool.acquire() as conn:
            lstInventoryItems = await conn.fetch(strQuery, intUserId)

        # No data found
        if not lstInventoryItems:
            return MdlInventoryListResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No inventory items found",
                lstItem=[]
            )

        lstItems = []
        for dctItem in lstInventoryItems:
            mdlInventoryItem = MdlInventoryItem(
                intPkInventoryId=dctItem['pk_bint_inventory_id'],
                strItemCode=dctItem['vchr_item_code'],
                strItemName=dctItem['vchr_item_name'],
                strCategory=dctItem['vchr_category'],
                strUnit=dctItem['vchr_unit'],
                dblUnitPrice=dctItem['dbl_unit_price'],
                intStockQuantity=dctItem['int_stock_qty']
            )
            lstItems.append(mdlInventoryItem)

        return MdlInventoryListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstItems)} inventory items",
            lstItem=lstItems
        )

    async def fnAddInventoryService(self, mdlCreateInventoryRequest):
        """Create a new inventory"""

        # Check if item code already exists
        strCheckQuery = """
            SELECT pk_bint_inventory_id FROM tbl_inventory
            WHERE vchr_item_code = $1 AND fk_bint_user_id = $2
        """
        async with self.insPool.acquire() as conn:
            rstExisting = await conn.fetchrow(
                strCheckQuery,
                mdlCreateInventoryRequest.strItemCode,
                mdlCreateInventoryRequest.intUserId
            )

        if rstExisting:
            return MdlInventoryResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_CONFLICT,
                strMessage="Item code already exists",
                data=None
            )

        strQuery = """
                INSERT INTO tbl_inventory(
                    fk_bint_user_id,
                    vchr_item_code,
                    vchr_item_name,
                    vchr_category,
                    vchr_unit,
                    dbl_unit_price,
                    int_stock_qty,
                    txt_description,
                    tim_created_at
                ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *
        """
        async with self.insPool.acquire() as conn:
            rstItems = await conn.fetchrow(
                strQuery,
                mdlCreateInventoryRequest.intUserId,
                mdlCreateInventoryRequest.strItemCode,
                mdlCreateInventoryRequest.strItemName,
                mdlCreateInventoryRequest.strCategory,
                mdlCreateInventoryRequest.strUnit,
                mdlCreateInventoryRequest.dblUnitPrice,
                mdlCreateInventoryRequest.intStockQuantity,
                mdlCreateInventoryRequest.strDescription,
                datetime.datetime.now()
            )

        mdlInventoryItem = MdlInventoryItem(
            intPkInventoryId=rstItems['pk_bint_inventory_id'],
            strItemCode=rstItems['vchr_item_code'],
            strItemName=rstItems['vchr_item_name'],
            strCategory=rstItems['vchr_category'],
            strUnit=rstItems['vchr_unit'],
            dblUnitPrice=rstItems['dbl_unit_price'],
            intStockQuantity=rstItems['int_stock_qty']
        )

        return MdlInventoryResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_CREATED,
            strMessage="Inventory created successfully",
            data=mdlInventoryItem
        )

    async def fnUpdateInventoryService(self, mdlUpdateInventoryRequest):
        """Update Inventory"""

        # Check if inventory exists
        strCheckQuery = """
                    SELECT
                        pk_bint_inventory_id
                    FROM
                        tbl_inventory
                    WHERE
                        pk_bint_inventory_id = $1
                        AND fk_bint_user_id = $2
                """
        async with self.insPool.acquire() as conn:
            rstExist = await conn.fetchrow(
                strCheckQuery,
                mdlUpdateInventoryRequest.intPkInventoryId,
                mdlUpdateInventoryRequest.intUserId
            )

        if not rstExist:
            return MdlInventoryResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Inventory item not found",
                data=None
            )

        # BUILD DYNAMIC UPDATE QUERY
        lstFields = []
        lstValues = []
        intParamsCount = 1

        if mdlUpdateInventoryRequest.strItemCode is not None:
            lstFields.append(f"vchr_item_code = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.strItemCode)
            intParamsCount += 1

        if mdlUpdateInventoryRequest.strItemName is not None:
            lstFields.append(f"vchr_item_name = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.strItemName)
            intParamsCount += 1

        if mdlUpdateInventoryRequest.strCategory is not None:
            lstFields.append(f"vchr_category = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.strCategory)
            intParamsCount += 1

        if mdlUpdateInventoryRequest.strUnit is not None:
            lstFields.append(f"vchr_unit = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.strUnit)
            intParamsCount += 1

        if mdlUpdateInventoryRequest.dblUnitPrice is not None:
            lstFields.append(f"dbl_unit_price = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.dblUnitPrice)
            intParamsCount += 1

        if mdlUpdateInventoryRequest.intStockQuantity is not None:
            lstFields.append(f"int_stock_qty = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.intStockQuantity)
            intParamsCount += 1

        if mdlUpdateInventoryRequest.strDescription is not None:
            lstFields.append(f"txt_description = ${intParamsCount}")
            lstValues.append(mdlUpdateInventoryRequest.strDescription)
            intParamsCount += 1

        if not lstFields:
            return MdlInventoryResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="No fields to update",
                data=None
            )

        # Add updated_at timestamp
        lstFields.append(f"tim_updated_at = ${intParamsCount}")
        lstValues.append(datetime.datetime.now())
        intParamsCount += 1

        # Add WHERE params
        lstValues.append(mdlUpdateInventoryRequest.intPkInventoryId)
        lstValues.append(mdlUpdateInventoryRequest.intUserId)

        strQuery = f"""
            UPDATE tbl_inventory
            SET {', '.join(lstFields)}
            WHERE pk_bint_inventory_id = ${intParamsCount} AND fk_bint_user_id = ${intParamsCount + 1}
            RETURNING *
        """
        async with self.insPool.acquire() as conn:
            rstItems = await conn.fetchrow(strQuery, *lstValues)

        mdlInventoryItem = MdlInventoryItem(
            intPkInventoryId=rstItems['pk_bint_inventory_id'],
            strItemCode=rstItems['vchr_item_code'],
            strItemName=rstItems['vchr_item_name'],
            strCategory=rstItems['vchr_category'],
            strUnit=rstItems['vchr_unit'],
            dblUnitPrice=rstItems['dbl_unit_price'],
            intStockQuantity=rstItems['int_stock_qty']
        )

        return MdlInventoryResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Inventory updated successfully",
            data=mdlInventoryItem
        )

    async def fnDeleteInventory(self, intUserId: int, intInventoryId: int):
        """Delete inventory item"""

        strQuery = """
            DELETE FROM tbl_inventory
            WHERE pk_bint_inventory_id = $1 AND fk_bint_user_id = $2
            RETURNING pk_bint_inventory_id
        """
        async with self.insPool.acquire() as conn:
            rstDeleted = await conn.fetchrow(strQuery, intInventoryId, intUserId)

        if not rstDeleted:
            return MdlDeleteInventoryResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="Inventory item not found",
                intDeletedId=None
            )

        return MdlDeleteInventoryResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="Inventory deleted successfully",
            intDeletedId=intInventoryId
        )
