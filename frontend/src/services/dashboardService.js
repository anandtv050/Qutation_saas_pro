import api from "@/lib/api";

const dashboardService = {
    /** User dashboard summary */
    getSummary: async () => {
        try {
            const response = await api.post('/dashboard/summary');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch dashboard summary';
            throw new Error(strMessage);
        }
    },

    /** Admin platform analytics with period filtering */
    getAdminSummary: async (strPeriod = "30d") => {
        try {
            const response = await api.post('/dashboard/admin/summary', { strPeriod });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch admin dashboard';
            throw new Error(strMessage);
        }
    },

    /** Admin user detail with period filtering */
    getAdminUserDetail: async (userId, strPeriod = "30d") => {
        try {
            const response = await api.post(`/dashboard/admin/user/${userId}`, { strPeriod });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch user detail';
            throw new Error(strMessage);
        }
    }
};

export default dashboardService;
