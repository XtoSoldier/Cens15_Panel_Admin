import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "assets/theme";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "store/slices/uiSlice";
import authReducer from "store/slices/authSlice";
import userService from "services/userService";
import rolService from "services/rolService";
import UserForm from "./index";

jest.mock("services/userService", () => ({
  getById: jest.fn(), create: jest.fn(), update: jest.fn(), updateEmail: jest.fn(),
}));
jest.mock("services/rolService", () => ({ getAll: jest.fn() }));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);

let root;
let container;
let store;
const field = (name) => container.querySelector(`input[name="${name}"]`);
const toggle = (name) => field(name).closest(".MuiInputBase-root").querySelector("button");

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  store = configureStore({ reducer: { ui: uiReducer, auth: authReducer } });
  rolService.getAll.mockResolvedValue([]);
  userService.getById.mockResolvedValue({ firstName: "Usuario", lastName: "Prueba", email: "prueba@example.com" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test.each(["/usuarios/nuevo", "/usuarios/editar/1"])("password eyes toggle independently without submitting or changing values: %s", async (path) => {
  await act(async () => root.render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/usuarios/nuevo" element={<UserForm />} />
            <Route path="/usuarios/editar/:id" element={<UserForm />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  ));
  const password = "Clave-de-prueba-123";
  for (const name of ["password", "confirmPassword"]) {
    expect(field(name).type).toBe("password");
    expect(toggle(name).type).toBe("button");
    expect(toggle(name).getAttribute("aria-pressed")).toBe("false");
    await act(async () => Simulate.change(field(name), { target: { name, value: password } }));
  }
  await act(async () => toggle("password").click());
  expect(field("password").type).toBe("text");
  expect(field("confirmPassword").type).toBe("password");
  expect(toggle("password").getAttribute("aria-label")).toBe("Ocultar contrase\u00f1a");
  expect(toggle("password").getAttribute("aria-pressed")).toBe("true");
  await act(async () => toggle("confirmPassword").click());
  expect(field("confirmPassword").type).toBe("text");
  expect(toggle("confirmPassword").getAttribute("aria-label")).toBe("Ocultar confirmaci\u00f3n de contrase\u00f1a");
  await act(async () => {
    toggle("password").click();
    toggle("confirmPassword").click();
  });
  for (const name of ["password", "confirmPassword"]) {
    expect(field(name).type).toBe("password");
    expect(field(name).value).toBe(password);
    expect(toggle(name).getAttribute("aria-pressed")).toBe("false");
  }
  expect(userService.create).not.toHaveBeenCalled();
  expect(userService.update).not.toHaveBeenCalled();
});

async function renderForm(path = "/usuarios/editar/1") {
  await act(async () => root.render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/usuarios/nuevo" element={<UserForm />} />
            <Route path="/usuarios/editar/:id" element={<UserForm />} />
            <Route path="/usuarios" element={<div>Lista de usuarios</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  ));
}

async function change(name, value) {
  await act(async () => Simulate.change(field(name), { target: { name, value } }));
}

async function submit() {
  await act(async () => Simulate.submit(container.querySelector("form")));
}

test.each([
  ["short", "short", "6 caracteres"],
  ["new-password", "different", "no coinciden"],
  ["", "new-password", "no coinciden"],
])("invalid password blocks the request: %s / %s", async (password, confirmation, message) => {
  await renderForm();
  await change("password", password);
  await change("confirmPassword", confirmation);
  await submit();
  expect(userService.update).not.toHaveBeenCalled();
  expect(container.textContent).toContain(message);
  expect(container.textContent).not.toContain("Lista de usuarios");
});

test.each(["", " new-password "])("edit preserves optional password and exact spaces: '%s'", async (password) => {
  userService.update.mockResolvedValue("");
  await renderForm();
  await change("password", password);
  await change("confirmPassword", password);
  await submit();
  const expected = { firstName: "Usuario", lastName: "Prueba" };
  if (password) expected.password = password;
  expect(userService.update).toHaveBeenCalledWith("1", expected);
  expect(userService.updateEmail).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Lista de usuarios");
});

test("waits for the real response and displays backend errors without claiming success", async () => {
  let reject;
  userService.update.mockImplementation(() => new Promise((resolve, fail) => { reject = fail; }));
  await renderForm();
  await change("password", "new-password");
  await change("confirmPassword", "new-password");
  await submit();
  expect(container.textContent).toContain("Guardando...");
  expect(container.textContent).not.toContain("Lista de usuarios");
  await act(async () => reject(new Error("El usuario no tiene credenciales de acceso.")));
  expect(container.textContent).toContain("no tiene credenciales");
  expect(container.textContent).not.toContain("Lista de usuarios");
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
});

test("email failure after update stays on the form and is not presented as complete success", async () => {
  userService.update.mockResolvedValue("");
  userService.updateEmail.mockRejectedValue(new Error("El email ya existe"));
  await renderForm();
  await change("email", "other@example.com");
  await submit();
  expect(userService.updateEmail).toHaveBeenCalledWith("1", "other@example.com");
  expect(container.textContent).toContain("El email ya existe");
  expect(container.textContent).not.toContain("Lista de usuarios");
});

test.each(["", " initial-password "])("create retains optional initial password behavior: '%s'", async (password) => {
  userService.create.mockResolvedValue({});
  await renderForm("/usuarios/nuevo");
  await change("firstName", "Nuevo");
  await change("lastName", "Usuario");
  await change("email", "nuevo@example.com");
  await change("password", password);
  await change("confirmPassword", password);
  await submit();
  const expected = { nombres: "Nuevo", apellido: "Usuario", email: "nuevo@example.com" };
  if (password) expected.password = password;
  expect(userService.create).toHaveBeenCalledWith(expected);
  expect(userService.update).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Lista de usuarios");
});
