import { api } from "config/api";
import preceptorService from "./preceptorService";

jest.mock("config/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => jest.resetAllMocks());

test.each([
  ["getAll", [], "get", "/Preceptores"],
  ["getOpciones", [], "get", "/Preceptores/opciones"],
  ["getById", [7], "get", "/Preceptores/7"],
  ["delete", [7], "delete", "/Preceptores/7"],
])("%s uses the shared api and returns its response", async (method, args, verb, path) => {
  const response = { fixture: method };
  api[verb].mockResolvedValue(response);
  await expect(preceptorService[method](...args)).resolves.toBe(response);
  expect(api[verb]).toHaveBeenCalledTimes(1);
  expect(api[verb]).toHaveBeenCalledWith(path);
});

test.each([
  ["create", "post", "/Preceptores"],
  ["update", "put", "/Preceptores/7"],
])("%s forwards the body unchanged, including null user and multiple courses", async (method, verb, path) => {
  const body = { nombres: "Persona", apellidos: "Prueba", email: null, userId: null, cursoIds: [11, 12] };
  const response = { id: 7, ...body };
  api[verb].mockResolvedValue(response);
  await expect(preceptorService[method](...(method === "create" ? [body] : [7, body]))).resolves.toBe(response);
  expect(api[verb]).toHaveBeenCalledTimes(1);
  expect(api[verb]).toHaveBeenCalledWith(path, body);
  expect(api[verb].mock.calls[0][1]).toBe(body);
});

test("preserves an empty course assignment and propagates backend errors", async () => {
  const body = { nombres: "Persona", apellidos: "Prueba", email: "prueba@example.invalid", userId: "u1", cursoIds: [] };
  const error = new Error("Asignacion rechazada");
  api.put.mockRejectedValue(error);
  await expect(preceptorService.update(7, body)).rejects.toBe(error);
  expect(api.put).toHaveBeenCalledWith("/Preceptores/7", body);
});
