import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import theme from "assets/theme";
import Checkpoints from "./Checkpoints";
import Transferencias from "./index";
import checkpointService from "services/checkpointService";
import transferenciaService from "services/transferenciaService";
import authService from "services/authService";
import authReducer from "store/slices/authSlice";
import { descargarCheckpoint } from "./checkpointHelpers";

jest.mock("services/checkpointService", () => ({
  listar: jest.fn(), crear: jest.fn(), importar: jest.fn(), exportar: jest.fn(), preview: jest.fn(), restaurar: jest.fn(),
}));
jest.mock("./checkpointHelpers", () => ({ ...jest.requireActual("./checkpointHelpers"), descargarCheckpoint: jest.fn() }));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("services/transferenciaService", () => ({ exportar: jest.fn(), preview: jest.fn(), importar: jest.fn() }));
jest.mock("services/authService", () => ({ logout: jest.fn(), getToken: jest.fn() }));

const punto = { id: "one", nombre: "Punto completo", creadoEn: "2026-10-26T12:00:00Z", tablas: [{ entidad: "Usuarios", cantidad: 2 }], cantidadArchivos: 3, tamanoBytes: 1024 };
const segundo = { ...punto, id: "two", nombre: "Otro punto", creadoEn: "2026-10-25T12:00:00Z" };
const report = { checkpointId: "one", nombre: punto.nombre, creadoEn: punto.creadoEn, puedeRestaurar: true, huella: "hash", tablas: [{ entidad: "Usuarios", actual: 5, snapshot: 2 }], archivosActuales: 8, archivosSnapshot: 3, advertencias: ["Advertencia del servidor"], errores: [] };
const clave = "una-clave-segura";
let root;
let container;
let onBusyChange;
const button = (text) => Array.from(document.body.querySelectorAll("button")).find((node) => node.textContent === text);
const click = async (text) => act(async () => button(text).click());
const change = async (selector, value) => act(async () => Simulate.change(document.body.querySelector(selector), { target: { value } }));
const toggleBackup = async () => act(async () => document.body.querySelector('[role="dialog"] input[type="checkbox"]').click());
const previewAndOpen = async () => { await click("Vista previa / Restaurar"); await click("Revisar restauracion completa"); };
const render = async ({ role = "Admin", disabled = false, page = false } = {}) => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: {
    auth: { currentUser: { role }, isAuthenticated: true, loading: false, error: null },
  } });
  await act(async () => root.render(<Provider store={store}><ThemeProvider theme={theme}>
    {page ? <Transferencias /> : <Checkpoints disabled={disabled} onBusyChange={onBusyChange} />}
  </ThemeProvider></Provider>));
  return store;
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  checkpointService.listar.mockResolvedValue([punto, segundo]);
  checkpointService.preview.mockResolvedValue(report);
  checkpointService.crear.mockResolvedValue(punto);
  checkpointService.importar.mockResolvedValue(punto);
  checkpointService.restaurar.mockResolvedValue({ restaurado: true, requiereReingreso: true, respaldoPrevioId: "backup-previo", mensaje: "Restaurado por el servidor" });
  onBusyChange = jest.fn();
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT; });

test("non-admin cannot see checkpoints or make list requests", async () => {
  await render({ role: "Docente" });
  expect(container.textContent).toBe("");
  expect(checkpointService.listar).not.toHaveBeenCalled();
});

test("explains complete snapshots versus JSON, secrets, schema and account changes", async () => {
  await render();
  ["NO es el JSON por seccion", "credenciales bcrypt", "historiales", "bajas logicas", "claves JWT", "no revierte migraciones", "GLOBALMENTE", "cuentas y credenciales del snapshot"].forEach((text) => expect(container.textContent).toContain(text));
  expect(container.textContent).toContain("Usuarios: 2");
  expect(container.textContent).toContain("Archivos: 3");
});

test("export all captures first, then requires 12 characters and clears the password on send", async () => {
  await render();
  await click("Exportar todo");
  expect(checkpointService.crear).toHaveBeenCalledWith("Respaldo completo", "");
  expect(checkpointService.exportar).not.toHaveBeenCalled();
  expect(button("Descargar cifrado").disabled).toBe(true);
  await change("#checkpoint-export-password", "short");
  expect(button("Descargar cifrado").disabled).toBe(true);
  await change("#checkpoint-export-password", clave);
  await click("Descargar cifrado");
  expect(checkpointService.exportar).toHaveBeenCalledWith("one", clave);
  expect(descargarCheckpoint).toHaveBeenCalledTimes(1);
});

test("import only registers an encrypted archive, never previews or restores automatically", async () => {
  await render();
  const file = new File(["encrypted"], "respaldo.censbackup");
  await act(async () => Simulate.change(container.querySelector("#checkpoint-file"), { target: { files: [file], value: "file" } }));
  await change("#checkpoint-import-password", "short");
  expect(button("Registrar respaldo sin restaurar").disabled).toBe(true);
  await change("#checkpoint-import-password", clave);
  await click("Registrar respaldo sin restaurar");
  expect(checkpointService.importar).toHaveBeenCalledWith(file, clave);
  expect(checkpointService.preview).not.toHaveBeenCalled();
  expect(checkpointService.restaurar).not.toHaveBeenCalled();
  expect(container.textContent).toContain("NO se modifico la base de datos");
  expect(container.querySelector("#checkpoint-import-password").value).toBe("");
});

test("backup defaults checked; declining requires a second explicit acknowledgement and exact text", async () => {
  await render(); await previewAndOpen();
  expect(document.body.querySelector('[role="dialog"] input[type="checkbox"]').checked).toBe(true);
  expect(button("Confirmar restauracion").disabled).toBe(true);
  await change("#checkpoint-confirm", "restaurar todo");
  expect(button("Confirmar restauracion").disabled).toBe(true);
  await change("#checkpoint-confirm", "RESTAURAR TODO");
  expect(button("Confirmar restauracion").disabled).toBe(false);
  await toggleBackup();
  expect(button("Confirmar restauracion").disabled).toBe(true);
  await act(async () => document.body.querySelectorAll('[role="dialog"] input[type="checkbox"]')[1].click());
  expect(button("Confirmar restauracion").disabled).toBe(false);
  await click("Confirmar restauracion");
  expect(checkpointService.restaurar).toHaveBeenCalledWith("one", { huella: "hash", confirmacion: "RESTAURAR TODO", crearRespaldo: false, aceptarSinRespaldo: true });
});

test("cancel/reopen resets typed confirmation, backup and acknowledgement", async () => {
  await render(); await previewAndOpen();
  await change("#checkpoint-confirm", "RESTAURAR TODO"); await toggleBackup();
  await click("Cancelar restauracion"); await click("Revisar restauracion completa");
  expect(document.body.querySelector("#checkpoint-confirm").value).toBe("");
  expect(document.body.querySelectorAll('[role="dialog"] input[type="checkbox"]').length).toBe(1);
  expect(document.body.querySelector('[role="dialog"] input[type="checkbox"]').checked).toBe(true);
});

test("default backup is sent and success does not refetch with an invalid token", async () => {
  await render(); await previewAndOpen(); await change("#checkpoint-confirm", "RESTAURAR TODO");
  await click("Confirmar restauracion");
  expect(checkpointService.restaurar).toHaveBeenCalledWith("one", { huella: "hash", confirmacion: "RESTAURAR TODO", crearRespaldo: true, aceptarSinRespaldo: false });
  expect(checkpointService.listar).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Restaurado por el servidor");
  expect(container.textContent).toContain("backup-previo");
  expect(button("Volver a iniciar sesion")).toBeDefined();
  expect(button("Exportar todo").disabled).toBe(true);
  expect(onBusyChange).toHaveBeenLastCalledWith(true);
});

test("login action clears local auth and Redux and navigates home", async () => {
  const store = await render(); await previewAndOpen(); await change("#checkpoint-confirm", "RESTAURAR TODO");
  await click("Confirmar restauracion");
  const descriptor = Object.getOwnPropertyDescriptor(window, "location");
  const assign = jest.fn();
  Object.defineProperty(window, "location", { configurable: true, value: { assign } });
  try {
    await click("Volver a iniciar sesion");
    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.currentUser).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(assign).toHaveBeenCalledWith("/");
  } finally { Object.defineProperty(window, "location", descriptor); }
});

test.each([
  { ...report, checkpointId: "two" }, { ...report, puedeRestaurar: false },
  { ...report, errores: ["Esquema incompatible"] }, { ...report, huella: "" },
])("invalid or mismatching checkpoint preview blocks restoration %#", async (data) => {
  checkpointService.preview.mockResolvedValue(data);
  await render(); await click("Vista previa / Restaurar");
  expect(button("Revisar restauracion completa").disabled).toBe(true);
  expect(checkpointService.restaurar).not.toHaveBeenCalled();
});

test.each([409, 400, "network"])("restore failure %s retains warnings and requires a fresh preview", async (failure) => {
  checkpointService.restaurar.mockRejectedValue(failure === "network" ? new Error("Failed to fetch") : Object.assign(new Error("Fallo del respaldo previo"), {
    status: failure, reporte: { advertencias: ["Advertencia del conflicto"], errores: ["Destino modificado"] },
  }));
  await render(); await previewAndOpen(); await change("#checkpoint-confirm", "RESTAURAR TODO");
  await click("Confirmar restauracion");
  expect(button("Revisar restauracion completa").disabled).toBe(true);
  expect(container.textContent).toContain("Advertencia del servidor");
  expect(container.textContent).toContain(failure === "network" ? "Verifique el destino" : "Genere una nueva vista previa");
  if (failure !== "network") expect(container.textContent).toContain("Advertencia del conflicto");
  expect(checkpointService.restaurar).toHaveBeenCalledTimes(1);
  await click("Vista previa / Restaurar"); await click("Revisar restauracion completa");
  expect(document.body.querySelector("#checkpoint-confirm").value).toBe("");
  expect(document.body.querySelector('[role="dialog"] input[type="checkbox"]').checked).toBe(true);
});

test("choosing a different point or archive clears confirmation and requires its own preview", async () => {
  await render(); await previewAndOpen(); await change("#checkpoint-confirm", "RESTAURAR TODO");
  await toggleBackup(); await click("Cancelar restauracion");
  checkpointService.preview.mockResolvedValue({ ...report, checkpointId: "two", nombre: "Otro punto" });
  await act(async () => Array.from(container.querySelectorAll("button")).filter((node) => node.textContent === "Vista previa / Restaurar")[1].click());
  await click("Revisar restauracion completa");
  expect(document.body.querySelector("#checkpoint-confirm").value).toBe("");
  expect(document.body.querySelector('[role="dialog"] input[type="checkbox"]').checked).toBe(true);
  await click("Cancelar restauracion");
  await act(async () => Simulate.change(container.querySelector("#checkpoint-file"), { target: { files: [new File(["x"], "nuevo.censbackup")], value: "" } }));
  expect(button("Revisar restauracion completa")).toBeUndefined();
});

test("pending capture locks section controls as well as snapshots and suppresses duplicate clicks", async () => {
  let resolve;
  checkpointService.crear.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await render({ page: true }); await click("Exportar todo");
  expect(container.querySelector("#transfer-section").disabled).toBe(true);
  expect(container.querySelector("#transfer-file").disabled).toBe(true);
  expect(button("Exportar usuarios").disabled).toBe(true);
  await click("Exportar todo"); await click("Exportar usuarios");
  expect(checkpointService.crear).toHaveBeenCalledTimes(1);
  expect(transferenciaService.exportar).not.toHaveBeenCalled();
  await act(async () => resolve(punto));
  expect(container.querySelector("#transfer-section").disabled).toBe(false);
});

test("external disabled state blocks checkpoint actions", async () => {
  await render({ disabled: true });
  expect(button("Exportar todo").disabled).toBe(true);
  expect(container.querySelector("#checkpoint-file").disabled).toBe(true);
  await click("Exportar todo");
  expect(checkpointService.crear).not.toHaveBeenCalled();
});

test("pending restore blocks all section transfers until login, without silent retries", async () => {
  let resolve;
  checkpointService.restaurar.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await render({ page: true }); await previewAndOpen(); await change("#checkpoint-confirm", "RESTAURAR TODO");
  await click("Confirmar restauracion");
  expect(button("Exportar usuarios").disabled).toBe(true);
  expect(container.querySelector("#transfer-file").disabled).toBe(true);
  expect(button("Exportar todo").disabled).toBe(true);
  await click("Exportar usuarios");
  expect(transferenciaService.exportar).not.toHaveBeenCalled();
  expect(checkpointService.restaurar).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ restaurado: true, requiereReingreso: true, mensaje: "Listo" }));
  expect(button("Exportar usuarios").disabled).toBe(true);
  expect(checkpointService.listar).toHaveBeenCalledTimes(1);
});
