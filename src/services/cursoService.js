import { api } from "config/api";

export const cursoService = {
  getAll: () => api.get("/Cursos"),

  getById: (id) => api.get(`/Cursos/${id}`),

  create: (data) => api.post("/Cursos", data),

  update: (id, data) => api.put(`/Cursos/${id}`, data),

  delete: (id) => api.delete(`/Cursos/${id}`),
};

export default cursoService;
