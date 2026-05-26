import { api } from "config/api";

export const rolService = {
  getAll: () => api.get("/Roles"),

  getById: (id) => api.get(`/Roles/${id}`),

  create: (data) => api.post("/Roles", data),

  update: (id, data) => api.put(`/Roles/${id}`, data),

  delete: (id) => api.delete(`/Roles/${id}`),
};

export default rolService;
