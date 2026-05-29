import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: false,
  cartOpen: false,
  searchOpen: false,
  theme: 'light',
  loading: false,
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    toggleCart: (state) => { state.cartOpen = !state.cartOpen; },
    setCartOpen: (state, action) => { state.cartOpen = action.payload; },
    toggleSearch: (state) => { state.searchOpen = !state.searchOpen; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setNotification: (state, action) => { state.notification = action.payload; },
    clearNotification: (state) => { state.notification = null; },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleCart,
  setCartOpen,
  toggleSearch,
  setLoading,
  setNotification,
  clearNotification,
} = uiSlice.actions;

export default uiSlice.reducer;
