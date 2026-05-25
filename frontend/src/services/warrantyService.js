import api from "@/lib/api";

/**
 * Warranty domain service.
 *
 * Warranty data lives on quotation items in the DB, but the FEATURE
 * (report, certificate, AMC pipeline) is its own backend module
 * gated by the "warranty" permission.
 */
const warrantyService = {
    /**
     * Warranty report — flat list of warranty-bearing items across all
     * quotations for the user. Each row includes computed status and days remaining.
     *
     * ENDPOINT: POST /warranty/list
     */
    getList: async () => {
        try {
            const response = await api.post('/warranty/list');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch warranty report';
            throw new Error(strMessage);
        }
    },
};

export default warrantyService;
