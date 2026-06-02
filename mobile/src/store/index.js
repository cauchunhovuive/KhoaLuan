import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import productReducer from './productSlice';
import uiReducer from './uiSlice';
import notificationReducer from './notificationSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    products: productReducer,
    ui: uiReducer,
    notifications: notificationReducer,
    settings: settingsReducer,
  },
});
