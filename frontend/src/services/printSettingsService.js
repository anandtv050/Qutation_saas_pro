import api from "@/lib/api";

const printSettingsService = {
    /**
     * Get print model settings for a user + module
     * @param {string} vchModule - "QUOTATION" | "INVOICE" | "WARRANTY"
     * @param {number|null} intTargetUserId - User to load for (admin only)
     */
    getSettings: async (vchModule = "QUOTATION", intTargetUserId = null) => {
        try {
            const body = { vchModule };
            if (intTargetUserId) body.intTargetUserId = intTargetUserId;
            const response = await api.post("/print-settings/get", body);
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || "Failed to load print settings";
            throw new Error(strMessage);
        }
    },

    /**
     * Save (create or update) print model settings
     * @param {Object} settings - Full settings payload (includes vchModule, intTargetUserId)
     */
    saveSettings: async (settings) => {
        try {
            const response = await api.post("/print-settings/save", settings);
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || "Failed to save print settings";
            throw new Error(strMessage);
        }
    },
};

export default printSettingsService;
