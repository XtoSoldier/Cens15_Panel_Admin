import { endTime, repeatDay, serializeSchedule, validateSchedule } from "./schedule";

const blocks = [
  { diaSemana: "Monday", tipo: "Clase", horaInicio: "19:10", horaFin: "19:50" },
  { diaSemana: "Monday", tipo: "Receso", horaInicio: "19:50", horaFin: "20:00" },
  { diaSemana: "Monday", tipo: "Clase", horaInicio: "20:00", horaFin: "20:40" },
];

test("propone 40 minutos de clase y 10 de receso", () => {
  expect(endTime("19:10", 40)).toBe("19:50");
  expect(endTime("19:50", 10)).toBe("20:00");
});

test("no permite cruzar medianoche ni usar un inicio incompleto", () => {
  expect(endTime("23:40", 40)).toBe("");
  expect(endTime("", 40)).toBe("");
});

test("acepta bloques consecutivos y una grilla vacia", () => {
  expect(validateSchedule(blocks)).toBe("");
  expect(validateSchedule([])).toBe("");
});

test("rechaza superposiciones, fin anterior e inputs vacios", () => {
  expect(validateSchedule([...blocks, { ...blocks[2], horaInicio: "20:30" }])).toMatch(/superponerse/);
  expect(validateSchedule([{ ...blocks[0], horaFin: "19:00" }])).toMatch(/posterior/);
  expect(validateSchedule([{ ...blocks[0], horaInicio: "" }])).toMatch(/completa/);
});

test("valida todos los dias independientemente", () => {
  expect(validateSchedule([...blocks, { ...blocks[0], diaSemana: "Tuesday" }])).toBe("");
  expect(validateSchedule([...blocks, { ...blocks[0], diaSemana: "Friday", horaFin: "" }])).toMatch(/Viernes/);
});

test("repite el dia reemplazando los otros cuatro sin compartir objetos", () => {
  const result = repeatDay([...blocks, { ...blocks[0], diaSemana: "Tuesday", horaInicio: "18:00" }], "Monday");
  expect(result).toHaveLength(15);
  expect(result[3]).toEqual({ ...blocks[0], diaSemana: "Tuesday" });
  expect(result[0]).not.toBe(result[3]);
  expect(blocks[0].diaSemana).toBe("Monday");
});

test("serializa orden por dia y mantiene los recesos", () => {
  const result = serializeSchedule([...blocks, { ...blocks[0], diaSemana: "Tuesday" }]);
  expect(result.map((block) => block.orden)).toEqual([1, 2, 3, 1]);
  expect(result[1].tipo).toBe("Receso");
  expect(result[0].horaInicio).toBe("19:10:00");
});
