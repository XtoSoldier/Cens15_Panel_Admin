import {
  LISTAS, LISTAS_OPCIONALES, MAX_FILE_BYTES, leerPaquete, puedeConfirmar, serializarSolicitud, validarPaquete,
} from "./transferencia";

const paquete = () => ({
  formato: "cens15-transferencia", version: 1, seccion: "docentes",
  exportadoEn: "2026-10-26T12:00:00Z",
  datos: Object.fromEntries(LISTAS.map((lista) => [lista, []])),
});

test("accepts all eight empty lists without requiring optional metadata", () => {
  const data = paquete();
  expect(validarPaquete(data, "docentes")).toMatchObject(data);
  LISTAS_OPCIONALES.forEach((lista) => expect(validarPaquete(data, "docentes").datos[lista]).toEqual([]));
});

test.each(["usuarios", "roles", "responsabilidades"])("optional %s accepts arrays but rejects present non-arrays", (lista) => {
  const data = paquete();
  data.datos[lista] = [];
  expect(validarPaquete(data, "docentes")).toMatchObject(data);
  [null, {}, ""].forEach((value) => {
    data.datos[lista] = value;
    expect(() => validarPaquete(data, "docentes")).toThrow(/opcional/);
  });
});

test.each(["usuarios", "roles", "responsabilidades", "cursos"])("accepts new section %s with a V1 envelope", (seccion) => {
  const data = { ...paquete(), seccion };
  expect(validarPaquete(data, seccion)).toMatchObject(data);
});

test.each([
  ["version", 2], ["formato", "otro"], ["seccion", "otro"], ["exportadoEn", "no fecha"],
])("rejects invalid %s", (key, value) => {
  expect(() => validarPaquete({ ...paquete(), [key]: value }, "docentes")).toThrow();
});

test("rejects section mismatch and missing or null arrays", () => {
  expect(() => validarPaquete(paquete(), "alumnos")).toThrow(/coincidir/);
  LISTAS.forEach((lista) => {
    const data = paquete();
    delete data.datos[lista];
    expect(() => validarPaquete(data, "docentes")).toThrow(/ocho listas/);
    data.datos[lista] = null;
    expect(() => validarPaquete(data, "docentes")).toThrow(/ocho listas/);
  });
});

test("checks file size before reading and rejects malformed JSON", async () => {
  const text = jest.fn();
  await expect(leerPaquete({ size: MAX_FILE_BYTES + 1, text }, "docentes")).rejects.toThrow(/limite/);
  expect(text).not.toHaveBeenCalled();
  await expect(leerPaquete({ size: 10, text: async () => "{" }, "docentes")).rejects.toThrow(/JSON valido/);
  await expect(leerPaquete({ size: 100, text: async () => JSON.stringify(paquete()) }, "docentes")).resolves.toEqual(validarPaquete(paquete(), "docentes"));
});

test("checks UTF-8 bytes of the complete request, not character count", () => {
  expect(serializarSolicitud({ modo: "actualizar" })).toBe('{"modo":"actualizar"}');
  expect(() => serializarSolicitud({ texto: "\u00e1".repeat(11 * 1024 * 1024) })).toThrow(/20 MiB/);
});

test("only a matching valid preview with fingerprint permits import", () => {
  const report = { seccion: "docentes", modo: "actualizar", puedeImportar: true, errores: [], huella: "hash", importado: false };
  expect(puedeConfirmar(paquete(), report, "docentes", "actualizar")).toBe(true);
  [null, { ...report, huella: "" }, { ...report, errores: ["conflicto"] },
    { ...report, puedeImportar: false }, { ...report, importado: true },
    { ...report, seccion: "alumnos" }, { ...report, modo: "reemplazar" },
  ].forEach((invalid) => expect(puedeConfirmar(paquete(), invalid, "docentes", "actualizar")).toBe(false));
  expect(puedeConfirmar(null, report, "docentes", "actualizar")).toBe(false);
});
