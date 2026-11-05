import { dailyBlocks, courseOccupancy, validateAssignment, assignmentStatus, defaultAnexoId, subjectColor, subjectPeriods, weeklyRows } from "./courseSchedule";

const blocks = [
  { id: 3, diaSemana: "Monday", orden: 3, tipo: "Clase" },
  { id: 2, diaSemana: "Monday", orden: 2, tipo: "Receso" },
  { id: 1, diaSemana: "Monday", orden: 1, tipo: "Clase" },
  { id: 4, diaSemana: "Tuesday", orden: 1, tipo: "Clase" },
];

test("numbers classes per day without counting breaks and sorts saved order", () => {
  expect(dailyBlocks(blocks, "Monday").map((block) => block.label)).toEqual(["Hora 1", "Receso", "Hora 2"]);
  expect(dailyBlocks(blocks, "Tuesday")[0].label).toBe("Hora 1");
  expect(blocks[0].id).toBe(3);
});

test("occupancy belongs to the course and excludes the subject being edited", () => {
  const materias = [
    { id: 10, cursoId: 1, nombre: "Propia", horarios: [{ id: 1 }] },
    { id: 11, cursoId: 1, nombre: "Otra", horarios: [{ id: 3 }] },
    { id: 12, cursoId: 2, nombre: "Otro curso", horarios: [{ id: 1 }] },
  ];
  const occupied = courseOccupancy(materias, "1", 10);
  expect(occupied.has("1")).toBe(false);
  expect(occupied.get("3")[0].nombre).toBe("Otra");
});

test("requires a positive whole load, permits legacy zero and pending assignment", () => {
  expect(validateAssignment(2, [], blocks, new Map(), false)).toBe("");
  expect(validateAssignment(0, [], blocks, new Map(), true)).toBe("");
  ["", " ", 0, -1, 1.5].forEach((load) => expect(validateAssignment(load, [], blocks, new Map(), false)).not.toBe(""));
  expect(validateAssignment(0, [1], blocks, new Map(), true)).not.toBe("");
});

test("requires exact count and valid available class ids", () => {
  expect(validateAssignment(2, [1, 3], blocks, new Map(), false)).toBe("");
  [[1], [1, 2], [1, 99], [1, 1]].forEach((ids) =>
    expect(validateAssignment(2, ids, blocks, new Map(), false)).not.toBe(""));
  expect(validateAssignment(2, [1, 3], blocks, new Map([["3", []]]), false)).not.toBe("");
});

test("reports legacy, unassigned and assigned states", () => {
  expect(assignmentStatus({ cargaHoraria: 0 })).toMatch(/Carga pendiente/);
  expect(assignmentStatus({ cargaHoraria: 2 })).toMatch(/Asignacion pendiente/);
  expect(assignmentStatus({ cargaHoraria: 2, horarios: [{ id: 1 }, { id: 3 }] })).toMatch(/2 asignadas/);
});

test("selects ESC. 41 regardless of capitalization and punctuation, without selecting another annex", () => {
  expect(defaultAnexoId([{ id: 1, nombre: "Otro" }, { id: 2, nombre: "Esc. 41" }])).toBe(2);
  expect(defaultAnexoId([{ id: 3, nombre: " ESC.  41 " }])).toBe(3);
  expect(defaultAnexoId([{ id: 1, nombre: "Esc. 410" }])).toBe("");
});

test("subject colors are stable across days and independent of filters", () => {
  expect(subjectColor({ id: 15 })).toEqual(subjectColor({ id: 15, nombre: "Matematica" }));
  expect(subjectColor({ id: 15 })).not.toEqual(subjectColor({ id: 16 }));
  expect(subjectColor({ id: 15 }).background).toMatch(/52%, 91%/);
});

test("subject detail includes all assigned days, in weekly order, without another subject's hours", () => {
  const materia = { horarios: [{ id: 4 }, { id: 3 }, { id: 1 }] };
  expect(subjectPeriods(materia, blocks).map((block) => [block.id, block.dayLabel, block.label]))
    .toEqual([[1, "Lunes", "Hora 1"], [3, "Lunes", "Hora 2"], [4, "Martes", "Hora 1"]]);
});

test("weekly index shares matching periods but does not merge different times or class numbers", () => {
  const monday = { id: 1, diaSemana: "Monday", orden: 1, tipo: "Clase", horaInicio: "19:10:00", horaFin: "19:50:00" };
  const tuesday = { ...monday, id: 2, diaSemana: "Tuesday" };
  const days = [{ value: "Monday" }, { value: "Tuesday" }];
  const shared = weeklyRows([tuesday, monday], days);
  expect(shared).toHaveLength(1);
  expect(shared[0].blocks.Monday.id).toBe(1);
  expect(shared[0].blocks.Tuesday.id).toBe(2);
  const different = weeklyRows([monday, { ...tuesday, horaInicio: "20:00:00", horaFin: "20:40:00" }], days);
  expect(different).toHaveLength(2);
  expect(different[0].blocks.Tuesday).toBeUndefined();
  expect(different[1].blocks.Monday).toBeUndefined();
  expect(weeklyRows([monday, tuesday], [{ value: "Monday" }])).toHaveLength(1);
});
