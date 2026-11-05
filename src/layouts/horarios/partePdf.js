import { jsPDF } from "jspdf";
import chroma from "chroma-js";
import { DAYS } from "./schedule";
import { courseOccupancy, subjectColor, weeklyRows } from "./courseSchedule";
import { buildPartePages } from "./parte";

const WIDTH = 297;
const HALF = 105;
const MARGIN = 4;
const INDEX = 19;
const CELL = (WIDTH - 2 * MARGIN - INDEX) / 5;
const FONT = 6.5;
const LEADING = 2.3;
const PAD = 0.5;
const SIGNATURE = 5;
// Reserve clear handwriting space and the label below the table for the preceptor.
const FOOTER = 7.5;

function text(value) {
  const result = String(value ?? "").trim();
  // Helvetica's WinAnsi encoding cannot faithfully reproduce arbitrary Unicode.
  if (/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013-\u2014\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC]/.test(result)) {
    throw new Error("El parte contiene caracteres que Helvetica no puede representar. Revisa los nombres y datos institucionales.");
  }
  return result;
}

function safeFilename(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "anexo";
}

export function createPartePdf({ cursos, semanas, materias = [], bloques = [], institucion = "CENS N\u00b0 15", datosInstitucion = "", anexoNombre = "", sinColores = false }) {
  const pages = buildPartePages({ cursos, semanas });
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: false });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT);
  doc.setLineHeightFactor(1);
  const workingBlocks = bloques.filter((block) => DAYS.some((day) => day.value === block.diaSemana));
  const blockIds = new Set();
  workingBlocks.forEach((block) => {
    if (block.id === undefined || blockIds.has(String(block.id)) || !["Clase", "Receso"].includes(block.tipo) ||
        ![block.horaInicio, block.horaFin].every((time) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) ||
        block.horaInicio >= block.horaFin) {
      throw new Error("Hay bloques horarios invalidos o duplicados. Revisa la grilla guardada antes de generar el parte.");
    }
    blockIds.add(String(block.id));
  });
  const rows = weeklyRows(bloques, DAYS);
  if (!rows.length) throw new Error("No hay bloques horarios guardados para los cinco dias de la semana.");
  if (rows.reduce((sum, row) => sum + Object.keys(row.blocks).length, 0) !== workingBlocks.length) {
    throw new Error("Hay bloques superpuestos en el mismo indice de la grilla. Revisa los horarios guardados.");
  }
  const wrap = (value, width) => doc.splitTextToSize(text(value), width);
  const layouts = new Map();

  // Measure every course before drawing anything; no clipping, shrinking or extra sheets.
  pages.forEach(({ curso }) => {
    if (layouts.has(String(curso.id))) return;
    const occupancy = courseOccupancy(materias, curso.id);
    occupancy.forEach((assigned, id) => {
      if (!workingBlocks.some((block) => String(block.id) === id && block.tipo === "Clase")) {
        throw new Error("Hay materias asignadas a bloques inexistentes o que no son clases de lunes a viernes. Revisa la grilla guardada.");
      }
    });
    const courseName = [curso.curso, curso.division, curso.orientacionNombreCorto].filter(Boolean).join(" - ");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const heading = [
      `${text(institucion)} | PLANILLA DE PARTE DOCENTE`,
      ...(text(datosInstitucion) ? [text(datosInstitucion)] : []),
      `Anexo: ${text(anexoNombre || curso.anexoNombre || "Sin anexo informado")} | Curso: ${text(courseName || curso.id)}`,
    ].flatMap((line) => wrap(line, WIDTH - 2 * MARGIN));
    doc.setFont("helvetica", "normal");
    const weekLines = Math.max(...pages.filter((page) => String(page.curso.id) === String(curso.id))
      .flatMap((page) => page.semanas).map((item) => wrap(`${item.label} | ${item.monthLabel}`, WIDTH - 2 * MARGIN).length));
    const headerHeight = (heading.length + weekLines) * 3 + 1;
    doc.setFontSize(FONT);
    const measured = rows.map((row) => {
      const cells = DAYS.map((day) => {
        const block = row.blocks[day.value];
        if (!block) return { kind: "absent", lines: ["Sin bloque"] };
        if (row.tipo === "Receso") return { kind: "recess", lines: ["Receso"] };
        const assigned = occupancy.get(String(block.id)) || [];
        if (!assigned.length) return { kind: "free", lines: ["Hora libre"] };
        return { kind: "assigned", entries: assigned.map((materia) => {
          const active = (materia.docentes || []).filter((teacher) => teacher.activo === true);
          const teachers = active.length ? active.map((teacher) => {
            if (!text(teacher.docente)) throw new Error("Hay una asignacion docente activa sin nombre. Revisa los datos del curso.");
            return `${text(teacher.docente)}${text(teacher.rol) ? ` (${text(teacher.rol)})` : ""}`;
          }) : ["Sin docente activo"];
          const lines = [...wrap(materia.nombre || "Sin nombre de materia", CELL - 2 * PAD),
            ...teachers.flatMap((teacher) => wrap(teacher, CELL - 2 * PAD))];
          const height = lines.length * LEADING + SIGNATURE + 2 * PAD;
          return { lines, height, color: chroma(subjectColor(materia).background).rgb() };
        }) };
      });
      const indexLines = [row.label, `${row.horaInicio.slice(0, 5)}-${row.horaFin.slice(0, 5)}`];
      const height = Math.max(row.tipo === "Receso" ? 3.8 : 6.4,
        ...cells.map((cell) => cell.entries ? cell.entries.reduce((sum, entry) => sum + entry.height, 0) : 0));
      return { cells, height, indexLines, tipo: row.tipo };
    });
    const bodyHeight = measured.reduce((sum, row) => sum + row.height, 0);
    const available = HALF - 2 * MARGIN - FOOTER - headerHeight - 5;
    if (bodyHeight > available) {
      throw new Error(`El horario de ${courseName || curso.id} no cabe en media hoja A4 apaisada: necesita ${bodyHeight.toFixed(1)} mm y dispone de ${available.toFixed(1)} mm. No se pueden conservar todos los textos y 5 mm libres para cada firma. El formato requiere revisar su distribucion; no se omitieron horas ni docentes.`);
    }
    layouts.set(String(curso.id), { heading, headerHeight, measured, bodyHeight });
  });

  const drawLines = (lines, x, y, leading = LEADING) => {
    lines.forEach((line, index) => doc.text(line, x, y + index * leading));
  };
  pages.forEach(({ curso, semanas: selected }, pageIndex) => {
    if (pageIndex) doc.addPage("a4", "landscape");
    const layout = layouts.get(String(curso.id));
    selected.forEach((selectedWeek, halfIndex) => {
      const top = halfIndex * HALF + MARGIN;
      doc.setTextColor(25, 25, 25);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      drawLines(layout.heading, MARGIN, top + 2.5, 3);
      doc.setFont("helvetica", "normal");
      drawLines(wrap(`${selectedWeek.label} | ${selectedWeek.monthLabel}`, WIDTH - 2 * MARGIN), MARGIN, top + 2.5 + layout.heading.length * 3, 3);
      let y = top + layout.headerHeight;
      doc.setFontSize(FONT);
      doc.setDrawColor(165, 165, 165);
      doc.setLineWidth(0.12);
      doc.setFillColor(...(sinColores ? [255, 255, 255] : [245, 245, 245]));
      doc.rect(MARGIN, y, WIDTH - 2 * MARGIN, 5, "FD");
      doc.text("Hora / horario", MARGIN + PAD, y + 3.2);
      selectedWeek.days.forEach((day, index) => {
        const x = MARGIN + INDEX + index * CELL;
        doc.line(x, y, x, y + 5);
        doc.text(day.label, x + CELL / 2, y + 3.2, { align: "center" });
      });
      y += 5;
      layout.measured.forEach((row) => {
        doc.setFillColor(...(sinColores ? [255, 255, 255] : row.tipo === "Receso" ? [235, 235, 235] : [250, 250, 250]));
        doc.rect(MARGIN, y, INDEX, row.height, "FD");
        doc.setFontSize(row.tipo === "Receso" ? 6 : FONT);
        drawLines(row.indexLines, MARGIN + PAD, y + (row.tipo === "Receso" ? 1.65 : 2.5), row.tipo === "Receso" ? 1.8 : LEADING);
        doc.setFontSize(FONT);
        row.cells.forEach((cell, index) => {
          const x = MARGIN + INDEX + index * CELL;
          if (cell.entries) {
            let entryY = y;
            cell.entries.forEach((entry) => {
              doc.setFillColor(...(sinColores ? [255, 255, 255] : entry.color));
              doc.rect(x, entryY, CELL, entry.height, "F");
              drawLines(entry.lines, x + PAD, entryY + PAD + 2);
              const signatureTop = entryY + PAD + entry.lines.length * LEADING;
              doc.setFontSize(6);
              doc.text("Firma", x + PAD, signatureTop + SIGNATURE - 0.3);
              doc.line(x + 7, signatureTop + SIGNATURE - 0.3, x + CELL - PAD, signatureTop + SIGNATURE - 0.3);
              doc.setFontSize(FONT);
              entryY += entry.height;
            });
          } else {
            doc.setFillColor(...(!sinColores && cell.kind === "recess" ? [235, 235, 235] : [255, 255, 255]));
            doc.rect(x, y, CELL, row.height, "F");
            doc.text(cell.lines[0], x + PAD, y + Math.min(3, row.height - 0.8));
          }
          doc.rect(x, y, CELL, row.height);
        });
        y += row.height;
      });
      doc.setFontSize(6);
      const footerY = (halfIndex + 1) * HALF - MARGIN;
      doc.text("Parte semanal de asistencia docente | Firma manuscrita en cada hora asignada", MARGIN, footerY);
      doc.line(WIDTH - MARGIN - 60, footerY - 2.5, WIDTH - MARGIN, footerY - 2.5);
      doc.text("Firma del Preceptor", WIDTH - MARGIN - 30, footerY, { align: "center" });
    });
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(0, HALF, WIDTH, HALF);
    doc.setLineDashPattern([], 0);
  });
  const allWeeks = pages.flatMap((page) => page.semanas).sort((a, b) => a.id.localeCompare(b.id));
  const annexes = [...new Set(pages.map(({ curso }) => anexoNombre || curso.anexoNombre || "anexo"))].join("-");
  const filename = `parte-${safeFilename(annexes)}-${allWeeks[0].monday}-${allWeeks[allWeeks.length - 1].friday}.pdf`;
  return { doc, blob: doc.output("blob"), pageCount: pages.length,
    planillaCount: pages.reduce((sum, page) => sum + page.semanas.length, 0), filename };
}
