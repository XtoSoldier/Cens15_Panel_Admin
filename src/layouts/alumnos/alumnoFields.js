export function matchesAlumnoSearch(alumno, search) {
  const query = search.trim().toLowerCase();
  return (
    !query ||
    `${alumno.apellidos || ""} ${alumno.nombres || ""}`.toLowerCase().includes(query) ||
    String(alumno.numeroDocumento ?? "").includes(query)
  );
}

export function formatAlumnoBirthDate(value) {
  if (!value) return "-";
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "-";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return "-";
  return date.split("-").reverse().join("/");
}

export function formatAlumnoGender(value) {
  if (value === "Varon") return "Var\u00f3n";
  if (value === "Mujer") return "Mujer";
  return "Sin informar";
}
