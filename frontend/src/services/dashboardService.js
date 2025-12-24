import api from "@/lib/api";

const dashboardService = {
    /**
     * Get dashboard summary (collected/pending amounts)
     *
     * ENDPOINT: POST /dashboard/summary
     *
     * RESPONSE:
     * {
     *   intStatus: 1,
     *   data: {
     *     dblTotalCollected: 50000,
     *     dblTotalPending: 25000,
     *     intTotalInvoices: 10,
     *     intPaidInvoices: 5,
     *     intPendingInvoices: 5,
     *     intTotalQuotations: 15
     *   }
     * }
     */
    getSummary: async () => {
        try {
            const response = await api.post('/dashboard/summary');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch dashboard summary';
            throw new Error(strMessage);
        }
    }
};

export default dashboardService;
