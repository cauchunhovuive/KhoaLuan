import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/cart');
    return data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const addToCart = createAsyncThunk('cart/addToCart', async ({ productId, quantity }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/cart', { productId, quantity });
    return data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const updateCartItem = createAsyncThunk('cart/updateCartItem', async ({ productId, quantity }, { rejectWithValue }) => {
  try {
    await api.put(`/cart/${productId}`, { quantity });
    return { productId, quantity };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const removeFromCart = createAsyncThunk('cart/removeFromCart', async (productId, { rejectWithValue }) => {
  try {
    await api.delete(`/cart/${productId}`);
    return productId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

const initialState = {
  items: [],
  total: 0,
  count: 0,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.count = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.count = action.payload.count;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.count = action.payload.count;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.product.id !== action.payload);
        state.count = state.items.length;
        state.total = state.items.reduce((sum, item) => {
          const price = item.effectivePrice || item.product.discountPrice || item.product.price;
          return sum + price * item.quantity;
        }, 0);
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const item = state.items.find((i) => i.product.id === action.payload.productId);
        if (item) item.quantity = action.payload.quantity;
        state.total = state.items.reduce((sum, item) => {
          const price = item.effectivePrice || item.product.discountPrice || item.product.price;
          return sum + price * item.quantity;
        }, 0);
      });
  },
});

export const { clearCart: clearCartAction } = cartSlice.actions;
export default cartSlice.reducer;
