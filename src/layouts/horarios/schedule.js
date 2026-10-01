export const DAYS = [
  { value: "Monday", label: "Lunes" },
  { value: "Tuesday", label: "Martes" },
  { value: "Wednesday", label: "Miercoles" },
  { value: "Thursday", label: "Jueves" },
  { value: "Friday", label: "Viernes" },
];

export function endTime(start, duration) {
  if (!/^\d{2}:\d{2}$/.test(start)) return "";
  const [hours, minutes] = start.split(":").map(Number);
  const total = hours * 60 + minutes + duration;
  if (hours > 23 || minutes > 59 || total >= 1440) return "";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function validateSchedule(blocks) {
  for (const day of DAYS) {
    const daily = blocks.filter((block) => block.diaSemana === day.value);
    let previousEnd = "";
    for (const block of daily) {
      if (![block.horaInicio, block.horaFin].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
        return `${day.label}: completa las horas de inicio y fin.`;
      }
      if (block.horaFin <= block.horaInicio) {
        return `${day.label}: el fin debe ser posterior al inicio, dentro del mismo dia.`;
      }
      if (block.horaInicio < previousEnd) {
        return `${day.label}: los bloques no pueden superponerse ni estar fuera de orden.`;
      }
      previousEnd = block.horaFin;
    }
  }
  return "";
}

export function repeatDay(blocks, sourceDay) {
  const source = blocks.filter((block) => block.diaSemana === sourceDay);
  return DAYS.flatMap((day) => source.map((block) => ({ ...block, diaSemana: day.value })));
}

export function serializeSchedule(blocks) {
  return DAYS.flatMap((day) =>
    blocks.filter((block) => block.diaSemana === day.value).map((block, index) => ({
      diaSemana: day.value,
      orden: index + 1,
      tipo: block.tipo,
      horaInicio: `${block.horaInicio}:00`,
      horaFin: `${block.horaFin}:00`,
    }))
  );
}
