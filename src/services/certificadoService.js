import { api } from "config/api";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://localhost:7000/api";

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

    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/Certificados/subir-imagen`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Error al subir imagen");
    }

    return response.json();
  },
};

export default certificadoService;
