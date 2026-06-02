import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cartOpen: false,
  searchOpen: false,
  loading: false,
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleCart: (state) => { state.cartOpen = !state.cartOpen; },
    setCartOpen: (state, action) => { state.cartOpen = action.payload; },
    toggleSearch: (state) => { state.searchOpen = !state.searchOpen; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setNotification: (state, action) => { state.notification = action.payload; },
    clearNotification: (state) => { state.notification = null; },
  },
});

export const { toggleCart, setCartOpen, toggleSearch, setLoading, setNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
