/** @jest-environment node */
import { jsPDF } from "jspdf";
import { Blob as NodeBlob } from "buffer";
import chroma from "chroma-js";
import { calendarWeeks } from "./parte";
import { createPartePdf } from "./partePdf";
import { subjectColor } from "./courseSchedule";
import { DAYS } from "./schedule";

const originalBlob = global.Blob;
beforeAll(() => { global.Blob = NodeBlob; });
afterAll(() => { global.Blob = originalBlob; });

jest.mock("jspdf", () => {
  const actual = jest.requireActual("jspdf");
  return { ...actual, jsPDF: jest.fn() };
});

beforeEach(() => {
  jest.clearAllMocks();
  jsPDF.mockImplementation((options) => {
    const actual = jest.requireActual("jspdf");
    const doc = new actual.jsPDF(options);
    ["text", "line", "rect", "setFillColor"].forEach((method) => jest.spyOn(doc, method));
    return doc;
  });
});

// Entirely synthetic, including the teachers and institution details.
function fixture() {
  const periods = [
    ["19:00:00", "19:35:00", "Clase"], ["19:35:00", "20:10:00", "Clase"],
    ["20:10:00", "20:15:00", "Receso"], ["20:15:00", "20:50:00", "Clase"],
    ["20:50:00", "21:25:00", "Clase"], ["21:25:00", "21:30:00", "Receso"],
    ["21:30:00", "22:05:00", "Clase"], ["22:05:00", "22:40:00", "Clase"],
  ];
  const bloques = DAYS.flatMap((day, dayIndex) => periods.map(([horaInicio, horaFin, tipo], index) => ({
    id: dayIndex * 8 + index + 1, diaSemana: day.value, orden: index + 1, tipo, horaInicio, horaFin,
  })));
  const names = ["Matem\u00e1tica", "Lengua", "Historia", "Ingl\u00e9s", "Biolog\u00eda", "Geograf\u00eda"];
  const materias = names.map((nombre, index) => ({
    id: index + 1, nombre, cursoId: 1, cargaHoraria: 5,
    docentes: [{ docente: `Ana P\u00e9rez ${index + 1}`, docenteId: index + 1, rol: "Titular", activo: true },
      { docente: "Persona inactiva", rol: "Suplente", activo: false }],
    horarios: bloques.filter((block) => block.tipo === "Clase" && [1, 2, 4, 5, 7, 8][index] === block.orden).map(({ id }) => ({ id })),
  }));
  return { cursos: [{ id: 1, curso: "1\u00b0", division: "A", orientacionNombreCorto: "Sociales", anexoNombre: "Anexo de prueba" }],
    semanas: calendarWeeks("2026-11").slice(0, 3), materias, bloques,
    datosInstitucion: "Datos institucionales de prueba" };
}

test("creates real vector A4 landscape pages with two full weeks and an empty odd bottom", () => {
  const result = createPartePdf(fixture());
  expect(result.pageCount).toBe(2);
  expect(result.planillaCount).toBe(3);
  expect(result.doc.internal.pageSize.getWidth()).toBeCloseTo(297, 1);
  expect(result.doc.internal.pageSize.getHeight()).toBeCloseTo(210, 1);
  expect(result.doc.getNumberOfPages()).toBe(2);
  expect(result.blob).toBeInstanceOf(Blob);
  expect(result.blob.type).toBe("application/pdf");
  const pdf = result.doc.output();
  expect(result.doc.output("arraybuffer")).toBeInstanceOf(ArrayBuffer);
  expect(pdf).toMatch(/^%PDF/);
  const mediaBox = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  expect(Number(mediaBox[1])).toBeCloseTo(841.89, 2);
  expect(Number(mediaBox[2])).toBeCloseTo(595.28, 2);
  expect(pdf).not.toMatch(/\/Subtype \/Image/);
  const titles = result.doc.text.mock.calls.filter(([value]) => typeof value === "string" && value.startsWith("Semana "));
  expect(titles).toHaveLength(3);
  expect(titles.map(([value]) => value.match(/Semana \d/)[0])).toEqual(["Semana 1", "Semana 2", "Semana 3"]);
  expect(titles.map(([, , y]) => y)).toEqual([15.5, 120.5, 15.5]);
  const lastPage = result.doc.internal.pages[2].join("\n");
  expect(lastPage).not.toContain("Hora libre");
  expect(lastPage.match(/Parte semanal de asistencia docente/g)).toHaveLength(1);
  expect(result.doc.line.mock.calls.filter((args) => args.join(",") === "0,105,297,105")).toHaveLength(2);
  expect(result.filename).toBe("parte-Anexo-de-prueba-2026-11-02-2026-11-20.pdf");
  expect(result.filename).not.toContain("rez");
});

test("courses never share a physical page and duplicate weeks are printed only once", () => {
  const input = fixture();
  input.cursos.push({ id: 2, curso: "2\u00b0", division: "B" });
  input.semanas.push(input.semanas[0]);
  const result = createPartePdf(input);
  expect(result.pageCount).toBe(4);
  expect(result.planillaCount).toBe(6);
  const content = result.doc.internal.pages.slice(1).map((page) => page.join("\n"));
  expect(content[0]).toContain("Sociales");
  expect(content[1]).toContain("Sociales");
  expect(content[2]).not.toContain("Sociales");
  expect(content[3]).not.toContain("Sociales");
});

test("keeps every subject and active teacher, pastel colors and 5 mm signing areas within each half", () => {
  const input = fixture();
  input.semanas = input.semanas.slice(0, 2);
  const { doc } = createPartePdf(input);
  const printed = doc.text.mock.calls.map(([value]) => value).join("\n");
  input.materias.forEach((materia) => {
    expect(printed).toContain(materia.nombre);
    expect(printed).toContain(`${materia.docentes[0].docente} (Titular)`);
  });
  expect(printed).not.toContain("Persona inactiva");
  expect(printed).toContain("CENS N\u00b0 15");
  expect(printed).toContain("Lunes 2");
  expect(printed).toContain("Martes 3");
  expect(printed).toContain("Mi\u00e9rcoles 4");
  expect(doc.setFillColor).toHaveBeenCalledWith(...chroma(subjectColor(input.materias[0]).background).rgb());
  const signatures = doc.text.mock.calls.filter(([value]) => value === "Firma");
  expect(signatures).toHaveLength(60);
  signatures.forEach(([, x, y]) => {
    const cell = doc.rect.mock.calls.find(([rx, ry, width, height, style]) =>
      style === "F" && Math.abs(rx + 0.5 - x) < 0.001 && y > ry && y < ry + height);
    expect(cell).toBeDefined();
    const [, cellY, , height] = cell;
    const teacher = doc.text.mock.calls.find(([value, tx, ty]) =>
      value.includes("(Titular)") && tx === x && ty > cellY && ty < cellY + height);
    expect(y - teacher[2]).toBeGreaterThanOrEqual(4.9);
    expect(cellY % 105 + height).toBeLessThan(98.2);
  });
  const recessCells = doc.rect.mock.calls.filter(([, , , height, style]) => style === "F" && height === 3.8);
  expect(recessCells).toHaveLength(20);
});

test("distinguishes free periods from assigned hours without active teachers", () => {
  const input = fixture();
  input.materias = [input.materias[0]];
  input.materias[0].docentes = [{ docente: "No imprimir", activo: false }];
  const { doc } = createPartePdf(input);
  const printed = doc.text.mock.calls.map(([value]) => value).join("\n");
  expect(printed).toContain("Sin docente activo");
  expect(printed).toContain("Hora libre");
  expect(printed).not.toContain("No imprimir");
  expect(doc.text.mock.calls.filter(([value]) => value === "Firma")).toHaveLength(15);
});

test("background-free mode keeps all fills white without removing content, borders or signatures", () => {
  const colored = createPartePdf(fixture());
  const plain = createPartePdf({ ...fixture(), sinColores: true });
  expect(plain.pageCount).toBe(colored.pageCount);
  expect(plain.doc.text.mock.calls).toEqual(colored.doc.text.mock.calls);
  expect(plain.doc.line.mock.calls).toEqual(colored.doc.line.mock.calls);
  expect(plain.doc.rect.mock.calls).toEqual(colored.doc.rect.mock.calls);
  expect(plain.doc.setFillColor.mock.calls.length).toBeGreaterThan(0);
  plain.doc.setFillColor.mock.calls.forEach((rgb) => expect(rgb).toEqual([255, 255, 255]));
});

test("each weekly planilla has one preceptor signature below the table at the right, not in the empty half", () => {
  const { doc } = createPartePdf(fixture());
  const signatures = doc.text.mock.calls.filter(([value]) => value === "Firma del Preceptor");
  expect(signatures).toHaveLength(3);
  expect(signatures.map(([, , y]) => y)).toEqual([101, 206, 101]);
  signatures.forEach(([, x, y, options]) => {
    expect(x).toBe(263);
    expect(options).toEqual(expect.objectContaining({ align: "center" }));
    expect(doc.line).toHaveBeenCalledWith(233, y - 2.5, 293, y - 2.5);
    const halfStart = y > 105 ? 105 : 0;
    const bottom = Math.max(...doc.rect.mock.calls.filter(([, ry]) => ry >= halfStart && ry < halfStart + 105)
      .map(([, ry, , height]) => ry + height));
    expect(y - 2.5 - bottom).toBeGreaterThanOrEqual(4.99);
  });
  expect(doc.internal.pages[2].join("\n").match(/Firma del Preceptor/g)).toHaveLength(1);
});

test("preserves differing day times as separate rows and regenerates cross-year day labels", () => {
  const input = fixture();
  input.bloques = [input.bloques[0], { ...input.bloques[8], horaInicio: "19:10:00", horaFin: "19:45:00" }];
  input.materias = [];
  input.semanas = [{ ...calendarWeeks("2026-01")[0], days: [{ label: "Fake" }] }];
  const { doc } = createPartePdf(input);
  const printed = doc.text.mock.calls.map(([value]) => value).join("\n");
  ["19:00-19:35", "19:10-19:45", "Lunes 29", "Martes 30", "Jueves 1", "Viernes 2", "diciembre 2025 / enero 2026", "Sin bloque"].forEach((value) => expect(printed).toContain(value));
  expect(printed).not.toContain("Fake");
  expect(doc.text.mock.calls.filter(([value]) => value === "Hora 1")).toHaveLength(2);
});

test("wraps text without losing words and rejects overload before drawing any sheet", () => {
  const input = fixture();
  input.bloques = input.bloques.filter((block) => block.orden === 1);
  input.materias = [input.materias[0]];
  input.materias[0].nombre = "Materia con un nombre extenso que requiere varias lineas completas";
  input.materias[0].docentes.push({ docente: "Otra Docente", rol: "Suplente", activo: true });
  const { doc } = createPartePdf(input);
  expect(doc.text.mock.calls.map(([value]) => value).join(" ")).toContain(input.materias[0].nombre);
  expect(doc.text.mock.calls.map(([value]) => value).join(" ")).toContain("Otra Docente (Suplente)");
  input.materias[0].nombre = "Texto muy extenso ".repeat(300);
  expect(() => createPartePdf(input)).toThrow(/no cabe en media hoja A4 apaisada.*5 mm/);
  expect(jsPDF.mock.results[jsPDF.mock.results.length - 1].value.text).not.toHaveBeenCalled();
});

test("extreme grids fail instead of changing format or hiding assignments", () => {
  const input = fixture();
  input.materias.forEach((materia) => {
    materia.docentes.push(...Array.from({ length: 10 }, (_, index) => ({ docente: `Docente adicional ${index}`, rol: "Suplente", activo: true })));
  });
  expect(() => createPartePdf(input)).toThrow(/no cabe/);
  expect(() => createPartePdf({ ...fixture(), semanas: [{ id: "2026-02-30" }] })).toThrow(/lunes real/);
  expect(() => createPartePdf({ ...fixture(), datosInstitucion: "Institucion \u{1F600}" })).toThrow(/Helvetica/);
  const stale = fixture();
  stale.materias[0].horarios.push({ id: "missing" });
  expect(() => createPartePdf(stale)).toThrow(/bloques inexistentes/);
});

test("optionally writes a synthetic sample only to the explicitly approved temporary path", () => {
  const target = process.env.PARTE_SAMPLE_PDF;
  if (!target) return;
  const fs = require("fs");
  const path = require("path");
  const approved = "C:\\Users\\ferma\\AppData\\Local\\Temp\\opencode";
  const resolved = path.resolve(target);
  expect(path.dirname(resolved).toLowerCase()).toBe(approved.toLowerCase());
  expect(path.extname(resolved).toLowerCase()).toBe(".pdf");
  expect(fs.existsSync(path.dirname(resolved))).toBe(true);
  const { doc } = createPartePdf({ ...fixture(), sinColores: true });
  fs.writeFileSync(resolved, Buffer.from(doc.output("arraybuffer")));
});
