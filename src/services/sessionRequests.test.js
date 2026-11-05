import { api, checkApiHealth } from "config/api";
import authService from "./authService";
import checkpointService from "./checkpointService";
import transferenciaService from "./transferenciaService";
import certificadoService from "./certificadoService";

const jwt = (seconds = 60) => `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds })).replace(/=/g, "")}.signature`;
const save = (token) => {
  localStorage.setItem("token", token);
  localStorage.setItem("currentUser", JSON.stringify({ token }));
  return token;
};
const response = (status, data = {}) => ({
  status, ok: status >= 200 && status < 300, statusText: "Failure",
  headers: { get: () => "application/json" }, json: async () => data, text: async () => JSON.stringify(data),
});
const originalFetch = global.fetch;
const originalTimeout = AbortSignal.timeout;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1700000000000);
  localStorage.clear();
  global.fetch = jest.fn();
  AbortSignal.timeout = jest.fn(() => new AbortController().signal);
});
afterEach(() => {
  global.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
  jest.useRealTimers();
});

test("rejects expired credentials before shared or custom authenticated requests", async () => {
  for (const request of [() => api.get("/users"), checkpointService.listar,
    () => transferenciaService.exportar("alumnos"), () => certificadoService.uploadImage(new Blob())]) {
    save(jwt(-1));
    await expect(request()).rejects.toMatchObject({ status: 401 });
    expect(localStorage.length).toBe(0);
  }
  expect(fetch).not.toHaveBeenCalled();
});

test("public login clears stale credentials but keeps the normal invalid-login message", async () => {
  save(jwt(-1));
  fetch.mockResolvedValue(response(401, { message: "Credenciales incorrectas" }));
  await expect(authService.login("user", "wrong")).rejects.toMatchObject({ status: 401, message: "Credenciales incorrectas" });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(localStorage.length).toBe(0);
});

test("a login 401 does not remove a valid existing session", async () => {
  const token = save(jwt());
  fetch.mockResolvedValue(response(401, { message: "Credenciales incorrectas" }));
  await expect(authService.login("user", "wrong")).rejects.toThrow("Credenciales incorrectas");
  expect(localStorage.getItem("token")).toBe(token);
});

test.each([() => "bad", () => jwt(-1), () => `e30.${btoa("{}").replace(/=/g, "")}.signature`])("login never persists invalid returned JWT %#", async (fixture) => {
  const token = fixture();
  fetch.mockResolvedValue(response(200, { token, expiration: "2999-01-01" }));
  await expect(authService.login("user", "password")).rejects.toThrow(/invalida/);
  expect(localStorage.length).toBe(0);
});

test("login persists a valid JWT, ignoring the server's separate expiration date", async () => {
  const token = jwt();
  fetch.mockResolvedValue(response(200, { token, expiration: "2000-01-01", role: "Admin" }));
  await authService.login("user", "password");
  expect(authService.getToken()).toBe(token);
  expect(authService.isAuthenticated()).toBe(true);
});

test.each([401, 403, 500])("shared request preserves HTTP %s status and logs out only on 401", async (status) => {
  const token = save(jwt());
  fetch.mockResolvedValue(response(status, { message: "Denied" }));
  await expect(api.get("/users")).rejects.toMatchObject({ status, message: "Denied" });
  expect(localStorage.getItem("token")).toBe(status === 401 ? null : token);
});

test("network failure does not close the session", async () => {
  const token = save(jwt());
  fetch.mockRejectedValue(new Error("offline"));
  await expect(api.get("/users")).rejects.toThrow("offline");
  expect(localStorage.getItem("token")).toBe(token);
});

test("late shared 401 does not delete a new login", async () => {
  save(jwt());
  let finish;
  fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const pending = api.get("/users");
  const next = save(jwt(120));
  finish(response(401));
  await expect(pending).rejects.toMatchObject({ status: 401 });
  expect(localStorage.getItem("token")).toBe(next);
});

test.each([
  ["checkpoint download", () => checkpointService.exportar("id", "long-password")],
  ["transfer download", () => transferenciaService.exportar("alumnos")],
  ["certificate upload", () => certificadoService.uploadImage(new Blob())],
])("%s clears auth on 401", async (name, request) => {
  save(jwt());
  fetch.mockResolvedValue(response(401));
  await expect(request()).rejects.toThrow();
  expect(localStorage.length).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});

test.each([
  ["checkpoint", () => checkpointService.exportar("id", "long-password")],
  ["transfer", () => transferenciaService.exportar("alumnos")],
  ["certificate", () => certificadoService.uploadImage(new Blob())],
])("late %s 401 preserves a new credential", async (name, request) => {
  save(jwt());
  let finish;
  fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const pending = request();
  const next = save(jwt(120));
  finish(response(401));
  await expect(pending).rejects.toThrow();
  expect(localStorage.getItem("token")).toBe(next);
});

test("health checks remain anonymous and do not log out", async () => {
  const token = save(jwt());
  fetch.mockResolvedValue(response(401));
  expect(await checkApiHealth()).toBe(false);
  await expect(api.get("/health")).rejects.toMatchObject({ status: 401 });
  expect(fetch.mock.calls[0][1].headers).toBeUndefined();
  expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
  expect(localStorage.getItem("token")).toBe(token);
});

test("shared errors retain 409 reports", async () => {
  save(jwt());
  const reporte = { message: "Conflict", errores: ["changed"] };
  fetch.mockResolvedValue(response(409, reporte));
  await expect(api.post("/transferencias/importar", {})).rejects.toMatchObject({ status: 409, reporte, details: reporte });
});
