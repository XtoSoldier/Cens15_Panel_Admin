import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeProvider } from "@mui/material/styles";
import theme from "assets/theme";
import store from "store";
import Horarios from "./index";
import anexoService from "services/anexoService";
import cursoService from "services/cursoService";
import materiaService from "services/materiaService";
import horarioAnexoService from "services/horarioAnexoService";

jest.mock("examples/LayoutContainers/DashboardLayout", () => ({ children }) => children);
jest.mock("examples/Navbars/DashboardNavbar", () => () => null);
jest.mock("examples/Footer", () => () => null);
jest.mock("services/anexoService", () => ({ getAll: jest.fn() }));
jest.mock("services/cursoService", () => ({ getAll: jest.fn() }));
jest.mock("services/materiaService", () => ({ getAll: jest.fn() }));
jest.mock("services/horarioAnexoService", () => ({ getByAnexo: jest.fn(), save: jest.fn() }));

const blocks = [
  { id: 1, diaSemana: "Monday", orden: 1, tipo: "Clase", horaInicio: "19:10:00", horaFin: "19:50:00" },
  { id: 2, diaSemana: "Monday", orden: 2, tipo: "Receso", horaInicio: "19:50:00", horaFin: "20:00:00" },
  { id: 3, diaSemana: "Tuesday", orden: 1, tipo: "Clase", horaInicio: "19:10:00", horaFin: "19:50:00" },
];
let container;
let root;

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  anexoService.getAll.mockResolvedValue([{ id: 9, nombre: "Otro" }, { id: 1, nombre: "Esc. 41" }]);
  cursoService.getAll.mockResolvedValue([
    { id: 10, id_anexo: 1, curso: "1", division: "A", orientacionNombreCorto: "Sociales" },
    { id: 20, id_anexo: 1, curso: "2", division: "B", orientacionNombreCorto: "Economia" },
    { id: 30, id_anexo: 9, curso: "3", division: "C" },
  ]);
  materiaService.getAll.mockResolvedValue([
    { id: 100, cursoId: 10, nombre: "Matematica", cargaHoraria: 2, horarios: [blocks[0], blocks[2]], docentes: [] },
    { id: 200, cursoId: 20, nombre: "Historia", cargaHoraria: 1, horarios: [blocks[0]], docentes: [] },
  ]);
  horarioAnexoService.getByAnexo.mockResolvedValue([...blocks]);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<Provider store={store}><ThemeProvider theme={theme}><Horarios /></ThemeProvider></Provider>);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

const button = (label) => Array.from(container.querySelectorAll("button"))
  .find((element) => element.textContent.includes(label));
const checkbox = (label) => Array.from(container.querySelectorAll("label"))
  .find((element) => element.textContent === label).querySelector("input");
const courseHeaders = () => Array.from(container.querySelectorAll("h5")).map((element) => element.textContent);

test("ESC. 41 is selected and annex editing remains hidden until explicitly requested", async () => {
  expect(horarioAnexoService.getByAnexo).toHaveBeenCalledWith(1);
  expect(horarioAnexoService.getByAnexo).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll('input[type="time"]')).toHaveLength(0);
  await act(async () => button("Mostrar configuracion del anexo").click());
  expect(container.querySelectorAll('input[type="time"]')).toHaveLength(4);
  await act(async () => button("Ocultar configuracion del anexo").click());
  expect(container.querySelectorAll('input[type="time"]')).toHaveLength(0);
  expect(horarioAnexoService.save).not.toHaveBeenCalled();
});

test("all annex courses start visible and each checkbox hides only its own grid", () => {
  expect(courseHeaders()).toEqual(["Grilla de horarios", "1 A", "2 B"]);
  expect(checkbox("1 A - Sociales").checked).toBe(true);
  expect(checkbox("2 B - Economia").checked).toBe(true);
  act(() => checkbox("2 B - Economia").click());
  expect(courseHeaders()).toEqual(["Grilla de horarios", "1 A"]);
  expect(container.textContent).not.toContain("Historia");
  act(() => checkbox("2 B - Economia").click());
  expect(courseHeaders()).toContain("2 B");
});

test("day filters apply to every course while subject modal still shows its complete weekly schedule", async () => {
  ["Martes", "Miercoles", "Jueves", "Viernes"].forEach((day) => act(() => checkbox(day).click()));
  const headings = Array.from(container.querySelectorAll("h6")).map((element) => element.textContent);
  expect(headings.filter((text) => text === "Lunes")).toHaveLength(2);
  expect(headings).not.toContain("Martes");
  await act(async () => container.querySelector('button[aria-label="Ver horarios de Matematica - 1 A"]').click());
  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain("Curso 1 A");
  expect(dialog.textContent).toContain("Lunes / Hora 1");
  expect(dialog.textContent).toContain("Martes / Hora 1");
  expect(dialog.textContent).not.toContain("Historia");
  expect(container.textContent).not.toContain("Materias del curso");
});

test("a single left index labels aligned weekday cells without repeating times in subject cards", () => {
  const table = container.querySelector('table[aria-label="Horario de 1 A"]');
  const firstRow = table.querySelector("tbody tr");
  expect(firstRow.querySelector('th[scope="row"]').textContent).toContain("Hora 1");
  expect(firstRow.querySelector('th[scope="row"]').textContent).toContain("19:10 a 19:50");
  expect(firstRow.querySelectorAll("td")).toHaveLength(5);
  expect(firstRow.querySelectorAll('button[aria-label="Ver horarios de Matematica - 1 A"]')).toHaveLength(2);
  firstRow.querySelectorAll("td").forEach((cell) => {
    expect(cell.textContent).not.toContain("19:10");
    expect(cell.textContent).not.toContain("Hora 1");
  });
  expect(table.querySelectorAll('th[scope="row"]')).toHaveLength(2);
});

test("opens weekly attendance generation for a specific course without changing saved schedules", async () => {
  const table = container.querySelector('table[aria-label="Horario de 2 B"]');
  const card = table.closest(".MuiCard-root");
  const generate = Array.from(card.querySelectorAll("button")).find((item) => item.textContent === "Generar parte de este curso");
  await act(async () => generate.click());
  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain("Generar Planilla de Parte");
  const courseInputs = Array.from(dialog.querySelectorAll("label"));
  const first = courseInputs.find((label) => label.textContent === "1 A - Sociales").querySelector("input");
  const second = courseInputs.find((label) => label.textContent === "2 B - Economia").querySelector("input");
  expect(first.checked).toBe(false);
  expect(second.checked).toBe(true);
  expect(horarioAnexoService.save).not.toHaveBeenCalled();
});
