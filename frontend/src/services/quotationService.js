import api from "@/lib/api";

const quotationService = {
    /**
     * Get all quotations (list view - summary only)
     *
     * ENDPOINT: POST /quotation/list
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   lstQuotation: [
     *     { intPkQuotationId, strQuotationNumber, datQuotationDate, strCustomerName, dblTotalAmount, strStatus, intItemCount }
     *   ]
     * }
     */
    getList: async () => {
        try {
            const response = await api.post('/quotation/list');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch quotations';
            throw new Error(strMessage);
        }
    },

    /**
     * Get single quotation with all items
     *
     * ENDPOINT: POST /quotation/get
     *
     * PARAMS: { intQuotationId: number }
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   data: {
     *     intPkQuotationId, strQuotationNumber, datQuotationDate,
     *     strCustomerName, strCustomerPhone, strCustomerAddress,
     *     dblSubtotal, dblTaxPercent, dblTaxAmount, dblDiscountAmount, dblTotalAmount,
     *     strNotes, strStatus, datValidUntil,
     *     lstItems: [{ intPkQuotationItemId, strItemName, dblQuantity, dblUnitPrice, dblTotalPrice, ... }]
     *   }
     * }
     */
    get: async (intQuotationId) => {
        try {
            const response = await api.post('/quotation/get', {
                intQuotationId: intQuotationId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch quotation';
            throw new Error(strMessage);
        }
    },

    /**
     * Create new quotation with items
     *
     * ENDPOINT: POST /quotation/add
     *
     * PARAMS:
     * {
     *   strCustomerName: string (required),
     *   strCustomerPhone: string,
     *   strCustomerAddress: string,
     *   datQuotationDate: string (YYYY-MM-DD),
     *   datValidUntil: string (YYYY-MM-DD),
     *   dblTaxPercent: number,
     *   dblDiscountAmount: number,
     *   strNotes: string,
     *   strStatus: "draft" | "sent" | "accepted" | "rejected",
     *   lstItems: [{ strItemName, dblQuantity, dblUnitPrice, intInventoryId?, strItemCode?, strUnit? }]
     * }
     *
     * RESPONSE: Same as get() - returns created quotation with generated quotation number
     */
    add: async (quotationData) => {
        try {
            // Transform items to match backend schema
            const lstItems = quotationData.lstItems.map((item, index) => {
                const mapped = {
                    intInventoryId: item.intInventoryId || null,
                    strItemCode: item.strItemCode || null,
                    strItemName: item.strItemName,
                    strUnit: item.strUnit || 'piece',
                    dblQuantity: parseFloat(item.dblQuantity) || 1,
                    dblUnitPrice: parseFloat(item.dblUnitPrice) || 0,
                    intWarrantyYears: parseInt(item.intWarrantyYears || 0),
                    intWarrantyMonths: parseInt(item.intWarrantyMonths || 0),
                    intWarrantyDays: parseInt(item.intWarrantyDays || 0),
                    intSortOrder: item.intSortOrder || index
                };

                if (item.datImplementationDate !== undefined) {
                    mapped.datImplementationDate = item.datImplementationDate || null;
                }
                if (item.datExpiryDate !== undefined) {
                    mapped.datExpiryDate = item.datExpiryDate || null;
                }
                if (item.blnManualExpiryOverride !== undefined) {
                    mapped.blnManualExpiryOverride = !!item.blnManualExpiryOverride;
                }

                return mapped;
            });

            const response = await api.post('/quotation/add', {
                strCustomerName: quotationData.strCustomerName,
                strCustomerPhone: quotationData.strCustomerPhone || null,
                strCustomerAddress: quotationData.strCustomerAddress || null,
                datQuotationDate: quotationData.datQuotationDate || null,
                datValidUntil: quotationData.datValidUntil || null,
                dblTaxPercent: parseFloat(quotationData.dblTaxPercent) || 0,
                dblDiscountAmount: parseFloat(quotationData.dblDiscountAmount) || 0,
                strNotes: quotationData.strNotes || null,
                strStatus: quotationData.strStatus || 'draft',
                lstItems: lstItems
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to create quotation';
            throw new Error(strMessage);
        }
    },

    /**
     * Update existing quotation
     *
     * ENDPOINT: POST /quotation/update
     *
     * PARAMS: Same as add() but with intPkQuotationId required
     * NOTE: If lstItems provided, ALL existing items are replaced
     *
     * RESPONSE: Same as get() - returns updated quotation
     */
    update: async (quotationData) => {
        try {
            // Build update payload - only include fields that are provided
            const payload = {
                intPkQuotationId: quotationData.intPkQuotationId
            };

            if (quotationData.strCustomerName !== undefined) {
                payload.strCustomerName = quotationData.strCustomerName;
            }
            if (quotationData.strCustomerPhone !== undefined) {
                payload.strCustomerPhone = quotationData.strCustomerPhone;
            }
            if (quotationData.strCustomerAddress !== undefined) {
                payload.strCustomerAddress = quotationData.strCustomerAddress;
            }
            if (quotationData.datQuotationDate !== undefined) {
                payload.datQuotationDate = quotationData.datQuotationDate;
            }
            if (quotationData.datValidUntil !== undefined) {
                payload.datValidUntil = quotationData.datValidUntil;
            }
            if (quotationData.dblTaxPercent !== undefined) {
                payload.dblTaxPercent = parseFloat(quotationData.dblTaxPercent);
            }
            if (quotationData.dblDiscountAmount !== undefined) {
                payload.dblDiscountAmount = parseFloat(quotationData.dblDiscountAmount);
            }
            if (quotationData.strNotes !== undefined) {
                payload.strNotes = quotationData.strNotes;
            }
            if (quotationData.strStatus !== undefined) {
                payload.strStatus = quotationData.strStatus;
            }

            // If items provided, transform them
            if (quotationData.lstItems !== undefined) {
                payload.lstItems = quotationData.lstItems.map((item, index) => {
                    const mapped = {
                        intInventoryId: item.intInventoryId || null,
                        strItemCode: item.strItemCode || null,
                        strItemName: item.strItemName,
                        strUnit: item.strUnit || 'piece',
                        dblQuantity: parseFloat(item.dblQuantity) || 1,
                        dblUnitPrice: parseFloat(item.dblUnitPrice) || 0,
                        intWarrantyYears: parseInt(item.intWarrantyYears || 0),
                        intWarrantyMonths: parseInt(item.intWarrantyMonths || 0),
                        intWarrantyDays: parseInt(item.intWarrantyDays || 0),
                        intSortOrder: item.intSortOrder || index
                    };

                    if (item.datImplementationDate !== undefined) {
                        mapped.datImplementationDate = item.datImplementationDate || null;
                    }
                    if (item.datExpiryDate !== undefined) {
                        mapped.datExpiryDate = item.datExpiryDate || null;
                    }
                    if (item.blnManualExpiryOverride !== undefined) {
                        mapped.blnManualExpiryOverride = !!item.blnManualExpiryOverride;
                    }

                    return mapped;
                });
            }

            const response = await api.post('/quotation/update', payload);
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to update quotation';
            throw new Error(strMessage);
        }
    },

    /**
     * Delete quotation
     *
     * ENDPOINT: POST /quotation/delete
     *
     * PARAMS: { intQuotationId: number }
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   strMessage: "Quotation deleted successfully",
     *   intDeletedId: 25
     * }
     */
    delete: async (intQuotationId) => {
        try {
            const response = await api.post('/quotation/delete', {
                intQuotationId: intQuotationId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to delete quotation';
            throw new Error(strMessage);
        }
    },

    /**
     * Update ONLY warranty fields on existing quotation items.
     * Does NOT delete/re-insert items - only updates warranty columns by item PK.
     *
     * ENDPOINT: POST /quotation/update-warranty
     *
     * PARAMS:
     * {
     *   intPkQuotationId: number,
     *   lstItems: [{
     *     intPkQuotationItemId: number,
     *     intWarrantyYears, intWarrantyMonths, intWarrantyDays,
     *     datImplementationDate, datExpiryDate, blnManualExpiryOverride
     *   }]
     * }
     */
    updateWarranty: async (intPkQuotationId, lstItems) => {
        try {
            const response = await api.post('/quotation/update-warranty', {
                intPkQuotationId,
                lstItems: lstItems.map((item) => ({
                    intPkQuotationItemId: item.intPkQuotationItemId,
                    intWarrantyYears: parseInt(item.intWarrantyYears || 0),
                    intWarrantyMonths: parseInt(item.intWarrantyMonths || 0),
                    intWarrantyDays: parseInt(item.intWarrantyDays || 0),
                    datImplementationDate: item.datImplementationDate || null,
                    datExpiryDate: item.datExpiryDate || null,
                    blnManualExpiryOverride: !!item.blnManualExpiryOverride,
                })),
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to update warranty';
            throw new Error(strMessage);
        }
    },

    /**
     * Update quotation status only
     *
     * Convenience method to update just the status
     *
     * PARAMS: intQuotationId, strStatus ("draft" | "sent" | "accepted" | "rejected")
     */
    updateStatus: async (intQuotationId, strStatus) => {
        return quotationService.update({
            intPkQuotationId: intQuotationId,
            strStatus: strStatus
        });
    }
};

export default quotationService;
