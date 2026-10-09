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

    /**
     * Upload a logo/signature image. Resolves to the relative path to keep in settings
     * (it is persisted only when the user saves).
     * @param {File} file
     * @param {"logo"|"signature"} strKind
     * @param {string} vchModule
     * @param {number|null} intTargetUserId
     */
    uploadAsset: async (file, strKind, vchModule = "QUOTATION", intTargetUserId = null) => {
        try {
            const form = new FormData();
            form.append("objFile", file);
            form.append("strKind", strKind);
            form.append("strModule", vchModule);
            if (intTargetUserId) form.append("intTargetUserId", String(intTargetUserId));
            // The api instance defaults to JSON, which would make axios stringify the FormData.
            // multipart/form-data stops that; the browser then adds the boundary itself.
            const response = await api.post("/print-settings/upload-asset", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data.vchUrl;
        } catch (error) {
            const detail = error.response?.data?.detail;
            throw new Error(typeof detail === "string" ? detail : "Failed to upload image");
        }
    },
};

export default printSettingsService;
