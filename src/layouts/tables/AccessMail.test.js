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
import Tables from "./index";

jest.mock("services/userService", () => ({ getAll: jest.fn(), requestInitialAccess: jest.fn() }));
jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("components/StatusModal", () => () => null);
jest.mock("examples/Tables/DataTable", () => ({ table }) => (
  <div>{table.rows.map((row, index) => <div key={index}>{row.actions}</div>)}</div>
));

let root;
let container;
const button = (text) => Array.from(document.body.querySelectorAll("button")).find((item) => item.textContent === text);
const click = async (element) => act(async () => element.click());
const dialog = () => document.body.querySelector('[role="dialog"]');
const mount = async () => act(async () => root.render(
  <Provider store={configureStore({ reducer: { ui: uiReducer, auth: authReducer } })}>
    <MemoryRouter><ThemeProvider theme={theme}><Tables /></ThemeProvider></MemoryRouter>
  </Provider>
));
const open = async () => {
  await mount();
  await click(container.querySelector('button[aria-label*="primera@example.invalid"]'));
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  userService.getAll.mockResolvedValue([
    { id: "1", firstName: "Primera", lastName: "Cuenta", email: "primera@example.invalid", role: "Docente", status: true },
    { id: "2", firstName: "Segunda", lastName: "Cuenta", email: "segunda@example.invalid", role: "Docente", status: true },
  ]);
  userService.requestInitialAccess.mockResolvedValue(undefined);
  jest.spyOn(window, "alert").mockImplementation(() => {});
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

test("mail action shows the recipient and requires confirmation before calling the API", async () => {
  await open();
  expect(dialog().textContent).toContain("primera@example.invalid");
  expect(dialog().textContent).toContain("La contraseña actual no cambia");
  expect(button("Enviar")).toBeDefined();
  expect(button("Cancelar")).toBeDefined();
  expect(userService.requestInitialAccess).not.toHaveBeenCalled();
  await click(button("Enviar"));
  expect(userService.requestInitialAccess).toHaveBeenCalledTimes(1);
  expect(userService.requestInitialAccess).toHaveBeenCalledWith("primera@example.invalid");
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Se solicitó el envío"));
});

test("cancel and Escape do not send an email", async () => {
  await open();
  await click(button("Cancelar"));
  expect(userService.requestInitialAccess).not.toHaveBeenCalled();
  await click(container.querySelector('button[aria-label*="segunda@example.invalid"]'));
  expect(dialog().textContent).toContain("segunda@example.invalid");
  await act(async () => Simulate.keyDown(dialog(), { key: "Escape", keyCode: 27 }));
  expect(userService.requestInitialAccess).not.toHaveBeenCalled();
});

test("errors stay in the dialog and allow an explicit retry to the same recipient", async () => {
  userService.requestInitialAccess.mockRejectedValueOnce(new Error("Proveedor de correo no disponible"));
  await open();
  await click(button("Enviar"));
  expect(dialog().querySelector('[role="alert"]').textContent).toContain("Proveedor de correo no disponible");
  expect(dialog().textContent).toContain("primera@example.invalid");
  expect(button("Enviar").disabled).toBe(false);
  expect(window.alert).not.toHaveBeenCalled();
  await click(button("Enviar"));
  expect(userService.requestInitialAccess).toHaveBeenCalledTimes(2);
  expect(userService.requestInitialAccess).toHaveBeenLastCalledWith("primera@example.invalid");
});

test("pending sends block duplicate clicks and prevent dismissing the dialog", async () => {
  let resolveSend;
  userService.requestInitialAccess.mockImplementation(() => new Promise((resolve) => { resolveSend = resolve; }));
  await open();
  await act(async () => {
    const send = button("Enviar");
    send.click();
    send.click();
  });
  expect(userService.requestInitialAccess).toHaveBeenCalledTimes(1);
  expect(button("Enviando...").disabled).toBe(true);
  expect(button("Cancelar").disabled).toBe(true);
  await act(async () => Simulate.keyDown(dialog(), { key: "Escape", keyCode: 27 }));
  expect(dialog()).not.toBeNull();
  await act(async () => resolveSend());
  expect(window.alert).toHaveBeenCalledTimes(1);
});

test("accounts without an email do not open the send dialog or call the API", async () => {
  userService.getAll.mockResolvedValue([{ id: "1", firstName: "Sin", lastName: "Correo", email: null, role: "Docente", status: true }]);
  await mount();
  await click(container.querySelector('button[aria-label*="usuario sin email"]'));
  expect(dialog()).toBeNull();
  expect(userService.requestInitialAccess).not.toHaveBeenCalled();
  expect(window.alert).toHaveBeenCalledWith("El usuario no tiene email cargado.");
});
