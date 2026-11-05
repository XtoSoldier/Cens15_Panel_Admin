import { filtrarCheckpoints, puedeRestaurar, previewValido } from "./checkpointHelpers";

const preview = { checkpointId: "one", puedeRestaurar: true, huella: "hash", errores: [] };
test("requires matching checkpoint, valid fresh preview, exact text and explicit backup decline", () => {
  expect(puedeRestaurar(preview, "one", "RESTAURAR TODO", true, false)).toBe(true);
  expect(puedeRestaurar(preview, "one", "RESTAURAR TODO", false, true)).toBe(true);
  expect(puedeRestaurar(preview, "one", "RESTAURAR TODO", false, false)).toBe(false);
  expect(puedeRestaurar(preview, "one", "restaurar todo", true, false)).toBe(false);
  expect(previewValido(preview, "two")).toBe(false);
  [null, { ...preview, huella: "" }, { ...preview, errores: ["error"] }, { ...preview, errores: undefined }, { ...preview, puedeRestaurar: false }]
    .forEach((value) => expect(previewValido(value, "one")).toBe(false));
});

test("filters inclusive local calendar dates and names, sorting newest first without mutating input", () => {
  const items = [
    { id: "old", nombre: "Punto viejo", creadoEn: new Date(2026, 9, 20, 0, 0).toISOString() },
    { id: "new", nombre: "Punto nuevo", creadoEn: new Date(2026, 9, 21, 23, 59).toISOString() },
  ];
  expect(filtrarCheckpoints(items, "PUNTO", "2026-10-20", "2026-10-21").map((x) => x.id)).toEqual(["new", "old"]);
  expect(filtrarCheckpoints(items, "nuevo", "2026-10-21", "2026-10-21").map((x) => x.id)).toEqual(["new"]);
  expect(items[0].id).toBe("old");
});
