import { api } from "config/api";

export const userService = {
  getAll: () => api.get("/Users"),

  getById: (id) => api.get(`/Users/${id}`),

  create: (userData) => api.post("/Users", userData),

  update: (id, userData) => api.put(`/Users/${id}`, userData),

  delete: (id) => api.delete(`/Users/${id}`),
};

export default userService;
