import { configureStore } from '@reduxjs/toolkit';

// Auth slice
const authReducer = (state = { user: null, token: null, isAuthenticated: false, loading: false }, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

// Cart slice
const cartReducer = (state = { items: [], count: 0, total: 0 }, action) => {
  switch (action.type) {
    case 'SET_CART':
      return { ...state, items: action.payload.items, count: action.payload.length, total: action.payload.total || 0 };
    case 'ADD_TO_CART':
      return { ...state, items: [...state.items, action.payload], count: state.count + 1 };
    case 'REMOVE_FROM_CART':
      return { ...state, items: state.items.filter((i) => i.id !== action.payload), count: state.count - 1 };
    case 'CLEAR_CART':
      return { items: [], count: 0, total: 0 };
    default:
      return state;
  }
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
  },
});
