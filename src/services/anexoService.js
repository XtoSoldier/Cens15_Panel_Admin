import { api } from "config/api";

export const anexoService = {
  getAll: () => api.get("/Anexos"),

  getById: (id) => api.get(`/Anexos/${id}`),

  create: (data) => api.post("/Anexos", data),

  update: (id, data) => api.put(`/Anexos/${id}`, data),

  delete: (id) => api.delete(`/Anexos/${id}`),
};

export default anexoService;
