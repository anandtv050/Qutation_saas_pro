import api from "@/lib/api";

const inventoryService = {
    // Get all inventory items
    getList: async () => {
        try {
            const response = await api.post('/inventory/list');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch inventory';
            throw new Error(strMessage);
        }
    },

    // Add new inventory item
    add: async (itemData) => {
        try {
            const response = await api.post('/inventory/add', {
                strItemCode: itemData.strItemCode,
                strItemName: itemData.strItemName,
                strCategory: itemData.strCategory,
                strUnit: itemData.strUnit || 'piece',
                dblUnitPrice: parseFloat(itemData.dblUnitPrice),
                intStockQuantity: parseInt(itemData.intStockQuantity),
                intWarrantyYears: parseInt(itemData.intWarrantyYears || 0),
                intWarrantyMonths: parseInt(itemData.intWarrantyMonths || 0),
                intWarrantyDays: parseInt(itemData.intWarrantyDays || 0),
                strDescription: itemData.strDescription || null
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to add inventory item';
            throw new Error(strMessage);
        }
    },

    // Update inventory item
    update: async (itemData) => {
        try {
            const response = await api.post('/inventory/update', {
                intPkInventoryId: itemData.intPkInventoryId,
                strItemCode: itemData.strItemCode || null,
                strItemName: itemData.strItemName || null,
                strCategory: itemData.strCategory || null,
                strUnit: itemData.strUnit || null,
                dblUnitPrice: itemData.dblUnitPrice ? parseFloat(itemData.dblUnitPrice) : null,
                intStockQuantity: itemData.intStockQuantity !== undefined ? parseInt(itemData.intStockQuantity) : null,
                intWarrantyYears: itemData.intWarrantyYears !== undefined ? parseInt(itemData.intWarrantyYears || 0) : null,
                intWarrantyMonths: itemData.intWarrantyMonths !== undefined ? parseInt(itemData.intWarrantyMonths || 0) : null,
                intWarrantyDays: itemData.intWarrantyDays !== undefined ? parseInt(itemData.intWarrantyDays || 0) : null,
                strDescription: itemData.strDescription || null
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to update inventory item';
            throw new Error(strMessage);
        }
    },

    // Delete inventory item
    delete: async (intInventoryId) => {
        try {
            const response = await api.post('/inventory/delete', {
                intInventoryId: intInventoryId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to delete inventory item';
            throw new Error(strMessage);
        }
    }
};

export default inventoryService;
