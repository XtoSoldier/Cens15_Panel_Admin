import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import theme from "assets/theme";
import uiReducer from "store/slices/uiSlice";
import authReducer, { setAuth } from "store/slices/authSlice";
import alumnoService from "services/alumnoService";
import Alumnos from "./index";

jest.mock("services/alumnoService", () => ({
  getAll: jest.fn(),
  restore: jest.fn(),
  getPermanentDeletionInfo: jest.fn(),
  deletePermanently: jest.fn(),
}));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("examples/Tables/DataTable", () => ({ table }) => (
  <div data-testid="alumnos">
    {table.rows.map((row, index) => (
      <div data-testid="alumno" key={index}>
        {row.apellidos}{row.nombres}{row.dni}{row.estado}{row.actions}
      </div>
    ))}
  </div>
));

const alumnos = [
  { id: 11, apellidos: "Perez", nombres: "Ana", numeroDocumento: "30111222", eliminado: false },
  { id: 22, apellidos: "Lopez", nombres: "Luis", numeroDocumento: "32444555", eliminado: true },
  { id: 33, apellidos: "Diaz", nombres: "Eva", numeroDocumento: "34666777", eliminado: false },
];
const ordenEliminacion = [
  "Calificaciones", "CursadasMaterias", "Inscripciones", "AlumnoDocumentos",
  "AlumnoContactos", "AlumnoNacimientos", "Alumnos",
];
const info = (alumnoId = 11, puedeEliminar = true, dependencias = []) => ({
  alumnoId, puedeEliminar, dependencias, ordenEliminacion, mensaje: "Verificacion de dependencias",
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
let root;
let container;
let store;
const dialog = () => document.body.querySelector('[role="dialog"]');
const button = (text, scope = document.body) =>
  Array.from(scope.querySelectorAll("button")).find((item) => item.textContent.trim() === text);
const rowAction = (name = "Perez, Ana") =>
  container.querySelector(`button[aria-label="Eliminar definitivamente a ${name}"]`);
const confirmButton = () => button("Eliminar definitivamente", dialog());
const click = async (element) => act(async () => element.click());
const typeConfirmation = async (value) => act(async () => {
  Simulate.change(dialog().querySelector("input"), { target: { value } });
});
const escape = async () => act(async () => {
  Simulate.keyDown(dialog(), { key: "Escape", keyCode: 27 });
});
const finishTransition = async () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 250));
});
const mount = async (role = "Admin") => {
  store = configureStore({ reducer: { ui: uiReducer, auth: authReducer } });
  if (role !== null) store.dispatch(setAuth({ isAuthenticated: true, currentUser: { role } }));
  await act(async () => root.render(
    <Provider store={store}><ThemeProvider theme={theme}><Alumnos /></ThemeProvider></Provider>
  ));
};
const open = async (name) => {
  await mount();
  await click(rowAction(name));
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  alumnoService.getAll.mockResolvedValue(alumnos);
  alumnoService.restore.mockResolvedValue(undefined);
  alumnoService.getPermanentDeletionInfo.mockImplementation((id) => Promise.resolve(info(id)));
  alumnoService.deletePermanently.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test.each(["Admin", "SuperAdmin"])("%s can delete active and logically deleted students", async (role) => {
  await mount(role);
  expect(alumnoService.getAll).toHaveBeenCalledWith(true);
  expect(rowAction()).not.toBeNull();
  expect(rowAction("Lopez, Luis")).not.toBeNull();
  expect(button("restore\u00a0 Restaurar", container)).toBeDefined();
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test.each(["Docente", null])("role %s has no permanent deletion or restore action", async (role) => {
  await mount(role);
  expect(alumnoService.getAll).toHaveBeenCalledWith(false);
  expect(container.querySelectorAll('button[aria-label^="Eliminar definitivamente"]')).toHaveLength(0);
  expect(container.textContent).not.toContain("Restaurar");
  expect(alumnoService.getPermanentDeletionInfo).not.toHaveBeenCalled();
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test("opening warns with identity and checks dependencies without deleting", async () => {
  const check = deferred();
  alumnoService.getPermanentDeletionInfo.mockReturnValue(check.promise);
  await open();
  expect(dialog().textContent).toContain("Perez, Ana");
  expect(dialog().textContent).toContain("DNI 30111222");
  expect(dialog().textContent).toContain("irreversible");
  expect(dialog().textContent).toContain("no podr\u00e1 restaurarse");
  expect(dialog().textContent).toContain("Verificando dependencias");
  expect(confirmButton().disabled).toBe(true);
  expect(alumnoService.getPermanentDeletionInfo).toHaveBeenCalledWith(11);
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
  await act(async () => check.resolve(info()));
  expect(confirmButton().disabled).toBe(true);
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test("confirmation requires allowed dependencies and the exact word ELIMINAR", async () => {
  await open();
  for (const value of ["", "eliminar", "ELIMINA", " ELIMINAR", "ELIMINAR "]) {
    await typeConfirmation(value);
    expect(confirmButton().disabled).toBe(true);
    await click(confirmButton());
  }
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
  await typeConfirmation("ELIMINAR");
  expect(confirmButton().disabled).toBe(false);
  await click(confirmButton());
  expect(alumnoService.deletePermanently).toHaveBeenCalledTimes(1);
  expect(alumnoService.deletePermanently).toHaveBeenCalledWith(11);
});

test("blocked deletion lists only positive counts, child-first order and profile blockers even for a logical deletion", async () => {
  alumnoService.getPermanentDeletionInfo.mockResolvedValue(info(22, false, [
    { entidad: "Calificaciones", cantidad: 4 },
    { entidad: "CursadasMaterias", cantidad: 2 },
    { entidad: "Inscripciones", cantidad: 0 },
    { entidad: "AlumnoDocumentos", cantidad: 1 },
    { entidad: "AlumnoContactos", cantidad: 1 },
    { entidad: "AlumnoNacimientos", cantidad: 1 },
  ]));
  await open("Lopez, Luis");
  expect(Array.from(dialog().querySelectorAll("li"), (item) => item.textContent)).toEqual([
    "Calificaciones: 4", "Cursadas de materias: 2", "Documentos del alumno: 1",
    "Datos de contacto: 1", "Datos de nacimiento: 1",
  ]);
  expect(dialog().textContent).toContain("Calificaciones > Cursadas de materias > Inscripciones > Documentos del alumno > Datos de contacto > Datos de nacimiento > Alumno");
  expect(dialog().textContent).toContain("incluso si el alumno tiene baja l\u00f3gica");
  expect(dialog().textContent).toContain("Vaciar sus campos no elimina esos registros");
  expect(dialog().querySelector("input")).toBeNull();
  expect(confirmButton().disabled).toBe(true);
  await click(confirmButton());
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test("rechecking fetches fresh dependencies and requires confirmation again", async () => {
  await open();
  await typeConfirmation("ELIMINAR");
  const check = deferred();
  alumnoService.getPermanentDeletionInfo.mockReturnValueOnce(check.promise);
  await click(button("Volver a verificar", dialog()));
  expect(confirmButton().disabled).toBe(true);
  expect(dialog().querySelector("input")).toBeNull();
  expect(alumnoService.getPermanentDeletionInfo).toHaveBeenNthCalledWith(2, 11);
  await act(async () => check.resolve(info()));
  expect(dialog().querySelector("input").value).toBe("");
  expect(confirmButton().disabled).toBe(true);
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test.each(["Cancelar", "Escape"])("%s dismisses without deleting", async (action) => {
  await open();
  await typeConfirmation("ELIMINAR");
  if (action === "Escape") await escape();
  else await click(button(action, dialog()));
  await finishTransition();
  expect(dialog()).toBeNull();
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
  expect(container.querySelectorAll('[data-testid="alumno"]')).toHaveLength(3);
});

test("failed dependency GET fails closed and can be explicitly retried", async () => {
  alumnoService.getPermanentDeletionInfo.mockRejectedValueOnce(new Error("No se pudo verificar"));
  await open();
  expect(dialog().textContent).toContain("No se pudo verificar");
  expect(confirmButton().disabled).toBe(true);
  expect(dialog().querySelector("input")).toBeNull();
  await click(confirmButton());
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
  await click(button("Volver a verificar", dialog()));
  expect(alumnoService.getPermanentDeletionInfo).toHaveBeenCalledTimes(2);
  expect(dialog().textContent).not.toContain("No se pudo verificar");
  expect(confirmButton().disabled).toBe(true);
});

test("a cancelled student's late GET cannot enable another student's deletion", async () => {
  const first = deferred();
  const second = deferred();
  alumnoService.getPermanentDeletionInfo.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  await open();
  await click(button("Cancelar", dialog()));
  await finishTransition();
  await click(rowAction("Lopez, Luis"));
  await act(async () => first.resolve(info(11, true)));
  expect(dialog().textContent).toContain("Lopez, Luis");
  expect(dialog().textContent).toContain("Verificando dependencias");
  expect(dialog().querySelector("input")).toBeNull();
  expect(confirmButton().disabled).toBe(true);
  await act(async () => second.resolve(info(22, false, [{ entidad: "Inscripciones", cantidad: 1 }])));
  expect(dialog().textContent).toContain("Inscripciones: 1");
  expect(confirmButton().disabled).toBe(true);
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test("DELETE 409 clears confirmation and refreshes the newly blocking dependencies", async () => {
  alumnoService.deletePermanently.mockRejectedValueOnce(Object.assign(new Error("Conflicto de dependencias"), { status: 409 }));
  await open();
  await typeConfirmation("ELIMINAR");
  const check = deferred();
  alumnoService.getPermanentDeletionInfo.mockReturnValueOnce(check.promise);
  await click(confirmButton());
  expect(alumnoService.getPermanentDeletionInfo).toHaveBeenNthCalledWith(2, 11);
  expect(dialog().textContent).toContain("Conflicto de dependencias");
  expect(dialog().querySelector("input")).toBeNull();
  expect(button("Eliminando...", dialog()).disabled).toBe(true);
  await act(async () => check.resolve(info(11, false, [{ entidad: "AlumnoDocumentos", cantidad: 1 }])));
  expect(dialog().textContent).toContain("Documentos del alumno: 1");
  expect(confirmButton().disabled).toBe(true);
  await click(button("Volver a verificar", dialog()));
  expect(dialog().querySelector("input").value).toBe("");
  expect(confirmButton().disabled).toBe(true);
  expect(alumnoService.deletePermanently).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('[data-testid="alumno"]')).toHaveLength(3);
});

test("a non-conflict DELETE error keeps the row and fails closed", async () => {
  alumnoService.deletePermanently.mockRejectedValueOnce(new Error("Servicio no disponible"));
  await open();
  await typeConfirmation("ELIMINAR");
  await click(confirmButton());
  expect(dialog().textContent).toContain("Servicio no disponible");
  expect(dialog().querySelector("input")).toBeNull();
  expect(confirmButton().disabled).toBe(true);
  expect(alumnoService.getPermanentDeletionInfo).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('[data-testid="alumno"]')).toHaveLength(3);
});

test("pending DELETE blocks same-tick double clicks, cancellation and Escape; success removes only its row", async () => {
  const deletion = deferred();
  alumnoService.deletePermanently.mockReturnValue(deletion.promise);
  await open();
  await typeConfirmation("ELIMINAR");
  await act(async () => {
    const confirm = confirmButton();
    Simulate.click(confirm);
    Simulate.click(confirm);
  });
  expect(alumnoService.deletePermanently).toHaveBeenCalledTimes(1);
  expect(button("Eliminando...", dialog()).disabled).toBe(true);
  expect(button("Cancelar", dialog()).disabled).toBe(true);
  expect(button("Volver a verificar", dialog()).disabled).toBe(true);
  expect(dialog().querySelector("input").disabled).toBe(true);
  await click(button("Cancelar", dialog()));
  await escape();
  expect(dialog()).not.toBeNull();
  expect(dialog().textContent).toContain("Perez, Ana");
  await act(async () => deletion.resolve(undefined));
  await finishTransition();
  expect(dialog()).toBeNull();
  expect(rowAction()).toBeNull();
  expect(rowAction("Lopez, Luis")).not.toBeNull();
  expect(rowAction("Diaz, Eva")).not.toBeNull();
  expect(container.querySelectorAll('[data-testid="alumno"]')).toHaveLength(2);
  expect(container.textContent).toContain("32444555");
  expect(container.textContent).toContain("34666777");
  expect(alumnoService.getAll).toHaveBeenCalledTimes(1);
  expect(alumnoService.restore).not.toHaveBeenCalled();
});

test("restoring a logical deletion remains a separate action", async () => {
  await mount();
  const restore = Array.from(container.querySelectorAll("button")).find((item) => item.textContent.includes("Restaurar"));
  await click(restore);
  expect(dialog().textContent).toContain("Restaurar alumno");
  expect(dialog().textContent).toContain("Lopez, Luis");
  expect(alumnoService.restore).not.toHaveBeenCalled();
  await click(button("Restaurar", dialog()));
  expect(alumnoService.restore).toHaveBeenCalledWith(22);
  expect(alumnoService.getAll).toHaveBeenCalledTimes(2);
  expect(alumnoService.getAll).toHaveBeenLastCalledWith(true);
  expect(alumnoService.getPermanentDeletionInfo).not.toHaveBeenCalled();
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});

test("revoking the admin role closes the modal and removes destructive actions", async () => {
  await open();
  await typeConfirmation("ELIMINAR");
  await act(async () => store.dispatch(setAuth({ isAuthenticated: true, currentUser: { role: "Docente" } })));
  await finishTransition();
  expect(dialog()).toBeNull();
  expect(rowAction()).toBeNull();
  expect(alumnoService.getAll).toHaveBeenLastCalledWith(false);
  expect(alumnoService.deletePermanently).not.toHaveBeenCalled();
});
