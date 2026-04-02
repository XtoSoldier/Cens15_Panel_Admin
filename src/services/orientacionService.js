import { api } from "config/api";

export const orientacionService = {
  getAll: () => api.get("/Orientaciones"),

  getById: (id) => api.get(`/Orientaciones/${id}`),

  create: (data) => api.post("/Orientaciones", data),

  update: (id, data) => api.put(`/Orientaciones/${id}`, data),

  delete: (id) => api.delete(`/Orientaciones/${id}`),
};

export default orientacionService;
