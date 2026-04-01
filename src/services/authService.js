import { api } from "config/api";

const TOKEN_KEY = "token";
const USER_KEY = "currentUser";

export const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const userData = {
      email,
      name: response.name,
      role: response.role,
      token: response.token,
      expiration: response.expiration,
    };
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    return userData;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),

  getCurrentUser: () => {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    return true;
  },
};

export default authService;
