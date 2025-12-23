import api from "@/lib/api";

const invoiceService = {
    /**
     * Get all invoices (list view - summary only)
     *
     * ENDPOINT: POST /invoice/list
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   lstInvoice: [
     *     { intPkInvoiceId, strInvoiceNumber, datInvoiceDate, strCustomerName, dblTotalAmount, strPaymentStatus, intItemCount, strQuotationNumber }
     *   ]
     * }
     */
    getList: async () => {
        try {
            const response = await api.post('/invoice/list');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch invoices';
            throw new Error(strMessage);
        }
    },

    /**
     * Get single invoice with all items
     *
     * ENDPOINT: POST /invoice/get
     *
     * PARAMS: { intInvoiceId: number }
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   data: {
     *     intPkInvoiceId, strInvoiceNumber, datInvoiceDate,
     *     strCustomerName, strCustomerPhone, strCustomerAddress,
     *     dblSubtotal, dblTaxPercent, dblTaxAmount, dblDiscountAmount, dblTotalAmount,
     *     strNotes, strPaymentStatus, datDueDate, intQuotationId, strQuotationNumber,
     *     lstItems: [{ intPkInvoiceItemId, strItemName, dblQuantity, dblUnitPrice, dblTotalPrice, ... }]
     *   }
     * }
     */
    get: async (intInvoiceId) => {
        try {
            const response = await api.post('/invoice/get', {
                intInvoiceId: intInvoiceId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch invoice';
            throw new Error(strMessage);
        }
    },

    /**
     * Create new invoice with items
     *
     * ENDPOINT: POST /invoice/add
     *
     * PARAMS:
     * {
     *   intQuotationId: number (optional - link to source quotation),
     *   strCustomerName: string (required),
     *   strCustomerPhone: string,
     *   strCustomerAddress: string,
     *   datInvoiceDate: string (YYYY-MM-DD),
     *   datDueDate: string (YYYY-MM-DD),
     *   dblTaxPercent: number,
     *   dblDiscountAmount: number,
     *   strNotes: string,
     *   strPaymentStatus: "pending" | "partial" | "paid",
     *   lstItems: [{ strItemName, dblQuantity, dblUnitPrice, intInventoryId?, strItemCode?, strUnit? }]
     * }
     *
     * RESPONSE: Same as get() - returns created invoice with generated invoice number
     */
    add: async (invoiceData) => {
        try {
            // Transform items to match backend schema
            const lstItems = invoiceData.lstItems.map((item, index) => ({
                intInventoryId: item.intInventoryId || null,
                strItemCode: item.strItemCode || null,
                strItemName: item.strItemName,
                strUnit: item.strUnit || 'piece',
                dblQuantity: parseFloat(item.dblQuantity) || 1,
                dblUnitPrice: parseFloat(item.dblUnitPrice) || 0,
                intSortOrder: item.intSortOrder || index
            }));

            const response = await api.post('/invoice/add', {
                intQuotationId: invoiceData.intQuotationId || null,
                strCustomerName: invoiceData.strCustomerName,
                strCustomerPhone: invoiceData.strCustomerPhone || null,
                strCustomerAddress: invoiceData.strCustomerAddress || null,
                datInvoiceDate: invoiceData.datInvoiceDate || null,
                datDueDate: invoiceData.datDueDate || null,
                dblTaxPercent: parseFloat(invoiceData.dblTaxPercent) || 0,
                dblDiscountAmount: parseFloat(invoiceData.dblDiscountAmount) || 0,
                strNotes: invoiceData.strNotes || null,
                strPaymentStatus: invoiceData.strPaymentStatus || 'pending',
                lstItems: lstItems
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to create invoice';
            throw new Error(strMessage);
        }
    },

    /**
     * Delete invoice
     *
     * ENDPOINT: POST /invoice/delete
     *
     * PARAMS: { intInvoiceId: number }
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   strMessage: "Invoice deleted",
     *   intDeletedId: 10
     * }
     */
    delete: async (intInvoiceId) => {
        try {
            const response = await api.post('/invoice/delete', {
                intInvoiceId: intInvoiceId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to delete invoice';
            throw new Error(strMessage);
        }
    }
};

export default invoiceService;
