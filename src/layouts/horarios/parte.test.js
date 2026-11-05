import { buildPartePages, calendarWeeks } from "./parte";

test("includes only weeks whose working days intersect the selected month", () => {
  expect(calendarWeeks("2026-08")[0].monday).toBe("2026-08-03"); // Saturday start
  expect(calendarWeeks("2026-11")[0].monday).toBe("2026-11-02"); // Sunday start
  expect(calendarWeeks("2026-05")[0]).toMatchObject({ monday: "2026-04-27", friday: "2026-05-01", number: 1 });
  expect(calendarWeeks("2026-05")[0].monthLabel).toBe("abril 2026 / mayo 2026");
});

test("uses real dates across leap days and year boundaries", () => {
  const leap = calendarWeeks("2024-02").find((item) => item.monday === "2024-02-26");
  expect(leap.friday).toBe("2024-03-01");
  expect(leap.days[3]).toEqual({ value: "Thursday", label: "Jueves 29", date: "2024-02-29" });
  const crossing = calendarWeeks("2026-01")[0];
  expect(crossing).toMatchObject({ id: "2025-12-29", friday: "2026-01-02", monthLabel: "diciembre 2025 / enero 2026" });
  expect(crossing.label).toBe("Semana 1: 29/12/2025 al 02/01/2026");
  expect(crossing.days.map((day) => day.label)).toEqual(["Lunes 29", "Martes 30", "Mi\u00e9rcoles 31", "Jueves 1", "Viernes 2"]);
  expect(calendarWeeks("2026-11")[0].days.slice(0, 2).map((day) => day.label)).toEqual(["Lunes 2", "Martes 3"]);
});

test.each(["", "2026-00", "2026-13", "26-01", "2026-1", "2026-01-01", null, "0000-01"])("rejects malformed month %s", (value) => {
  expect(() => calendarWeeks(value)).toThrow(/mes valido/);
});

test("sorts and deduplicates selected weeks, pairs within each course and leaves odd halves empty", () => {
  const weeks = calendarWeeks("2026-11").slice(0, 3);
  const courses = [{ id: 1 }, { id: 2 }];
  const pages = buildPartePages({ cursos: courses, semanas: [weeks[2], weeks[0], weeks[1], weeks[0]] });
  expect(pages).toHaveLength(4);
  expect(pages.map((page) => page.curso.id)).toEqual([1, 1, 2, 2]);
  expect(pages.map((page) => page.semanas.length)).toEqual([2, 1, 2, 1]);
  expect(pages[0].semanas.map((item) => item.id)).toEqual(["2026-11-02", "2026-11-09"]);
  expect(pages[1].semanas[0].id).toBe("2026-11-16");
  expect(buildPartePages({ cursos: [courses[0], courses[0]], semanas: weeks })).toHaveLength(2);
});

test("deduplicates boundary weeks selected from different months and regenerates untrusted dates", () => {
  const december = calendarWeeks("2025-12").slice(-1)[0];
  const january = calendarWeeks("2026-01")[0];
  const pages = buildPartePages({ cursos: [{ id: 1 }], semanas: [december, { ...january, friday: "wrong", days: [{ label: "Fake" }] }] });
  expect(pages[0].semanas).toHaveLength(1);
  expect(pages[0].semanas[0].days[1].date).toBe("2025-12-30");
  expect(pages[0].semanas[0].friday).toBe("2026-01-02");
});

test.each(["2026-02-30", "2026-11-03", "2026-1-02", "2026-13-07", "not-a-date", "2024-02-29"])("rejects invalid Monday id %s", (id) => {
  expect(() => buildPartePages({ cursos: [{ id: 1 }], semanas: [{ id }] })).toThrow(/lunes real/);
});

test("rejects missing selections, invalid courses and conflicting Monday metadata", () => {
  expect(() => buildPartePages({ cursos: [], semanas: [] })).toThrow(/Selecciona/);
  expect(() => buildPartePages({ cursos: [{}], semanas: calendarWeeks("2026-11") })).toThrow(/identificador/);
  expect(() => buildPartePages({ cursos: [{ id: 1 }], semanas: [{ id: "2026-11-02", monday: "2026-11-09" }] })).toThrow(/lunes real/);
});
