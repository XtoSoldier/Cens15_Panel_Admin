const normalizeSearchText = (value) =>
  String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function matchesSearch(query, fields) {
  const text = normalizeSearchText(fields.join(" "));
  return normalizeSearchText(query).trim().split(/\s+/).every((term) => text.includes(term));
}
