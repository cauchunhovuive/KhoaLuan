import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchWishlist = createAsyncThunk('wishlist/fetchWishlist', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/wishlist');
    return data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const fetchWishlistIds = createAsyncThunk('wishlist/fetchIds', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/wishlist/ids');
    return data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const addToWishlist = createAsyncThunk('wishlist/add', async (productId, { rejectWithValue }) => {
  try {
    await api.post(`/wishlist/${productId}`);
    return productId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const removeFromWishlist = createAsyncThunk('wishlist/remove', async (productId, { rejectWithValue }) => {
  try {
    await api.delete(`/wishlist/${productId}`);
    return productId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],
    ids: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
      state.ids = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchWishlistIds.fulfilled, (state, action) => {
        state.ids = action.payload;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.ids.push(action.payload);
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.ids = state.ids.filter((id) => id !== action.payload);
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
