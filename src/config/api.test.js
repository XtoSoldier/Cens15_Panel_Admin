const originalEnv = process.env;
const originalFetch = global.fetch;

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  jest.resetModules();
});

const loadConfig = (url) => {
  process.env = { ...originalEnv, REACT_APP_ENV: "intranet", REACT_APP_API_BASE_URL: url };
  return require("./api").config;
};

test("intranet API uses the browser hostname, not the page port", () => {
  jest.spyOn(window, "location", "get").mockReturnValue({ hostname: "192.168.1.50", port: "3000" });
  const config = loadConfig("http://{hostname}:8080/api");
  expect(config.apiBase).toBe("http://192.168.1.50:8080/api");
  expect(config.env).toBe("intranet");
});

test.each(["https://localhost:7000/api", "https://api.cens15.tierradelfuego.edu.ar/api"])(
  "explicit API URL remains unchanged: %s",
  (url) => expect(loadConfig(url).apiBase).toBe(url)
);

test("existing default API URL remains unchanged", () => {
  expect(loadConfig("").apiBase).toBe("https://localhost:7000/api");
});

test("health probe uses an anonymous GET endpoint instead of the login route", async () => {
  loadConfig("http://server.lan:8080/api/");
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
  const signal = new AbortController().signal;
  expect(await require("./api").checkApiHealth(signal)).toBe(true);
  expect(fetch).toHaveBeenCalledWith("http://server.lan:8080/api/health", { method: "GET", cache: "no-store", signal });
});

test("health probe does not mark HTTP errors or unexpected bodies as healthy", async () => {
  loadConfig("http://server.lan:8080/api");
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  const { checkApiHealth } = require("./api");
  expect(await checkApiHealth()).toBe(false);
  fetch.mockResolvedValue({ ok: true, json: async () => ({ status: "failed" }) });
  expect(await checkApiHealth()).toBe(false);
});
