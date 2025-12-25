import api from "@/lib/api";

const userService = {
    // Get all users (Admin only)
    getList: async () => {
        try {
            const response = await api.post('/user/list');
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch users';
            throw new Error(strMessage);
        }
    },

    // Get single user (Admin only)
    get: async (intUserId) => {
        try {
            const response = await api.post('/user/get', {
                intUserId: intUserId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to fetch user';
            throw new Error(strMessage);
        }
    },

    // Add new user (Admin only)
    add: async (userData) => {
        try {
            const response = await api.post('/user/add', {
                strEmail: userData.strEmail,
                strPassword: userData.strPassword,
                strUsername: userData.strUsername,
                strBusinessName: userData.strBusinessName || null,
                strPhone: userData.strPhone || null,
                strAddress: userData.strAddress || null
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to add user';
            throw new Error(strMessage);
        }
    },

    // Delete user (Admin only)
    delete: async (intUserId) => {
        try {
            const response = await api.post('/user/delete', {
                intUserId: intUserId
            });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to delete user';
            throw new Error(strMessage);
        }
    }
};

export default userService;
