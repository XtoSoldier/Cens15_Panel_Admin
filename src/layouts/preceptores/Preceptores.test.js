import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import theme from "assets/theme";
import uiReducer from "store/slices/uiSlice";
import authReducer from "store/slices/authSlice";
import preceptorService from "services/preceptorService";
import Preceptores from "./index";

jest.mock("services/preceptorService", () => ({
  getAll: jest.fn(), getOpciones: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
}));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("examples/Tables/DataTable", () => ({ table }) => (
  <table><tbody>{table.rows.map((row, index) => (
    <tr key={index}>{table.columns.map(({ accessor }) => <td key={accessor}>{row[accessor]}</td>)}</tr>
  ))}</tbody></table>
));

const cursos = [
  { id: 11, curso: "1", division: "A", anexoNombre: "Anexo prueba", orientacionNombreCorto: "SOC", semipresencial: false },
  { id: 12, curso: "2", division: "B", anexoNombre: "Anexo prueba", orientacionNombreCorto: "ECO", semipresencial: true },
  { id: 13, curso: "3", division: "C", anexoNombre: "Anexo prueba", orientacionNombreCorto: "SOC", semipresencial: false },
];
const usuarios = [
  { id: "u1", firstName: "Cuenta", lastName: "Propia", email: "propia@example.invalid", role: "Preceptor" },
  { id: "u2", firstName: "Cuenta", lastName: "Ocupada", email: "ocupada@example.invalid", role: "preceptor" },
  { id: "u3", firstName: "Cuenta", lastName: "Libre", email: "libre@example.invalid", role: " PRECEPTOR " },
  { id: "u4", firstName: "Cuenta", lastName: "Docente", email: "docente@example.invalid", role: "Docente" },
  { id: "u5", firstName: "Cuenta", lastName: "SinRol", email: "sinrol@example.invalid", role: null },
];
const items = [
  { id: 1, nombres: "Persona", apellidos: "Propia", email: "persona@example.invalid", userId: "u1", cursos: [cursos[0]] },
  { id: 2, nombres: "Persona", apellidos: "Ocupada", email: null, userId: "u2", cursos: [cursos[2]] },
];
let root;
let container;
const button = (text) => Array.from(document.body.querySelectorAll("button"))
  .find((element) => element.textContent === text);
const field = (name) => document.body.querySelector(`input[name="${name}"]`);
const click = async (element) => act(async () => element.click());
const change = async (name, value) => act(async () => Simulate.change(field(name), { target: { name, value } }));
const submit = async () => act(async () => Simulate.submit(document.body.querySelector("form")));
const openSelect = async (name) => act(async () => Simulate.mouseDown(
  field(name).parentElement.querySelector('[role="button"]'), { button: 0 }
));
const option = (prefix) => Array.from(document.body.querySelectorAll('[role="option"]'))
  .find((element) => element.textContent.startsWith(prefix));
const closeMenu = async () => act(async () => {
  Simulate.keyDown(document.body.querySelector('[role="listbox"]'), { key: "Escape" });
  await new Promise((resolve) => setTimeout(resolve, 250));
});
const render = async () => act(async () => root.render(
  <Provider store={configureStore({ reducer: { ui: uiReducer, auth: authReducer } })}>
    <ThemeProvider theme={theme}><Preceptores /></ThemeProvider>
  </Provider>
));
const edit = async () => click(document.body.querySelector('[aria-label="Editar preceptor Propia, Persona"]'));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  preceptorService.getAll.mockResolvedValue(items);
  preceptorService.getOpciones.mockResolvedValue({ usuarios, cursos });
  preceptorService.create.mockResolvedValue({ id: 3 });
  preceptorService.update.mockResolvedValue({ id: 1 });
  preceptorService.delete.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("creates without a user and with multiple courses using real MUI checkboxes", async () => {
  preceptorService.getAll.mockResolvedValue([]);
  await render();
  await click(button("+ Nuevo Preceptor"));
  await change("nombres", "  Alta  ");
  await change("apellidos", "  Prueba  ");
  await openSelect("cursoIds");
  await click(option("1 A"));
  await click(option("2 B"));
  expect(option("1 A").querySelector('input[type="checkbox"]').checked).toBe(true);
  expect(option("2 B").querySelector('input[type="checkbox"]').checked).toBe(true);
  expect(option("2 B").textContent).toContain("Anexo prueba - ECO - Semipresencial");
  await closeMenu();
  await submit();
  expect(preceptorService.create).toHaveBeenCalledTimes(1);
  expect(preceptorService.create).toHaveBeenCalledWith({
    nombres: "Alta", apellidos: "Prueba", email: null, userId: null, cursoIds: [11, 12],
  });
  expect(preceptorService.getAll).toHaveBeenCalledTimes(2);
  expect(preceptorService.getOpciones).toHaveBeenCalledTimes(2);
});

test("offers only unoccupied preceptor users and disables occupied courses with their owner", async () => {
  await render();
  await click(button("+ Nuevo Preceptor"));
  await openSelect("userId");
  expect(Array.from(document.body.querySelectorAll('[role="option"]')).map((element) => element.textContent))
    .toEqual(["Sin usuario vinculado", "Cuenta Libre - libre@example.invalid"]);
  await click(option("Cuenta Libre"));
  await openSelect("cursoIds");
  expect(option("1 A").getAttribute("aria-disabled")).toBe("true");
  expect(option("1 A").textContent).toContain("Asignado a Propia, Persona");
  expect(option("3 C").getAttribute("aria-disabled")).toBe("true");
  expect(option("3 C").textContent).toContain("Asignado a Ocupada, Persona");
  expect(option("2 B").getAttribute("aria-disabled")).not.toBe("true");
  await closeMenu();
  await change("nombres", "Nueva");
  await change("apellidos", "Persona");
  await submit();
  expect(preceptorService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "u3", cursoIds: [] }));
});

test("linked user is the first field and selecting it copies names and email before saving", async () => {
  await render();
  await click(button("+ Nuevo Preceptor"));
  expect(document.body.querySelector('form input[name]').name).toBe("userId");
  await change("nombres", "Nombre manual");
  await change("apellidos", "Apellido manual");
  await change("email", "manual@example.invalid");
  await openSelect("userId");
  await click(option("Cuenta Libre"));
  expect(field("nombres").value).toBe("Cuenta");
  expect(field("apellidos").value).toBe("Libre");
  expect(field("email").value).toBe("libre@example.invalid");
  await submit();
  expect(preceptorService.create).toHaveBeenCalledWith({
    nombres: "Cuenta", apellidos: "Libre", email: "libre@example.invalid", userId: "u3", cursoIds: [],
  });
});

test("switching the linked user refreshes copied data and unlinking keeps it editable", async () => {
  await render();
  await edit();
  await openSelect("userId");
  await click(option("Cuenta Libre"));
  expect(field("nombres").value).toBe("Cuenta");
  expect(field("apellidos").value).toBe("Libre");
  expect(field("email").value).toBe("libre@example.invalid");
  await openSelect("userId");
  await click(option("Sin usuario vinculado"));
  expect(field("nombres").value).toBe("Cuenta");
  expect(field("apellidos").value).toBe("Libre");
  expect(field("email").value).toBe("libre@example.invalid");
  await change("nombres", "Sin cuenta");
  await submit();
  expect(preceptorService.update).toHaveBeenCalledWith(1, {
    nombres: "Sin cuenta", apellidos: "Libre", email: "libre@example.invalid", userId: null, cursoIds: [11],
  });
});

test("selecting a user without email clears any previously entered email", async () => {
  preceptorService.getOpciones.mockResolvedValue({
    usuarios: [...usuarios, { id: "u6", firstName: "Sin", lastName: "Email", email: null, role: "Preceptor" }], cursos,
  });
  await render();
  await click(button("+ Nuevo Preceptor"));
  await change("email", "anterior@example.invalid");
  await openSelect("userId");
  await click(option("Sin Email"));
  expect(field("nombres").value).toBe("Sin");
  expect(field("apellidos").value).toBe("Email");
  expect(field("email").value).toBe("");
  await submit();
  expect(preceptorService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "u6", email: null }));
});

test("editing preserves its own user and courses while excluding other assignments", async () => {
  await render();
  await edit();
  expect(field("nombres").value).toBe("Persona");
  expect(field("apellidos").value).toBe("Propia");
  expect(field("email").value).toBe("persona@example.invalid");
  expect(field("userId").value).toBe("u1");
  await openSelect("userId");
  expect(option("Cuenta Propia").getAttribute("aria-selected")).toBe("true");
  expect(option("Cuenta Ocupada")).toBeUndefined();
  await closeMenu();
  await openSelect("cursoIds");
  expect(option("1 A").getAttribute("aria-disabled")).not.toBe("true");
  expect(option("1 A").querySelector("input").checked).toBe(true);
  expect(option("3 C").getAttribute("aria-disabled")).toBe("true");
  await closeMenu();
  await submit();
  expect(preceptorService.update).toHaveBeenCalledWith(1, {
    nombres: "Persona", apellidos: "Propia", email: "persona@example.invalid", userId: "u1", cursoIds: [11],
  });
  expect(preceptorService.create).not.toHaveBeenCalled();
});

test("editing can clear the linked user and release all its courses", async () => {
  await render();
  await edit();
  await openSelect("userId");
  await click(option("Sin usuario vinculado"));
  await openSelect("cursoIds");
  await click(option("1 A"));
  expect(option("1 A").querySelector("input").checked).toBe(false);
  await closeMenu();
  await submit();
  expect(preceptorService.update).toHaveBeenCalledWith(1, {
    nombres: "Persona", apellidos: "Propia", email: "persona@example.invalid", userId: null, cursoIds: [],
  });
});

test.each(["create", "update"])("%s backend failure preserves the open form, selected values and original list", async (method) => {
  preceptorService[method].mockRejectedValue(new Error("Conflicto de asignacion de prueba"));
  await render();
  if (method === "create") await click(button("+ Nuevo Preceptor"));
  else await edit();
  await change("nombres", "Nombre modificado");
  await change("apellidos", "Apellido modificado");
  await change("email", "modificado@example.invalid");
  await openSelect("cursoIds");
  await click(option("2 B"));
  await closeMenu();
  await submit();
  expect(document.body.querySelector('[role="alert"]').textContent).toContain("Conflicto de asignacion de prueba");
  expect(field("nombres").value).toBe("Nombre modificado");
  expect(field("apellidos").value).toBe("Apellido modificado");
  expect(field("email").value).toBe("modificado@example.invalid");
  expect(field("userId").value).toBe(method === "create" ? "" : "u1");
  expect(field("cursoIds").value).toBe(method === "create" ? "12" : "11,12");
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(container.querySelector("tbody").textContent).not.toContain("Nombre modificado");
  expect(preceptorService.getAll).toHaveBeenCalledTimes(1);
  expect(button("Guardar").disabled).toBe(false);
});

test("requires delete confirmation and keeps the dialog and row visible on permission rejection", async () => {
  preceptorService.delete.mockRejectedValueOnce(new Error("Sin permiso para eliminar (403)"));
  await render();
  await click(document.body.querySelector('[aria-label="Eliminar preceptor Propia, Persona"]'));
  expect(preceptorService.delete).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("Los cursos y el usuario vinculado no se eliminar");
  await click(button("Eliminar"));
  expect(preceptorService.delete).toHaveBeenCalledWith(1);
  expect(document.body.querySelector('[role="alert"]').textContent).toContain("Sin permiso para eliminar (403)");
  expect(button("Eliminar").disabled).toBe(false);
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(preceptorService.getAll).toHaveBeenCalledTimes(1);
  preceptorService.getAll.mockResolvedValue([items[1]]);
  await click(button("Eliminar"));
  expect(preceptorService.delete).toHaveBeenCalledTimes(2);
  expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(container.querySelector("tbody").textContent).not.toContain("Propia");
});

test("cancelling create, edit and delete performs no writes", async () => {
  await render();
  await click(button("+ Nuevo Preceptor"));
  await change("nombres", "No guardar");
  await click(button("Cancelar"));
  await edit();
  await change("apellidos", "No guardar");
  await click(document.body.querySelector('[aria-label="Cerrar formulario de preceptor"]'));
  await click(document.body.querySelector('[aria-label="Eliminar preceptor Propia, Persona"]'));
  await click(button("Cancelar"));
  expect(preceptorService.create).not.toHaveBeenCalled();
  expect(preceptorService.update).not.toHaveBeenCalled();
  expect(preceptorService.delete).not.toHaveBeenCalled();
  expect(preceptorService.getAll).toHaveBeenCalledTimes(1);
});

test("validates required names before attempting a write", async () => {
  await render();
  await click(button("+ Nuevo Preceptor"));
  await change("nombres", "   ");
  await submit();
  expect(document.body.querySelector('[role="alert"]').textContent).toContain("son obligatorios");
  expect(preceptorService.create).not.toHaveBeenCalled();
});

test("blocks duplicate submissions synchronously and disables closing while saving", async () => {
  let resolveSave;
  preceptorService.update.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
  await render();
  await edit();
  await act(async () => {
    const form = document.body.querySelector("form");
    Simulate.submit(form);
    Simulate.submit(form);
  });
  expect(preceptorService.update).toHaveBeenCalledTimes(1);
  expect(button("Guardando...").disabled).toBe(true);
  expect(button("Cancelar").disabled).toBe(true);
  expect(document.body.querySelector('[aria-label="Cerrar formulario de preceptor"]').disabled).toBe(true);
  expect(field("nombres").disabled).toBe(true);
  await act(async () => resolveSave({ id: 1 }));
  expect(preceptorService.getAll).toHaveBeenCalledTimes(2);
  expect(button("+ Nuevo Preceptor").disabled).toBe(false);
});
