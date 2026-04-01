import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import authReducer from "./slices/authSlice";

const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/setAuth"],
        ignoredPaths: ["auth.currentUser"],
      },
    }),
});

export default store;
