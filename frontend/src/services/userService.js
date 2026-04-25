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
    },

    // Toggle user active/inactive (Admin only)
    toggleActive: async (intUserId) => {
        const response = await api.post('/user/toggle-active', { intUserId });
        return response.data;
    },

    // Get user permissions (Admin only) — shows effective plan + override permissions
    getPermissions: async (intTargetUserId) => {
        const response = await api.post('/user/permissions/get', { intTargetUserId });
        return response.data;
    },

    // ── Module Overrides (per-user grant/revoke beyond plan) ──
    setModuleOverride: async ({ intTargetUserId, intModuleId, intCreate = 0, intRead = 0, intUpdate = 0, intDelete = 0, intPrint = 0, strQuotaPeriod = null, datExpiresAt = null, strReason = null }) => {
        const response = await api.post('/user/override/set', {
            intTargetUserId, intModuleId,
            intCreate, intRead, intUpdate, intDelete, intPrint,
            strQuotaPeriod, datExpiresAt, strReason,
        });
        return response.data;
    },

    deleteModuleOverride: async (intTargetUserId, intModuleId) => {
        const response = await api.post('/user/override/delete', { intTargetUserId, intModuleId });
        return response.data;
    },

    listModuleOverrides: async (intTargetUserId) => {
        const response = await api.post('/user/override/list', { intTargetUserId });
        return response.data;
    },

    // Get my profile (current user)
    getMyProfile: async () => {
        const response = await api.post('/user/me');
        return response.data;
    },

    // Update profile (current user or admin)
    updateProfile: async (data) => {
        const response = await api.post('/user/update', data);
        return response.data;
    },

    // Get my permissions (current user)
    getMyPermissions: async () => {
        const response = await api.get('/user/my-permissions');
        return response.data;
    },

    // Module CRUD (admin)
    addModule: async (data) => {
        const response = await api.post('/user/module/add', data);
        return response.data;
    },
    updateModule: async (data) => {
        const response = await api.post('/user/module/update', data);
        return response.data;
    },
    deleteModule: async (intModuleId) => {
        const response = await api.post('/user/module/delete', { intModuleId });
        return response.data;
    },

    // Get permission grid (admin)
    getPermissionGrid: async () => {
        const response = await api.get('/user/permissions/grid');
        return response.data;
    },

    // Get all module settings (admin)
    getAllSettings: async () => {
        const response = await api.get('/user/settings/all');
        return response.data;
    },

    // Update module settings (admin)
    updateSettings: async (strModule, lstSettings) => {
        const response = await api.post('/user/settings/update', {
            strModule, lstSettings
        });
        return response.data;
    },

    // Add new setting (admin)
    addSetting: async (data) => {
        const response = await api.post('/user/settings/add', data);
        return response.data;
    },

    // Delete setting (admin)
    deleteSetting: async (strModule, strKey) => {
        const response = await api.post('/user/settings/delete', { strModule, strKey });
        return response.data;
    },

    // Get user setting overrides (admin)
    getUserOverrides: async (intTargetUserId) => {
        const response = await api.post('/user/settings/user-overrides', { intTargetUserId });
        return response.data;
    },

    // Set user setting override (admin)
    setUserOverride: async (intTargetUserId, strKey, strValue) => {
        const response = await api.post('/user/settings/user-override', {
            intTargetUserId, strKey, strValue
        });
        return response.data;
    },
};

export default userService;
