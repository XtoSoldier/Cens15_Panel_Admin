import { matchesAlumnoSearch, formatAlumnoBirthDate, formatAlumnoGender } from "./alumnoFields";

test("students without a DNI remain visible and searchable by name", () => {
  const alumno = { nombres: "Ana", apellidos: "Perez", numeroDocumento: null };
  expect(matchesAlumnoSearch(alumno, "")).toBe(true);
  expect(matchesAlumnoSearch(alumno, "  ANA ")).toBe(true);
  expect(matchesAlumnoSearch(alumno, "perez")).toBe(true);
  expect(matchesAlumnoSearch(alumno, "123")).toBe(false);
  expect(matchesAlumnoSearch({ ...alumno, numeroDocumento: "30123456" }, "123")).toBe(true);
});

test("missing and invalid birth dates never become a fake date", () => {
  [null, undefined, "", "Invalid Date", "2001-02-29"].forEach((value) => {
    expect(formatAlumnoBirthDate(value)).toBe("-");
  });
  expect(formatAlumnoBirthDate("2000-02-29")).toBe("29/02/2000");
  expect(formatAlumnoBirthDate("2000-02-29T00:00:00")).toBe("29/02/2000");
});

test("unknown gender is not assigned a default", () => {
  [null, undefined, ""].forEach((value) => expect(formatAlumnoGender(value)).toBe("Sin informar"));
  expect(formatAlumnoGender("Varon")).toBe("Var\u00f3n");
  expect(formatAlumnoGender("Mujer")).toBe("Mujer");
});
