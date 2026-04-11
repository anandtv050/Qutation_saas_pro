import api from "@/lib/api";

const planService = {
    // Get all plans (admin)
    getAll: async () => {
        const response = await api.post('/plan/list');
        return response.data;
    },

    // Get active paid plans (public - for subscribe page)
    getActive: async () => {
        const response = await api.get('/plan/active');
        return response.data;
    },

    // Get all active plans including free (public - for landing page)
    getAllActive: async () => {
        const response = await api.get('/plan/active?include_free=true');
        return response.data;
    },

    // Create plan (admin)
    create: async (data) => {
        const response = await api.post('/plan/add', data);
        return response.data;
    },

    // Update plan (admin)
    update: async (data) => {
        const response = await api.post('/plan/update', data);
        return response.data;
    },

    // Delete plan (admin)
    delete: async (intPlanId) => {
        const response = await api.post('/plan/delete', { intPlanId });
        return response.data;
    },

    // Get all user subscriptions (admin)
    getAllSubscriptions: async () => {
        const response = await api.get('/subscription/admin/list');
        return response.data;
    },

    // Activate user subscription (admin)
    activateUser: async (intTargetUserId, intPlanId, intDays = 365) => {
        const response = await api.post('/subscription/admin/activate', {
            intTargetUserId, intPlanId, intDays
        });
        return response.data;
    },

    // Suspend user subscription (admin)
    suspendUser: async (intTargetUserId) => {
        const response = await api.post('/subscription/admin/suspend', {
            intTargetUserId
        });
        return response.data;
    },

    // Record manual payment (admin)
    recordPayment: async (data) => {
        const response = await api.post('/subscription/admin/record-payment', data);
        return response.data;
    },

    // Get all payments (admin)
    getPayments: async () => {
        const response = await api.get('/subscription/admin/payments');
        return response.data;
    },
};

export default planService;
