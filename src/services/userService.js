import { api } from "config/api";

export const userService = {
  getAll: () => api.get("/Users"),

  getById: (id) => api.get(`/Users/${id}`),

  create: (userData) => api.post("/auth/register", userData),

  update: (id, userData) => api.put(`/Users/${id}`, userData),

  updateStatus: (id, status) => api.patch(`/Users/${id}/status`, { status }),

  delete: (id) => api.delete(`/Users/${id}`),
};

export default userService;
