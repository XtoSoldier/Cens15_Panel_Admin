import transferenciaService from "./transferenciaService";
import config from "config/api";
import authService from "services/authService";

jest.mock("services/authService", () => ({ getToken: jest.fn(() => "test-token") }));

const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const originalFetch = global.fetch;

beforeEach(() => { global.fetch = jest.fn(); authService.getToken.mockReturnValue("test-token"); });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test("preserves the 409 server report instead of a generic error", async () => {
  const reporte = { seccion: "docentes", puedeImportar: false, errores: ["Huella obsoleta"], resumen: [] };
  fetch.mockResolvedValue(response(409, reporte));
  await expect(transferenciaService.importar({}, "actualizar", "hash", "")).rejects.toMatchObject({ status: 409, reporte });
});

test("uses central resolved API and authenticated GET/POST only", async () => {
  fetch.mockResolvedValue(response(200, {}));
  await transferenciaService.exportar("alumnos");
  expect(fetch).toHaveBeenLastCalledWith(`${config.apiBase}/transferencias/alumnos/exportar`, expect.objectContaining({
    method: "GET", headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
  }));
  const paquete = { seccion: "docentes" };
  await transferenciaService.preview(paquete, "actualizar");
  expect(fetch).toHaveBeenLastCalledWith(`${config.apiBase}/transferencias/preview`, expect.objectContaining({
    method: "POST", body: JSON.stringify({ paquete, modo: "actualizar" }),
  }));
  expect(authService.getToken).toHaveBeenCalled();
});

test.each([
  [400, { message: "Paquete invalido" }, "Paquete invalido"],
  [400, { title: "Error de validacion", errors: { Paquete: ["Campo obligatorio"] } }, "Campo obligatorio"],
  [401, {}, "sesion"], [403, {}, "Admin"], [413, {}, "20 MiB"],
])("explains HTTP %s failures", async (status, data, message) => {
  fetch.mockResolvedValue(response(status, data));
  await expect(transferenciaService.preview({}, "actualizar")).rejects.toThrow(message);
});

test("aborts after 120 seconds rather than the shared 30 second timeout", async () => {
  jest.useFakeTimers();
  fetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")));
  }));
  const pending = transferenciaService.preview({}, "actualizar");
  const assertion = expect(pending).rejects.toThrow("aborted");
  jest.advanceTimersByTime(30000);
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
  jest.advanceTimersByTime(90000);
  await assertion;
  expect(jest.getTimerCount()).toBe(0);
});
