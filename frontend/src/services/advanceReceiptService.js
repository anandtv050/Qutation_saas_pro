import api from "@/lib/api";

/**
 * Advance Receipt domain service — advance/partial-payment receipts issued
 * against a quotation (e.g. the paper "Cash Receipt" form). Gated by the
 * "advance_receipt" module permission, same shape as warrantyService/
 * quotationService.
 */
const advanceReceiptService = {
    /** All receipts for the user (Reports tab). ENDPOINT: POST /advance-receipt/list */
    getList: async () => {
        try {
            const response = await api.post('/advance-receipt/list');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Failed to fetch receipts');
        }
    },

    /** Receipts + running totals for one quotation. ENDPOINT: POST /advance-receipt/by-quotation */
    getByQuotation: async (intQuotationId) => {
        try {
            const response = await api.post('/advance-receipt/by-quotation', { intQuotationId });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Failed to fetch receipts for quotation');
        }
    },

    /** ENDPOINT: POST /advance-receipt/get */
    get: async (intReceiptId) => {
        try {
            const response = await api.post('/advance-receipt/get', { intReceiptId });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Failed to fetch receipt');
        }
    },

    /** ENDPOINT: POST /advance-receipt/add */
    create: async (data) => {
        try {
            const response = await api.post('/advance-receipt/add', data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Failed to create receipt');
        }
    },

    /** ENDPOINT: POST /advance-receipt/update */
    update: async (data) => {
        try {
            const response = await api.post('/advance-receipt/update', data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Failed to update receipt');
        }
    },

    /** Soft-delete (audit trail kept). ENDPOINT: POST /advance-receipt/void */
    void: async (intReceiptId) => {
        try {
            const response = await api.post('/advance-receipt/void', { intReceiptId });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Failed to void receipt');
        }
    },
};

export default advanceReceiptService;
