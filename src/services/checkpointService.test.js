import checkpointService from "./checkpointService";
import config from "config/api";
import authService from "services/authService";

jest.mock("services/authService", () => ({ getToken: jest.fn(() => "test-token") }));
const originalFetch = global.fetch;
const clave = "una-clave-segura";
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
beforeEach(() => { global.fetch = jest.fn(); authService.getToken.mockReturnValue("test-token"); });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test("uses resolved base, authenticated GET and exact JSON POST contracts", async () => {
  fetch.mockResolvedValue(response(200, []));
  await checkpointService.listar();
  expect(fetch).toHaveBeenLastCalledWith(`${config.apiBase}/checkpoints`, expect.objectContaining({
    method: "GET", cache: "no-store", headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
  }));
  await checkpointService.crear("Punto", "Descripcion");
  expect(fetch.mock.calls[1][1].body).toBe(JSON.stringify({ nombre: "Punto", descripcion: "Descripcion" }));
  await checkpointService.preview("a/b");
  expect(fetch).toHaveBeenLastCalledWith(`${config.apiBase}/checkpoints/a%2Fb/preview`, expect.objectContaining({ method: "POST", body: "{}" }));
  const options = { huella: "hash", confirmacion: "RESTAURAR TODO", crearRespaldo: true, aceptarSinRespaldo: false };
  await checkpointService.restaurar("one", options);
  expect(fetch).toHaveBeenLastCalledWith(`${config.apiBase}/checkpoints/one/restaurar`, expect.objectContaining({ body: JSON.stringify(options) }));
});

test("downloads encrypted binary with server filename and password only in POST body", async () => {
  const blob = new Blob(["encrypted"], { type: "application/octet-stream" });
  fetch.mockResolvedValue({ ok: true, headers: { get: () => 'attachment; filename="punto.censbackup"' }, blob: async () => blob });
  await expect(checkpointService.exportar("one", clave)).resolves.toEqual({ blob, filename: "punto.censbackup" });
  expect(fetch).toHaveBeenCalledWith(`${config.apiBase}/checkpoints/one/exportar`, expect.objectContaining({
    method: "POST", body: JSON.stringify({ clave }), headers: expect.objectContaining({ Accept: "application/octet-stream", "Content-Type": "application/json" }),
  }));
  expect(fetch.mock.calls[0][0]).not.toContain(clave);
});

test("imports FormData without manually setting Content-Type and never calls restore", async () => {
  fetch.mockResolvedValue(response(200, { id: "imported" }));
  const file = new File(["encrypted"], "punto.censbackup");
  await checkpointService.importar(file, clave);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe(`${config.apiBase}/checkpoints/importar`);
  expect(options.body).toBeInstanceOf(FormData);
  expect(options.body.get("archivo")).toBe(file);
  expect(options.body.get("clave")).toBe(clave);
  expect(options.headers["Content-Type"]).toBeUndefined();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("rejects weak passwords or wrong archive type without sending requests", () => {
  expect(() => checkpointService.exportar("one", "short")).toThrow(/12/);
  expect(() => checkpointService.importar(new File(["{}"], "file.json"), clave)).toThrow(/censbackup/);
  expect(() => checkpointService.importar(new File([""], "file.censbackup"), "short")).toThrow(/12/);
  expect(fetch).not.toHaveBeenCalled();
});

test("retains the full 409 report", async () => {
  const reporte = { message: "Destino modificado", errores: ["Huella obsoleta"], advertencias: ["Revise copia"] };
  fetch.mockResolvedValue(response(409, reporte));
  await expect(checkpointService.restaurar("one", {})).rejects.toMatchObject({ status: 409, reporte, message: "Destino modificado" });
});

test.each([[400, "Invalido"], [401, "sesion"], [403, "Admin"], [413, "limite"]])("handles HTTP %s", async (status, message) => {
  fetch.mockResolvedValue(response(status, { message: "Invalido" }));
  await expect(checkpointService.listar()).rejects.toThrow(message);
});

test("aborts large operations at 300 seconds and clears the timer", async () => {
  jest.useFakeTimers();
  fetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")));
  }));
  const pending = checkpointService.listar();
  const assertion = expect(pending).rejects.toThrow("aborted");
  jest.advanceTimersByTime(120000);
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
  jest.advanceTimersByTime(180000);
  await assertion;
  expect(jest.getTimerCount()).toBe(0);
});
