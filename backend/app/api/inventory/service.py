from app.api.inventory.schema import MdlInventoryListResponse ,MdlInventoryResponse




class ClsInventoryService:
    def __init__(self,pool) -> None:
        self.insPool = pool
    
    async def fnGetInventoryListService(self,mdlGetInventoryList):
                
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
            lstInventoryItems = await conn.fetch(strQuery,intUserId)
        lstItems = []
        for dctItem in lstInventoryItems:
            mdlInventoryResponse = MdlInventoryResponse (
                intPkInventoryId=dctItem['pk_bint_inventory_id'],
                strItemCode=dctItem['vchr_item_code'],
                strItemName=dctItem['vchr_item_name'],
                strCategory=dctItem['vchr_category'],
                strUnit=dctItem['vchr_unit'],
                dblUnitPrice=dctItem['dbl_unit_price'],
                intStockQuantity=dctItem['int_stock_qty']
            )
            lstItems.append(mdlInventoryResponse)
            
        return MdlInventoryListResponse(lstItem=lstItems)        