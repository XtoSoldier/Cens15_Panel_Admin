import config from "config/api";
import authService from "services/authService";
import { handleSessionResponse } from "utils/session";
import { serializarSolicitud, SECCIONES } from "layouts/transferencias/transferencia";

async function request(endpoint, body) {
  const serialized = body ? serializarSolicitud(body) : undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const token = authService.getToken();
    const url = `${config.apiBase.replace(/\/$/, "")}/transferencias/${endpoint}`;
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: serialized,
      signal: controller.signal,
    });
    handleSessionResponse(response, token, url, config.apiBase);
    let data;
    try {
      data = await response.json();
    } catch {
      if (response.ok) throw new Error("La API no devolvio una respuesta JSON valida.");
    }
    if (!response.ok) {
      const details = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
      let message = data?.message || [data?.title, details].filter(Boolean).join(" ") || `Error HTTP ${response.status}.`;
      if (response.status === 401) message = "La sesion vencio. Inicie sesion nuevamente.";
      if (response.status === 403) message = "Solo el rol Admin puede realizar transferencias.";
      if (response.status === 413) message = "La solicitud supera el limite de 20 MiB.";
      const error = new Error(message);
      error.status = response.status;
      if (response.status === 409) error.reporte = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

const transferenciaService = {
  exportar: (seccion) => {
    if (!Object.prototype.hasOwnProperty.call(SECCIONES, seccion)) throw new Error("Seccion no valida.");
    return request(`${seccion}/exportar`);
  },
  preview: (paquete, modo) => request("preview", { paquete, modo }),
  importar: (paquete, modo, huella, confirmacion) => request("importar", { paquete, modo, huella, confirmacion }),
};

export default transferenciaService;
