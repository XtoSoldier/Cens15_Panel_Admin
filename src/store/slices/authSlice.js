import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  currentUser: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.currentUser = action.payload.currentUser;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setAuth, setLoading, setError, clearAuth } = authSlice.actions;

export default authSlice.reducer;
