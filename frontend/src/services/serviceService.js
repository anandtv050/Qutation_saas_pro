import api from "@/lib/api";

const serviceService = {
    // Get active services (public - for signup)
    getActive: async () => {
        const response = await api.get('/service/active');
        return response.data;
    },

    // Get all services (admin)
    getAll: async () => {
        const response = await api.post('/service/list');
        return response.data;
    },

    // Get service detail with prompt (admin)
    getDetail: async (intServiceId) => {
        const response = await api.post('/service/detail', { intServiceId });
        return response.data;
    },

    // Create service (admin)
    create: async (data) => {
        const response = await api.post('/service/add', data);
        return response.data;
    },

    // Update service (admin)
    update: async (data) => {
        const response = await api.post('/service/update', data);
        return response.data;
    },

    // Delete service (admin)
    delete: async (intServiceId) => {
        const response = await api.post('/service/delete', { intServiceId });
        return response.data;
    },
};

export default serviceService;
