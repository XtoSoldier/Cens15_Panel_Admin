import { api } from "config/api";

export const docenteService = {
  getAll: () => api.get("/Docentes"),

  getById: (id) => api.get(`/Docentes/${id}`),

  create: (data) => api.post("/Docentes", data),

  update: (id, data) => api.put(`/Docentes/${id}`, data),

  delete: (id) => api.delete(`/Docentes/${id}`),
};

export default docenteService;
