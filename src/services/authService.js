import { api } from "config/api";
import { TOKEN_KEY, USER_KEY, currentToken, expireSession, isTokenValid, notifySession, sessionUser } from "utils/session";

export const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    if (!isTokenValid(response.token)) {
      throw new Error("La API devolvio una sesion invalida o vencida.");
    }
    const userData = {
      email,
      name: response.name,
      role: response.role,
      token: response.token,
      expiration: response.expiration,
    };
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    notifySession("login");
    return userData;
  },

  logout: () => {
    expireSession(localStorage.getItem(TOKEN_KEY), "logout");
  },

  getToken: () => currentToken({ required: true }),

  getCurrentUser: sessionUser,

  isAuthenticated: () => {
    return Boolean(sessionUser());
  },
};

export default authService;
