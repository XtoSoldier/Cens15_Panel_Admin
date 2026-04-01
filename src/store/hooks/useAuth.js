import { useSelector, useDispatch } from "react-redux";
import { setAuth, clearAuth } from "store/slices/authSlice";

export const useAuth = () => {
  const { isAuthenticated, currentUser, loading, error } = useSelector((state) => state.auth);
  return { isAuthenticated, currentUser, loading, error };
};

export const useAuthDispatch = () => {
  const dispatch = useDispatch();
  return {
    login: (userData) => dispatch(setAuth({ isAuthenticated: true, currentUser: userData })),
    logout: () => dispatch(clearAuth()),
  };
};
