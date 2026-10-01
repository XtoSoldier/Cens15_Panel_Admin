export function dailyBlocks(blocks, day) {
  let number = 0;
  return blocks.filter((block) => block.diaSemana === day)
    .sort((a, b) => a.orden - b.orden)
    .map((block) => ({ ...block, label: block.tipo === "Clase" ? `Hora ${++number}` : "Receso" }));
}

export function courseOccupancy(materias, cursoId, excludedId) {
  const occupied = new Map();
  materias.filter((materia) => String(materia.cursoId) === String(cursoId) &&
    String(materia.id) !== String(excludedId)).forEach((materia) => {
    (materia.horarios || []).forEach((block) => {
      const key = String(block.id);
      occupied.set(key, [...(occupied.get(key) || []), materia]);
    });
  });
  return occupied;
}

export function validateAssignment(carga, ids, blocks, occupied, allowPendingLoad) {
  if (String(carga).trim() === "" || !Number.isInteger(Number(carga)) || Number(carga) < 0 ||
    (Number(carga) === 0 && (!allowPendingLoad || ids.length))) {
    return "La carga horaria debe ser un entero positivo.";
  }
  if (new Set(ids.map(String)).size !== ids.length) return "No se pueden repetir horarios.";
  if (ids.length && ids.length !== Number(carga)) {
    return "Selecciona exactamente la cantidad de horas indicada en la carga horaria, o ninguna para dejar pendiente.";
  }
  if (ids.some((id) => !blocks.some((block) => String(block.id) === String(id) && block.tipo === "Clase") ||
    occupied.has(String(id)))) {
    return "Hay horarios no disponibles. Revisa la seleccion para este curso.";
  }
  return "";
}

export function assignmentStatus(materia) {
  const count = (materia.horarios || []).length;
  if (!materia.cargaHoraria) return "Carga pendiente de configurar";
  return `${materia.cargaHoraria} horas semanales - ${count ? `${count} asignadas` : "Asignacion pendiente"}`;
}
