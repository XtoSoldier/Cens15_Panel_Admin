import { act, Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { getContrastRatio, ThemeProvider } from "@mui/material/styles";
import theme from "assets/theme";
import themeDark from "assets/theme-dark";
import ParteDialog from "./ParteDialog";
import { createPartePdf } from "./partePdf";

jest.mock("./partePdf", () => ({ createPartePdf: jest.fn() }));

const cursos = [{ id: 1, curso: "1", division: "A" }, { id: 2, curso: "2", division: "B" }];
const initialCourseIds = [1];
const bloques = [{ id: 5, diaSemana: "Monday", orden: 1, tipo: "Clase", horaInicio: "19:10:00", horaFin: "19:50:00" }];
let root;
let container;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const button = (text) => Array.from(document.body.querySelectorAll("button")).find((item) => item.textContent === text);
const checkbox = (prefix) => Array.from(document.body.querySelectorAll("label"))
  .find((item) => item.textContent.startsWith(prefix) && item.querySelector('input[type="checkbox"]')).querySelector("input");
const click = async (text) => act(async () => button(text).click());
const change = async (selector, value) => act(async () => Simulate.change(document.body.querySelector(selector), { target: { value } }));
const render = async (props = {}, activeTheme = theme) => act(async () => root.render(<ThemeProvider theme={activeTheme}>
  <ParteDialog open onClose={() => {}} cursos={cursos} initialCourseIds={initialCourseIds}
    materias={[]} bloques={bloques} anexoNombre="Esc. 41" {...props} />
</ThemeProvider>));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  URL.createObjectURL = jest.fn(() => "blob:parte-preview");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  createPartePdf.mockReturnValue({ blob: new Blob(["%PDF-test"], { type: "application/pdf" }),
    filename: "parte-esc41.pdf", pageCount: 1, planillaCount: 2 });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await render();
  await change('input[type="month"]', "2026-11");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("requires an explicit week selection and shows the actual PDF before enabling download", async () => {
  expect(button("Generar vista previa").disabled).toBe(true);
  expect(button("Descargar PDF").disabled).toBe(true);
  expect(checkbox("1 A").checked).toBe(true);
  expect(checkbox("2 B").checked).toBe(false);
  await act(async () => { checkbox("Semana 1:").click(); checkbox("Semana 2:").click(); });
  await click("Generar vista previa");
  const request = createPartePdf.mock.calls[0][0];
  expect(request.cursos).toEqual([cursos[0]]);
  expect(request.semanas.map((week) => week.id)).toEqual(["2026-11-02", "2026-11-09"]);
  expect(request.bloques).toBe(bloques);
  expect(request.anexoNombre).toBe("Esc. 41");
  expect(document.body.querySelector("iframe").getAttribute("src")).toBe("blob:parte-preview");
  expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  expect(button("Descargar PDF").disabled).toBe(false);
  await click("Descargar PDF");
  const link = HTMLAnchorElement.prototype.click.mock.instances[0];
  expect(link.download).toBe("parte-esc41.pdf");
  expect(link.getAttribute("href")).toBe("blob:parte-preview");
});

test("changing print parameters invalidates and releases the previous preview", async () => {
  await act(async () => checkbox("Semana 1:").click());
  await click("Generar vista previa");
  await change('input:not([type="month"]):not([type="checkbox"])', "Otra institucion");
  expect(document.body.querySelector("iframe")).toBeNull();
  expect(button("Descargar PDF").disabled).toBe(true);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:parte-preview");
  await click("Generar vista previa");
  expect(createPartePdf.mock.calls[1][0].institucion).toBe("Otra institucion");
});

test("removing backgrounds automatically regenerates the preview and downloads the same new PDF", async () => {
  URL.createObjectURL.mockReturnValueOnce("blob:colored").mockReturnValueOnce("blob:plain").mockReturnValueOnce("blob:colored-again");
  await act(async () => checkbox("Semana 1:").click());
  await click("Generar vista previa");
  expect(createPartePdf.mock.calls[0][0].sinColores).toBe(false);
  expect(document.body.querySelector("iframe").getAttribute("src")).toBe("blob:colored");
  await act(async () => checkbox("Quitar colores de fondo").click());
  expect(createPartePdf).toHaveBeenCalledTimes(2);
  expect(createPartePdf.mock.calls[1][0].sinColores).toBe(true);
  expect(document.body.querySelector("iframe").getAttribute("src")).toBe("blob:plain");
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:colored");
  expect(button("Descargar PDF").disabled).toBe(false);
  await click("Descargar PDF");
  expect(HTMLAnchorElement.prototype.click.mock.instances[0].getAttribute("href")).toBe("blob:plain");
  await act(async () => checkbox("Quitar colores de fondo").click());
  expect(createPartePdf.mock.calls[2][0].sinColores).toBe(false);
  expect(document.body.querySelector("iframe").getAttribute("src")).toBe("blob:colored-again");
});

test("keeps weeks across months, deduplicates boundary weeks and reports an empty odd half", async () => {
  await act(async () => checkbox("Semana 5:").click());
  expect(document.body.textContent).toContain("ultima mitad de cada curso quedara vacia");
  await change('input[type="month"]', "2026-12");
  expect(checkbox("Semana 1:").checked).toBe(true);
  await click("Agregar todas las semanas del mes");
  await click("Generar vista previa");
  const selected = createPartePdf.mock.calls[0][0].semanas;
  expect(selected).toHaveLength(5);
  expect(new Set(selected.map((week) => week.id)).size).toBe(5);
  expect(selected[0].id).toBe("2026-11-30");
});

test("shows layout failures without offering an incomplete PDF", async () => {
  createPartePdf.mockImplementation(() => { throw new Error("El horario no cabe en media hoja A4."); });
  await act(async () => checkbox("Semana 1:").click());
  await click("Generar vista previa");
  expect(document.body.textContent).toContain("no cabe en media hoja A4");
  expect(document.body.querySelector("iframe")).toBeNull();
  expect(button("Descargar PDF").disabled).toBe(true);
});

test("closing the dialog releases the generated blob URL", async () => {
  await act(async () => checkbox("Semana 1:").click());
  await click("Generar vista previa");
  await render({ open: false });
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:parte-preview");
});

test.each([["light", theme], ["dark", themeDark]])("footer actions remain readable in the %s theme, including disabled states", async (_, activeTheme) => {
  await render({}, activeTheme);
  const paper = document.body.querySelector(".MuiDialog-paper");
  const surface = getComputedStyle(paper).backgroundColor;
  const contrast = (element) => {
    const style = getComputedStyle(element);
    const background = style.backgroundColor && style.backgroundColor !== "transparent" && style.backgroundColor !== "rgba(0, 0, 0, 0)"
      ? style.backgroundColor : surface;
    expect(style.opacity).toBe("1");
    expect(getContrastRatio(style.color, background)).toBeGreaterThanOrEqual(4.5);
  };
  contrast(button("Cerrar"));
  expect(button("Generar vista previa").disabled).toBe(true);
  expect(button("Descargar PDF").disabled).toBe(true);
  contrast(button("Generar vista previa"));
  contrast(button("Descargar PDF"));
  await act(async () => checkbox("Semana 1:").click());
  expect(button("Generar vista previa").disabled).toBe(false);
  contrast(button("Generar vista previa"));
  await click("Generar vista previa");
  expect(button("Descargar PDF").disabled).toBe(false);
  contrast(button("Descargar PDF"));
});
