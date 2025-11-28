import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/Config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  },
  timeout: 30000, // Increase timeout to 30 seconds for ngrok
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    console.log('Base URL:', config.baseURL);
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error logging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Send OTP to phone number with email
  sendOTP: async (phone: string, email: string) => {
    const response = await api.post('/auth/send-otp', { phone, email });
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (phone: string, otp: string, email: string) => {
    const response = await api.post('/auth/verify-otp', { phone, otp, email });
    if (response.data.data?.token) {
      await AsyncStorage.setItem('authToken', response.data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data.data;
  },

  // Register new user
  register: async (data: { phone: string; name: string; email?: string }) => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  },

  // Get current user profile from backend
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data.data.user;
  },

  // Get current user from storage
  getCurrentUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if logged in
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  },
};

export default api;
