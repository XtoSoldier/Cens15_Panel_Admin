import { api } from "config/api";

export const alumnoService = {
  getAll: (includeDeleted = false) => api.get("/Alumnos", { params: { includeDeleted } }),
  restore: (id) => api.patch(`/Alumnos/${id}/restore`, null),
  getPermanentDeletionInfo: (id) => api.get(`/Alumnos/${id}/permanent-deletion-info`),
  deletePermanently: (id) => api.delete(`/Alumnos/${id}/permanent`),
};

export default alumnoService;
