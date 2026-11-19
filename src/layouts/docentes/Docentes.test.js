import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import theme from "assets/theme";
import uiReducer from "store/slices/uiSlice";
import authReducer from "store/slices/authSlice";
import docenteService from "services/docenteService";
import userService from "services/userService";
import Docentes from "./index";

jest.mock("services/docenteService", () => ({ getAll: jest.fn(), create: jest.fn(), update: jest.fn() }));
jest.mock("services/userService", () => ({ getAll: jest.fn() }));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("examples/Tables/DataTable", () => ({ table }) => (
  <div>{table.rows.map((row, index) => <div key={index}>{row.actions}</div>)}</div>
));

const users = [
  { id: "u1", firstName: "Ana", lastName: "L\u00f3pez", email: "ana@example.invalid" },
  { id: "u2", firstName: "Juan", lastName: "P\u00e9rez", email: "matematica@example.invalid" },
  { id: "u3", firstName: "Maria", lastName: "Rios", email: "ocupada@example.invalid" },
];
const docentes = [
  { id: 1, nombres: "Nombre guardado", apellidos: "Apellido guardado", email: "personal@example.invalid", userId: "u1" },
  { id: 2, nombres: "Otra", apellidos: "Docente", email: null, userId: "u3" },
];
let container;
let root;
const button = (text) => Array.from(document.body.querySelectorAll("button")).find((item) => item.textContent === text);
const combo = () => document.body.querySelector('input[role="combobox"]');
const field = (name) => document.body.querySelector(`input[name="${name}"]`);
const options = () => Array.from(document.body.querySelectorAll('[role="option"]'));
const click = async (element) => act(async () => element.click());
const search = async (value) => act(async () => {
  combo().focus();
  Simulate.change(combo(), { target: { value } });
});
const render = async () => act(async () => root.render(
  <Provider store={configureStore({ reducer: { ui: uiReducer, auth: authReducer } })}>
    <ThemeProvider theme={theme}><Docentes /></ThemeProvider>
  </Provider>
));
const edit = async () => { await render(); await click(button("edit")); };

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  docenteService.getAll.mockResolvedValue(docentes);
  userService.getAll.mockResolvedValue(users);
  docenteService.update.mockResolvedValue(undefined);
  docenteService.create.mockResolvedValue({ id: 3 });
  jest.spyOn(window, "confirm").mockReturnValue(true);
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

test.each([
  ["LOPEZ", "Ana"], ["jUaN", "Juan"], ["matematica@", "Juan"],
])("filters linked users by typed name, accent-insensitive surname or email: %s", async (query, name) => {
  await edit();
  expect(combo().value).toContain("ana@example.invalid");
  await search(query);
  expect(options()).toHaveLength(1);
  expect(options()[0].textContent).toContain(name);
  expect(field("nombres").value).toBe("Nombre guardado");
  expect(docenteService.update).not.toHaveBeenCalled();
});

test("selecting a search result keeps the confirmation and copies the chosen user's data", async () => {
  await edit();
  await search("matematica");
  await click(options()[0]);
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(combo().value).toContain("matematica@example.invalid");
  expect(field("nombres").value).toBe("Juan");
  expect(field("apellidos").value).toBe("P\u00e9rez");
  expect(field("email").value).toBe("matematica@example.invalid");
  await click(button("Guardar"));
  expect(docenteService.update).toHaveBeenCalledWith(1, {
    nombres: "Juan", apellidos: "P\u00e9rez", email: "matematica@example.invalid", userId: "u2",
  });
});

test("cancelling replacement restores the previous label and retains the original linked user", async () => {
  window.confirm.mockReturnValue(false);
  await edit();
  await search("Juan");
  await click(options()[0]);
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(combo().value).toContain("ana@example.invalid");
  expect(field("nombres").value).toBe("Nombre guardado");
  await click(button("Guardar"));
  expect(docenteService.update).toHaveBeenCalledWith(1, expect.objectContaining({ userId: "u1", nombres: "Nombre guardado" }));
});

test("clear unlinks the user without clearing the teacher's personal data", async () => {
  await edit();
  await click(document.body.querySelector('button[title="Desvincular usuario"]'));
  expect(combo().value).toBe("");
  expect(field("nombres").value).toBe("Nombre guardado");
  expect(field("email").value).toBe("personal@example.invalid");
  await click(button("Guardar"));
  expect(docenteService.update).toHaveBeenCalledWith(1, {
    nombres: "Nombre guardado", apellidos: "Apellido guardado", email: "personal@example.invalid",
  });
});

test("users linked to other teachers stay excluded and unmatched typing does not replace the current link", async () => {
  await edit();
  await search("ocupada");
  expect(options()).toHaveLength(0);
  expect(document.body.textContent).toContain("No se encontraron usuarios");
  await click(button("Guardar"));
  expect(docenteService.update).toHaveBeenCalledWith(1, expect.objectContaining({ userId: "u1" }));
});

test("new teacher also supports typed search and selecting a result without replacement confirmation", async () => {
  await render();
  await click(button("+ Nuevo Docente"));
  await search("Juan");
  await click(options()[0]);
  expect(window.confirm).not.toHaveBeenCalled();
  await click(button("Guardar"));
  expect(docenteService.create).toHaveBeenCalledWith({
    nombres: "Juan", apellidos: "P\u00e9rez", email: "matematica@example.invalid", userId: "u2",
  });
});
