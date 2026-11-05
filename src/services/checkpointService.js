import config from "config/api";
import authService from "services/authService";
import { handleSessionResponse } from "utils/session";

export function validarClave(clave) {
  if (typeof clave !== "string" || clave.length < 12) {
    throw new Error("La clave debe tener al menos 12 caracteres.");
  }
}

async function request(path = "", body, binary = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);
  const multipart = body instanceof FormData;
  try {
    const token = authService.getToken();
    const url = `${config.apiBase.replace(/\/$/, "")}/checkpoints${path}`;
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      headers: {
        Accept: binary ? "application/octet-stream" : "application/json",
        ...(body !== undefined && !multipart ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: multipart ? body : body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    handleSessionResponse(response, token, url, config.apiBase);
    if (response.ok && binary) {
      const disposition = response.headers?.get("Content-Disposition") || "";
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plain = disposition.match(/filename="?([^";]+)"?/i);
      let filename = "cens15-respaldo.censbackup";
      try {
        filename = encoded ? decodeURIComponent(encoded[1]) : plain?.[1] || filename;
      } catch { /* Use the safe fallback for malformed response metadata. */ }
      filename = filename.split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, "");
      if (!filename.endsWith(".censbackup")) filename = "cens15-respaldo.censbackup";
      return { blob: await response.blob(), filename };
    }
    let data;
    try { data = await response.json(); } catch {
      if (response.ok) throw new Error("La API no devolvio una respuesta JSON valida.");
    }
    if (!response.ok) {
      const details = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
      let message = data?.message || [data?.title, details].filter(Boolean).join(" ") || `Error HTTP ${response.status}.`;
      if (response.status === 401) message = "La sesion vencio. Inicie sesion nuevamente.";
      if (response.status === 403) message = "Solo el rol Admin puede administrar respaldos completos.";
      if (response.status === 413) message = "El respaldo supera el limite de carga del servidor.";
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

const checkpointService = {
  listar: () => request(),
  crear: (nombre, descripcion) => request("", { nombre, descripcion }),
  importar: (archivo, clave) => {
    validarClave(clave);
    if (!archivo || !/\.censbackup$/i.test(archivo.name)) throw new Error("Seleccione un archivo .censbackup.");
    const form = new FormData();
    form.append("archivo", archivo);
    form.append("clave", clave);
    return request("/importar", form);
  },
  exportar: (id, clave) => {
    validarClave(clave);
    return request(`/${encodeURIComponent(id)}/exportar`, { clave }, true);
  },
  preview: (id) => request(`/${encodeURIComponent(id)}/preview`, {}),
  restaurar: (id, options) => request(`/${encodeURIComponent(id)}/restaurar`, options),
};

export default checkpointService;
