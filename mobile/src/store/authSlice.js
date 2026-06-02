import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', data.data.token);
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Đăng nhập thất bại');
  }
});

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    await AsyncStorage.setItem('token', data.data.token);
    await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Đăng ký thất bại');
  }
});

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token');
    const { data } = await api.get('/auth/me');
    return { user: data.data, token };
  } catch {
    await AsyncStorage.multiRemove(['token', 'refreshToken']);
    return rejectWithValue('Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null, isAuthenticated: false, loading: false, error: null },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      AsyncStorage.multiRemove(['token', 'refreshToken']);
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
