import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchProducts = createAsyncThunk('products/fetchProducts', async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams(params).toString();
    const { data } = await api.get(`/products?${query}`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchProductDetail = createAsyncThunk('products/fetchDetail', async (slug, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/products/slug/${slug}`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchFlashSales = createAsyncThunk('products/fetchFlashSales', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/flash-sales');
    return data.data || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [], featured: [], flashSales: [],
    product: null, loading: false, error: null,
    pagination: { page: 1, totalPages: 1 },
  },
  reducers: {
    clearProduct: (state) => { state.product = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProductDetail.pending, (state) => { state.loading = true; })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchFlashSales.fulfilled, (state, action) => {
        state.flashSales = action.payload;
      });
  },
});

export const { clearProduct } = productSlice.actions;
export default productSlice.reducer;
