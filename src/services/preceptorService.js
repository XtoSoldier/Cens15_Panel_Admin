import { api } from "config/api";

const preceptorService = {
  getAll: () => api.get("/Preceptores"),
  getOpciones: () => api.get("/Preceptores/opciones"),
  getById: (id) => api.get(`/Preceptores/${id}`),
  create: (data) => api.post("/Preceptores", data),
  update: (id, data) => api.put(`/Preceptores/${id}`, data),
  delete: (id) => api.delete(`/Preceptores/${id}`),
};

export default preceptorService;
