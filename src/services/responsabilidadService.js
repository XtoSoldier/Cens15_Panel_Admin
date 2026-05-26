import { api } from "config/api";

export const responsabilidadService = {
  getAll: () => api.get("/Responsibilities"),

  getById: (id) => api.get(`/Responsibilities/${id}`),

  create: (data) => api.post("/Responsibilities", data),

  update: (id, data) => api.put(`/Responsibilities/${id}`),

  delete: (id) => api.delete(`/Responsibilities/${id}`),
};

export default responsabilidadService;
