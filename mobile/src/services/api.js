import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          await AsyncStorage.setItem('token', data.data.token);
          await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.data.token}`;
          return api(error.config);
        } catch { /* silent */ }
      }
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
    }
    return Promise.reject(error);
  }
);

export default api;
