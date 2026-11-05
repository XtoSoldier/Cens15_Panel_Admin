export const RESTORE_TEXT = "RESTAURAR TODO";

export function previewValido(preview, id) {
  return Boolean(id && preview?.checkpointId === id && preview.puedeRestaurar === true
    && preview.huella && Array.isArray(preview.errores) && preview.errores.length === 0);
}

export function puedeRestaurar(preview, id, texto, respaldo, aceptar) {
  return previewValido(preview, id) && texto === RESTORE_TEXT && (respaldo || aceptar);
}

export function filtrarCheckpoints(items, nombre, desde, hasta) {
  return items.filter((item) => {
    const fecha = new Date(item.creadoEn);
    const local = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    return (!nombre || (item.nombre || "").toLocaleLowerCase().includes(nombre.toLocaleLowerCase()))
      && (!desde || local >= desde) && (!hasta || local <= hasta);
  }).sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn));
}

export function descargarCheckpoint({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
