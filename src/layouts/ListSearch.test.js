import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import theme from "assets/theme";
import uiReducer from "store/slices/uiSlice";
import authReducer from "store/slices/authSlice";
import userService from "services/userService";
import docenteService from "services/docenteService";
import Tables from "./tables";
import Docentes from "./docentes";

jest.mock("services/userService", () => ({ getAll: jest.fn() }));
jest.mock("services/docenteService", () => ({ getAll: jest.fn() }));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("components/StatusModal", () => () => null);
// The table's unused built-in search requires a legacy runtime in Jest.
jest.mock("react-table", () => ({ ...jest.requireActual("react-table"), useAsyncDebounce: (callback) => callback }));

let root;
let container;
const users = [
  { id: "jose", firstName: "Jos\u00e9", lastName: "L\u00f3pez", email: "jlopez@example.invalid", role: "Preceptor", status: true },
  ...Array.from({ length: 11 }, (_, i) => ({ id: `u${i}`, firstName: `Cuenta ${i}`, lastName: "Otra", role: "Docente", status: true })),
];
const docentes = [
  { id: 1, nombres: "Jos\u00e9", apellidos: "L\u00f3pez", email: "jlopez@example.invalid", userId: "jose",
    materias: [{ materiaId: 1, materia: "Matem\u00e1tica", curso: "3", division: "D", rol: "Titular" }] },
  ...Array.from({ length: 11 }, (_, i) => ({ id: i + 2, nombres: `Persona ${i}`, apellidos: "Otro", materias: null })),
];
const rows = () => Array.from(container.querySelectorAll("tbody tr"));
const button = (label) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);
const search = async (value) => act(async () => {
  Simulate.change(container.querySelector('input[type="search"]'), { target: { value } });
});
const mount = async (Component) => act(async () => root.render(
  <Provider store={configureStore({ reducer: { ui: uiReducer, auth: authReducer } })}>
    <MemoryRouter><ThemeProvider theme={theme}><Component /></ThemeProvider></MemoryRouter>
  </Provider>
));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  userService.getAll.mockResolvedValue(users);
  docenteService.getAll.mockResolvedValue(docentes);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

for (const [name, Component] of [["usuarios", Tables], ["docentes", Docentes]]) {
  test(`${name}: typing filters all pages, ignores accents/case, and clearing restores the list`, async () => {
    await mount(Component);
    expect(rows()).toHaveLength(10);
    await act(async () => button("2").click());
    expect(rows()).toHaveLength(2);
    await search("  LOPEZ   jose ");
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain("Jos\u00e9");
    expect(rows()[0].textContent).toContain("L\u00f3pez");
    await act(async () => button("Limpiar b\u00fasqueda").click());
    expect(container.querySelector('input[type="search"]').value).toBe("");
    expect(rows()).toHaveLength(10);
    expect(userService.getAll).toHaveBeenCalledTimes(1);
    if (name === "docentes") expect(docenteService.getAll).toHaveBeenCalledTimes(1);
  });

  test(`${name}: unmatched queries show an empty message and whitespace restores the list`, async () => {
    await mount(Component);
    await search("inexistente");
    expect(rows()).toHaveLength(0);
    expect(container.textContent).toContain(`No se encontraron ${name} para esta b\u00fasqueda.`);
    await search("   ");
    expect(rows()).toHaveLength(10);
  });

  test.each(name === "usuarios" ? ["jlopez@", "PRECEPTOR"] : ["jlopez@", "matematica", "3 D", "titular"])(
    `${name}: searches underlying text fields: %s`, async (query) => {
      await mount(Component);
      await search(query);
      expect(rows()).toHaveLength(1);
      expect(rows()[0].textContent).toContain("Jos\u00e9");
    }
  );
}
