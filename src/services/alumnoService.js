import { api } from "config/api";

export const alumnoService = {
  getAll: (includeDeleted = false) => api.get("/Alumnos", { params: { includeDeleted } }),
  restore: (id) => api.patch(`/Alumnos/${id}/restore`, null),
};

export default alumnoService;
