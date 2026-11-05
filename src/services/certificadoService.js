import config, { api } from "config/api";
import { currentToken, handleSessionResponse } from "utils/session";

export const certificadoService = {
  getAll: () => api.get("/Certificados"),

  getById: (id) => api.get(`/Certificados/${id}`),

  renderForAlumno: (id, alumnoId) => api.get(`/Certificados/${id}/render/alumno/${alumnoId}`),

  create: (data) => api.post("/Certificados", data),

  update: (id, data) => api.put(`/Certificados/${id}`, data),

  delete: (id) => api.delete(`/Certificados/${id}`),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const token = currentToken({ required: true });
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${config.apiBase.replace(/\/$/, "")}/Certificados/subir-imagen`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    handleSessionResponse(response, token, url, config.apiBase);

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(text || "Error al subir imagen");
      error.status = response.status;
      throw error;
    }

    return response.json();
  },
};

export default certificadoService;
