import datetime

from app.api.inventory.schema import MdlInventoryListResponse ,MdlInventoryResponse




class ClsInventoryService:
    def __init__(self,pool) -> None:
        self.insPool = pool
    
    async def fnGetInventoryListService(self,mdlGetInventoryList):
        """inventory listing"""
                
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
    
    
    async def fnAddInventoryService(self,mdlCreateInventoryRequest):
        """create a new inventory"""
        
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
            mdlInventoryResponse = MdlInventoryResponse(
                intPkInventoryId = rstItems['pk_bint_inventory_id'],
                strItemCode = rstItems['vchr_item_code'],
                strItemName = rstItems['vchr_item_name'],
                strCategory = rstItems['vchr_category'],
                strUnit = rstItems['vchr_unit'],
                dblUnitPrice = rstItems['dbl_unit_price'],
                intStockQuantity = rstItems['int_stock_qty']
            )
            return mdlInventoryResponse
            
        
              