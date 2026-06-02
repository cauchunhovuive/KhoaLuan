import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/settings');
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Không thể tải cài đặt');
    }
  }
);

const initialState = {
  siteName: 'KhoaLuan',
  siteDescription: 'Hệ thống thương mại điện tử thông minh',
  itemsPerPage: 10,
  enableRecommendations: true,
  enableClustering: true,
  freeShippingThreshold: 500000,
  shippingFee: 30000,
  siteContactEmail: '',
  siteContactPhone: '',
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => { state.loading = true; })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        Object.assign(state, action.payload, { loading: false, error: null });
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default settingsSlice.reducer;
