import { api } from "config/api";

export const materiaService = {
  getAll: () => api.get("/Materias"),

  getById: (id) => api.get(`/Materias/${id}`),

  create: (data) => api.post("/Materias", data),

  update: (id, data) => api.put(`/Materias/${id}`, data),

  delete: (id) => api.delete(`/Materias/${id}`),
};

export default materiaService;
