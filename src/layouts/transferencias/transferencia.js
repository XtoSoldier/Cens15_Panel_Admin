export const MAX_BODY_BYTES = 20 * 1024 * 1024;
export const MAX_FILE_BYTES = MAX_BODY_BYTES - 4096;
export const SECCIONES = {
  docentes: "Nombres, apellidos y email de docentes.",
  materias: "Materias, carga horaria y docencias; incluye los prerrequisitos necesarios.",
  horarios: "Grillas base y asignaciones; incluye materias y sus prerrequisitos.",
  alumnos: "Solo ficha personal de alumnos activos, contacto y nacimiento.",
  usuarios: "Perfiles de usuarios (email, nombres, apellidos, activo y rol). Sin contrasenas ni sesiones; los nuevos usuarios necesitan primer acceso.",
  roles: "Roles y nombres de sus responsabilidades.",
  responsabilidades: "Nombres y descripciones de responsabilidades.",
  cursos: "Cursos; incluye anexos y orientaciones como prerrequisitos.",
};
export const LISTAS = [
  "docentes", "anexos", "orientaciones", "cursos", "materias", "bloques", "asignaciones", "alumnos",
];
export const LISTAS_OPCIONALES = ["usuarios", "roles", "responsabilidades"];
export const ALUMNOS_WARNING = "Alumnos: solo ficha personal activa, contacto y nacimiento. No incluye inscripciones, cursadas, calificaciones, documentos, imagenes, certificados ni historial academico. Se conserva el historial existente del destino.";
export const REPLACE_WARNING = "El reemplazo es GLOBAL para la seccion seleccionada, no solo para un anexo o curso. Los registros ausentes pueden eliminarse (en alumnos, darse de baja). Un archivo vacio representa una seccion vacia. El servidor bloquea operaciones que ocultarian o eliminarian registros relacionados protegidos. Descargue un respaldo del destino antes de continuar.";

export function validarPaquete(paquete, seccion) {
  if (!paquete || paquete.formato !== "cens15-transferencia" || paquete.version !== 1) {
    throw new Error("Formato o version de transferencia no compatible. Se requiere version 1.");
  }
  if (!Object.prototype.hasOwnProperty.call(SECCIONES, paquete.seccion)) {
    throw new Error("La seccion del archivo no es valida.");
  }
  if (paquete.seccion !== seccion) throw new Error("La seccion seleccionada debe coincidir con el archivo.");
  if (typeof paquete.exportadoEn !== "string" || !Number.isFinite(Date.parse(paquete.exportadoEn))) {
    throw new Error("El archivo no contiene una fecha de exportacion valida.");
  }
  if (!paquete.datos || LISTAS.some((lista) => !Array.isArray(paquete.datos[lista]))) {
    throw new Error("El archivo debe incluir las ocho listas de datos, aunque esten vacias.");
  }
  LISTAS_OPCIONALES.forEach((lista) => {
    if (Object.prototype.hasOwnProperty.call(paquete.datos, lista) && !Array.isArray(paquete.datos[lista])) {
      throw new Error(`La lista opcional ${lista} debe ser un arreglo.`);
    }
  });
  return { ...paquete, datos: { usuarios: [], roles: [], responsabilidades: [], ...paquete.datos } };
}

export function serializarSolicitud(body) {
  const text = JSON.stringify(body);
  if (new Blob([text]).size > MAX_BODY_BYTES) {
    throw new Error("La solicitud supera el limite de 20 MiB. Use un archivo mas pequeno.");
  }
  return text;
}

export async function leerPaquete(file, seccion) {
  if (file.size > MAX_FILE_BYTES) throw new Error("El archivo supera el limite de 20 MiB menos 4096 bytes.");
  let paquete;
  try {
    paquete = JSON.parse(await file.text());
  } catch {
    throw new Error("El archivo no contiene JSON valido.");
  }
  return validarPaquete(paquete, seccion);
}

export function puedeConfirmar(paquete, reporte, seccion, modo) {
  return Boolean(paquete && paquete.seccion === seccion && reporte?.puedeImportar
    && !reporte.importado && reporte.seccion === seccion && reporte.modo === modo
    && reporte.huella && Array.isArray(reporte.errores) && reporte.errores.length === 0);
}
