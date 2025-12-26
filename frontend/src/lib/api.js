import axios from "axios";


// Create axios instance with base url
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    }
})

//  Request Intersecptor -Runs Before every api call
api.interceptors.request.use(
    (config) => {
        // get token from localStorage
        const strToken = localStorage.getItem('access_token');

        // if toekn exist, add Authorization header
        if (strToken) {
            config.headers.Authorization = `Bearer ${strToken}`;
        }

        return config
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interseptor - Run After every APi Call
api.interceptors.response.use(
    (response) => {
        // success - just return data
        return response
    },
    (error) => {
        // if 401 (UnAuthorized) clear token and redirect to login
        // BUT skip redirect for login endpoint (let it show error message)
        const isLoginEndpoint = error.config?.url?.includes('/auth/login');

        if (error.response?.status === 401 && !isLoginEndpoint) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('user'); // Clean up legacy key
            window.location.href = '/login';
        }
        return Promise.reject(error)
    }
);

export default api;