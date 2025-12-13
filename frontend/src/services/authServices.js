import api from "@/lib/api";

const authService = {
    // Login function
    login: async (strEmail, strPassword) => {
        try {
            const response = await api.post('/auth/login', {
                "email":strEmail,
                "password":strPassword
            });

            // Response structure from  backend:
            // {
            //   strAccessToken: "...",
            //   strTokentype: "bearer",
            //   dctUserInfo: {...}
            // 
            return response.data
        } catch (error) {
            // Extract erro from backend response
            const strMessage = error.response?.data?.detail || 'Login Failed'
            throw new Error(strMessage);

        }
    },

    // Logout function
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    },

    // Get Current User
    getCurrentUser: () => {
        const UserInfo = localStorage.getItem('user');
        return UserInfo ? JSON.parse(UserInfo) : null;
    },

    // check if user is logggedin
    isAuthenticated: () => { 
        return !!localStorage.getItem('access_token');
    }
};

export default authService

