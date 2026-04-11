import api from "@/lib/api";

const subscriptionService = {
    // Get current subscription status
    getStatus: async () => {
        try {
            const response = await api.get('/subscription/status');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Create Razorpay order
    createOrder: async (intPlanId) => {
        try {
            const response = await api.post('/subscription/create-order', { intPlanId });
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Failed to create order';
            throw new Error(strMessage);
        }
    },

    // Verify payment after Razorpay checkout
    verifyPayment: async (paymentData) => {
        try {
            const response = await api.post('/subscription/verify-payment', paymentData);
            return response.data;
        } catch (error) {
            const strMessage = error.response?.data?.detail || 'Payment verification failed';
            throw new Error(strMessage);
        }
    },
};

export default subscriptionService;
