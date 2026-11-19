import { api } from "config/api";
import alumnoService from "./alumnoService";

jest.mock("config/api", () => ({ api: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

test("permanent deletion info uses the student GET route and preserves its payload", async () => {
  const payload = {
    alumnoId: 42,
    puedeEliminar: false,
    dependencias: [{ entidad: "Calificaciones", cantidad: 2 }],
    ordenEliminacion: ["Calificaciones", "CursadasMaterias", "Inscripciones", "AlumnoDocumentos", "AlumnoContactos", "AlumnoNacimientos", "Alumnos"],
    mensaje: "Quedan dependencias",
  };
  api.get.mockResolvedValue(payload);
  await expect(alumnoService.getPermanentDeletionInfo(42)).resolves.toEqual(payload);
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get.mock.calls[0]).toEqual(["/Alumnos/42/permanent-deletion-info"]);
  expect(api.delete).not.toHaveBeenCalled();
});

test("permanent DELETE is bodyless and resolves a 204 response as void", async () => {
  api.delete.mockResolvedValue(undefined);
  await expect(alumnoService.deletePermanently(42)).resolves.toBeUndefined();
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(api.delete.mock.calls[0]).toEqual(["/Alumnos/42/permanent"]);
  expect(api.patch).not.toHaveBeenCalled();
});

test("permanent DELETE propagates the original 409 error and status", async () => {
  const conflict = Object.assign(new Error("Quedan dependencias"), { status: 409 });
  api.delete.mockRejectedValue(conflict);
  await expect(alumnoService.deletePermanently(42)).rejects.toBe(conflict);
  expect(conflict.status).toBe(409);
  expect(api.delete).toHaveBeenCalledTimes(1);
});

test("dependency GET propagates errors rather than assuming deletion is allowed", async () => {
  const error = new Error("No disponible");
  api.get.mockRejectedValue(error);
  await expect(alumnoService.getPermanentDeletionInfo(42)).rejects.toBe(error);
  expect(api.delete).not.toHaveBeenCalled();
});

test.each([[undefined, false], [false, false], [true, true]])("getAll(%s) preserves includeDeleted=%s", async (argument, includeDeleted) => {
  const students = [{ id: 42, eliminado: true }];
  api.get.mockResolvedValue(students);
  await expect(alumnoService.getAll(argument)).resolves.toBe(students);
  expect(api.get).toHaveBeenCalledWith("/Alumnos", { params: { includeDeleted } });
});

test("restore retains its PATCH route with a null body", async () => {
  api.patch.mockResolvedValue(undefined);
  await expect(alumnoService.restore(42)).resolves.toBeUndefined();
  expect(api.patch.mock.calls).toEqual([["/Alumnos/42/restore", null]]);
  expect(api.delete).not.toHaveBeenCalled();
});
