import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import theme from "assets/theme";
import Transferencias from "./index";
import { LISTAS } from "./transferencia";
import transferenciaService from "services/transferenciaService";

jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("./Checkpoints", () => () => null);
jest.mock("services/transferenciaService", () => ({ exportar: jest.fn(), preview: jest.fn(), importar: jest.fn() }));

let container;
let root;
const paquete = {
  formato: "cens15-transferencia", version: 1, seccion: "docentes", exportadoEn: "2026-10-26T12:00:00Z",
  datos: { ...Object.fromEntries(LISTAS.map((lista) => [lista, []])), usuarios: [], roles: [], responsabilidades: [] },
};
const report = {
  seccion: "docentes", modo: "actualizar", puedeImportar: true, huella: "hash", importado: false,
  resumen: [{ entidad: "docentes", crear: 2, actualizar: 1, eliminar: 0 }, { entidad: "prerrequisito", crear: 1, actualizar: 0, eliminar: 0 }],
  errores: [], advertencias: ["Advertencia canonica del servidor"],
};
const button = (text) => Array.from(document.body.querySelectorAll("button")).find((item) => item.textContent === text);
const click = async (text) => act(async () => button(text).click());
const change = async (selector, value) => act(async () => {
  Simulate.change(document.body.querySelector(selector), { target: { value } });
});
const upload = async (data = paquete) => act(async () => {
  Simulate.change(container.querySelector('input[type="file"]'), {
    target: { files: [{ name: "origen.json", size: 100, text: async () => JSON.stringify(data) }], value: "origen.json" },
  });
});
const render = async (role = "Admin") => {
  const store = configureStore({ reducer: { auth: () => ({ currentUser: { role } }) } });
  await act(async () => root.render(<Provider store={store}><ThemeProvider theme={theme}><Transferencias /></ThemeProvider></Provider>));
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  transferenciaService.preview.mockResolvedValue(report);
  transferenciaService.importar.mockResolvedValue({ ...report, importado: true });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("non-admin sees only an access warning and makes no requests", async () => {
  await render("Docente");
  expect(container.textContent).toContain("Solo el rol Admin");
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(transferenciaService.preview).not.toHaveBeenCalled();
  expect(transferenciaService.exportar).not.toHaveBeenCalled();
});

test("offers all eight sections and distinguishes portable profiles from complete snapshots", async () => {
  await render();
  ["docentes", "materias", "horarios", "alumnos", "usuarios", "roles", "responsabilidades", "cursos"].forEach((section) => {
    expect(button(`Exportar ${section}`)).toBeDefined();
    expect(container.querySelector(`#transfer-section option[value="${section}"]`)).not.toBeNull();
  });
  expect(container.textContent).toContain("no es un respaldo completo");
  expect(container.textContent).toContain("Los usuarios nuevos necesitan primer acceso");
  expect(container.textContent).toContain("No incluye inscripciones");
});

test("security imports requiring reauthentication block further operations and offer a new login", async () => {
  transferenciaService.importar.mockResolvedValue({ ...report, importado: true, requiereReingreso: true });
  await render(); await upload(); await click("Generar vista previa"); await click("Revisar importacion");
  await click("Confirmar importacion");
  expect(container.textContent).toContain("invalidaron las sesiones anteriores");
  expect(button("Volver a iniciar sesion")).toBeDefined();
  expect(button("Exportar docentes").disabled).toBe(true);
  expect(button("Generar vista previa").disabled).toBe(true);
});

test("explicit preview and confirmation are required; success clears the payload but retains report", async () => {
  await render();
  expect(container.textContent).toContain("DESTINO ACTUAL");
  expect(container.textContent).toContain("No incluye inscripciones");
  await upload();
  expect(transferenciaService.preview).not.toHaveBeenCalled();
  expect(button("Revisar importacion").disabled).toBe(true);
  await click("Generar vista previa");
  expect(container.textContent).toContain("prerrequisito");
  expect(container.textContent).toContain("Advertencia canonica del servidor");
  expect(transferenciaService.importar).not.toHaveBeenCalled();
  await click("Revisar importacion");
  expect(document.body.querySelector('[role="dialog"]').textContent).toContain("Modo: actualizar");
  await click("Confirmar importacion");
  expect(transferenciaService.importar).toHaveBeenCalledWith(paquete, "actualizar", "hash", "");
  expect(container.textContent).toContain("Importacion completada");
  expect(button("Generar vista previa").disabled).toBe(true);
  expect(button("Revisar importacion").disabled).toBe(true);
});

test("mode, file and section changes invalidate the preview; mismatching files never preview", async () => {
  await render();
  await upload();
  await click("Generar vista previa");
  await upload();
  expect(button("Revisar importacion").disabled).toBe(true);
  await click("Generar vista previa");
  await change("#transfer-mode", "reemplazar");
  expect(button("Revisar importacion").disabled).toBe(true);
  expect(container.querySelector("table")).toBeNull();
  await change("#transfer-section", "alumnos");
  expect(button("Generar vista previa").disabled).toBe(true);
  await upload();
  expect(container.textContent).toContain("debe coincidir");
  expect(button("Generar vista previa").disabled).toBe(true);
});

test("replace is global and requires exact typed confirmation which resets on reopening", async () => {
  await render();
  await upload();
  await change("#transfer-mode", "reemplazar");
  transferenciaService.preview.mockResolvedValue({ ...report, modo: "reemplazar" });
  await click("Generar vista previa");
  await click("Revisar importacion");
  expect(document.body.querySelector('[role="dialog"]').textContent).toContain("GLOBAL");
  expect(button("Confirmar importacion").disabled).toBe(true);
  await change('[role="dialog"] input', "reemplazar");
  expect(button("Confirmar importacion").disabled).toBe(true);
  await change('[role="dialog"] input', "REEMPLAZAR");
  expect(button("Confirmar importacion").disabled).toBe(false);
  await click("Cancelar");
  await click("Revisar importacion");
  expect(document.body.querySelector('[role="dialog"] input').value).toBe("");
  await change('[role="dialog"] input', "REEMPLAZAR");
  await click("Confirmar importacion");
  expect(transferenciaService.importar).toHaveBeenCalledWith(paquete, "reemplazar", "hash", "REEMPLAZAR");
});

test("invalid previews show partial counts and server errors but block import", async () => {
  transferenciaService.preview.mockResolvedValue({ ...report, puedeImportar: false, errores: ["Relacion protegida"] });
  await render(); await upload(); await click("Generar vista previa");
  expect(container.textContent).toContain("conteos pueden ser parciales");
  expect(container.textContent).toContain("Relacion protegida");
  expect(button("Revisar importacion").disabled).toBe(true);
});

test.each([409, "network"])("failed import %s requires fresh preview and never claims no writes", async (failure) => {
  const error = failure === 409
    ? Object.assign(new Error("Conflicto"), { status: 409, reporte: { ...report, errores: ["Destino modificado"], puedeImportar: false } })
    : new Error("Failed to fetch");
  transferenciaService.importar.mockRejectedValue(error);
  await render(); await upload(); await click("Generar vista previa"); await click("Revisar importacion");
  await click("Confirmar importacion");
  expect(button("Revisar importacion").disabled).toBe(true);
  expect(button("Generar vista previa").disabled).toBe(false);
  expect(container.textContent).toContain(failure === 409 ? "Destino modificado" : "No se pudo confirmar el resultado");
});

test("pending preview disables changes and suppresses repeat requests", async () => {
  let resolve;
  transferenciaService.preview.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await render(); await upload(); await click("Generar vista previa");
  expect(container.querySelector("#transfer-section").disabled).toBe(true);
  expect(container.querySelector("#transfer-mode").disabled).toBe(true);
  expect(container.querySelector('input[type="file"]').disabled).toBe(true);
  await click("Generar vista previa");
  expect(transferenciaService.preview).toHaveBeenCalledTimes(1);
  await act(async () => resolve(report));
  expect(button("Revisar importacion").disabled).toBe(false);
});
