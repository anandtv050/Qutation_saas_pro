import api from "@/lib/api";

const pdfService = {
    /**
     * Generate Quotation PDF
     *
     * @param {Object} data - Quotation data
     * @param {number} data.intQuotationId - Quotation ID (optional - fetches from DB)
     * @param {string} data.strCustomerName - Customer name
     * @param {string} data.strCustomerPhone - Customer phone
     * @param {string} data.strCustomerAddress - Customer address
     * @param {string} data.strQuotationDate - Quotation date
     * @param {string} data.strQuotationNumber - Quotation number
     * @param {Array} data.lstItems - Items array [{strItemName, dblQuantity, dblUnitPrice}]
     * @param {boolean} data.blnIncludeInfoPage - Include company info page (default: true)
     * @returns {Blob} PDF file blob
     */
    generateQuotationPDF: async (data) => {
        try {
            const response = await api.post('/pdf/quotation', data, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to generate quotation PDF';
            throw new Error(strMessage);
        }
    },

    /**
     * Generate Invoice PDF
     *
     * @param {Object} data - Invoice data
     * @param {number} data.intInvoiceId - Invoice ID (optional - fetches from DB)
     * @param {string} data.strCustomerName - Customer name
     * @param {string} data.strCustomerPhone - Customer phone
     * @param {string} data.strCustomerAddress - Customer address
     * @param {string} data.strInvoiceDate - Invoice date
     * @param {string} data.strInvoiceNumber - Invoice number
     * @param {string} data.strDueDate - Due date
     * @param {Array} data.lstItems - Items array [{strItemName, dblQuantity, dblUnitPrice}]
     * @param {boolean} data.blnIncludeInfoPage - Include company info page (default: false)
     * @returns {Blob} PDF file blob
     */
    generateInvoicePDF: async (data) => {
        try {
            const response = await api.post('/pdf/invoice', data, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to generate invoice PDF';
            throw new Error(strMessage);
        }
    },

    /**
     * Open PDF in new tab for printing
     * @param {Blob} pdfBlob - PDF blob
     */
    openPDFInNewTab: (pdfBlob) => {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        // Clean up URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /**
     * Download PDF file
     * @param {Blob} pdfBlob - PDF blob
     * @param {string} filename - Filename for download
     */
    downloadPDF: (pdfBlob, filename) => {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

export default pdfService;
