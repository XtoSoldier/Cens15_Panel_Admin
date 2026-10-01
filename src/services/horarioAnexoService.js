import { api } from "config/api";

const horarioAnexoService = {
  getByAnexo: (id) => api.get(`/anexos/${id}/horarios`),
  save: (id, bloques) => api.put(`/anexos/${id}/horarios`, { bloques }),
};

export default horarioAnexoService;
