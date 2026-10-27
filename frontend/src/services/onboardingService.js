import api from "@/lib/api";

// FastAPI sends a string for our errors and a list for validation errors.
const toMessage = (error, strFallback) => {
    const detail = error.response?.data?.detail;
    return typeof detail === "string" ? detail : strFallback;
};

const onboardingService = {
    // Wizard prefill, trade chips and the dashboard checklist flags
    getState: async () => {
        try {
            const response = await api.post("/onboarding/state");
            return response.data;
        } catch (error) {
            throw new Error(toMessage(error, "Could not load your setup"));
        }
    },

    // Step 1
    saveProfile: async ({ businessName, phone }) => {
        try {
            const response = await api.post("/onboarding/profile", { businessName, phone: phone || null });
            return response.data;
        } catch (error) {
            throw new Error(toMessage(error, "Enter your business name"));
        }
    },

    // Step 2: seeds the catalogue for the trade (safe to repeat)
    selectTrade: async (strTrade) => {
        try {
            const response = await api.post("/onboarding/trade", { strTrade });
            return response.data;
        } catch (error) {
            throw new Error(toMessage(error, "Could not add items for this trade"));
        }
    },

    // Step 3
    uploadLogo: async (file) => {
        try {
            const form = new FormData();
            form.append("objFile", file);
            // The api instance defaults to JSON, which would make axios stringify the FormData.
            const response = await api.post("/onboarding/logo", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            throw new Error(toMessage(error, "Could not upload the logo"));
        }
    },

    // Creates the sample quotation; resolves to { intQuotationId }
    finish: async ({ skipSample = false } = {}) => {
        try {
            // skipSample: the website editor already saved a real quotation, so no "Sample Customer" one.
            const response = await api.post("/onboarding/finish", skipSample ? { blnSkipSample: true } : undefined);
            return response.data;
        } catch (error) {
            throw new Error(toMessage(error, "Something went wrong. Please try again."));
        }
    },
};

export default onboardingService;
