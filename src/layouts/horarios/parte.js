const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const LABELS = ["Lunes", "Martes", "Mi\u00e9rcoles", "Jueves", "Viernes"];
const DAY = 86400000;

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function week(monday, number) {
  const friday = new Date(monday.getTime() + 4 * DAY);
  const month = (date) => `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  const dateLabel = (date) => `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  return {
    id: iso(monday),
    monday: iso(monday),
    friday: iso(friday),
    number,
    label: `Semana ${number}: ${dateLabel(monday)} al ${dateLabel(friday)}`,
    monthLabel: month(monday) === month(friday) ? month(monday) : `${month(monday)} / ${month(friday)}`,
    days: DAYS.map((value, index) => {
      const date = new Date(monday.getTime() + index * DAY);
      return { value, label: `${LABELS[index]} ${date.getUTCDate()}`, date: iso(date) };
    }),
  };
}

export function calendarWeeks(monthValue) {
  if (typeof monthValue !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthValue) || Number(monthValue.slice(0, 4)) < 1000 || Number(monthValue.slice(0, 4)) > 9998) {
    throw new Error("Selecciona un mes valido (AAAA-MM, entre 1000 y 9998).");
  }
  const first = new Date(`${monthValue}-01T12:00:00Z`);
  const end = new Date(first);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const monday = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY);
  const result = [];
  for (let date = monday; date < end; date = new Date(date.getTime() + 7 * DAY)) {
    if (date.getTime() + 4 * DAY >= first.getTime()) result.push(week(date, result.length + 1));
  }
  return result;
}

export function buildPartePages({ cursos, semanas }) {
  if (!Array.isArray(cursos) || !cursos.length || !Array.isArray(semanas) || !semanas.length) {
    throw new Error("Selecciona al menos un curso y una semana para generar el parte.");
  }
  const unique = new Map();
  semanas.forEach((selected) => {
    const id = selected?.id;
    const date = typeof id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(id) ? new Date(`${id}T12:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime()) || iso(date) !== id || date.getUTCDay() !== 1 ||
        (selected.monday !== undefined && selected.monday !== id) || Number(id.slice(0, 4)) < 1000 || Number(id.slice(0, 4)) > 9998) {
      throw new Error("Semana invalida: se requiere una fecha de lunes real en formato AAAA-MM-DD.");
    }
    // Regenerate dates and labels; never trust caller-supplied day headers.
    const number = Number.isInteger(selected.number) && selected.number > 0 && selected.number <= 6
      ? selected.number : calendarWeeks(id.slice(0, 7)).find((item) => item.id === id).number;
    if (!unique.has(id)) unique.set(id, week(date, number));
  });
  const weeks = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
  const courseIds = new Set();
  return cursos.flatMap((curso) => {
    if (curso?.id === undefined || curso.id === null || String(curso.id).trim() === "") {
      throw new Error("El curso seleccionado no tiene un identificador valido.");
    }
    if (courseIds.has(String(curso.id))) return [];
    courseIds.add(String(curso.id));
    const pages = [];
    for (let index = 0; index < weeks.length; index += 2) {
      pages.push({ curso, semanas: weeks.slice(index, index + 2) });
    }
    return pages;
  });
}
