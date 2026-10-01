import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import cursoService from "services/cursoService";
import materiaService from "services/materiaService";
import horarioAnexoService from "services/horarioAnexoService";
import { DAYS } from "./schedule";
import { dailyBlocks, courseOccupancy, assignmentStatus } from "./courseSchedule";

export default function CourseScheduleView({ anexoId, refreshKey }) {
  const [cursoId, setCursoId] = useState("");
  const [data, setData] = useState({ anexoid: "", cursos: [], materias: [], blocks: [], loading: true, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setData({ anexoid: String(anexoId), cursos: [], materias: [], blocks: [], loading: true, error: "" });
    setCursoId("");
    Promise.all([cursoService.getAll(), materiaService.getAll(), horarioAnexoService.getByAnexo(anexoId)])
      .then(([cursos, materias, blocks]) => {
        if (active) setData({ anexoid: String(anexoId), cursos: cursos.filter((curso) =>
          String(curso.id_anexo) === String(anexoId)), materias, blocks, loading: false, error: "" });
      }).catch((err) => {
        if (active) setData({ anexoid: String(anexoId), cursos: [], materias: [], blocks: [], loading: false, error: err.message });
      });
    return () => { active = false; };
  }, [anexoId, refreshKey, retry]);

  if (data.loading || data.anexoid !== String(anexoId)) return <MDBox py={3}><CircularProgress /></MDBox>;
  if (data.error) return <Alert severity="error" sx={{ mt: 3 }}>{data.error}
    <MDButton color="info" onClick={() => setRetry((value) => value + 1)}>Reintentar</MDButton>
  </Alert>;

  const materias = data.materias.filter((materia) => String(materia.cursoId) === String(cursoId));
  const occupied = courseOccupancy(materias, cursoId);
  const teachers = (materia) => {
    const active = (materia.docentes || []).filter((docente) => docente.activo);
    return active.length ? active.map((docente) => `${docente.docente} (${docente.rol} activo)`).join(", ") : "Sin docente activo";
  };

  return <MDBox mt={3}>
    <MDTypography variant="body2" color="text" mb={2}>
      Horarios guardados por curso. Esta vista no incluye cambios sin guardar de la grilla del anexo.
    </MDTypography>
    <TextField select label="Curso" value={cursoId} fullWidth onChange={(event) => setCursoId(event.target.value)}>
      <MenuItem value="">Seleccionar curso...</MenuItem>
      {data.cursos.map((curso) => <MenuItem key={curso.id} value={curso.id}>
        {curso.curso} {curso.division}{curso.orientacionNombre ? ` - ${curso.orientacionNombre}` : ""}
      </MenuItem>)}
    </TextField>
    {!data.cursos.length && <MDTypography variant="body2" mt={2}>No hay cursos en este anexo.</MDTypography>}
    {cursoId && <>
      <MDTypography variant="h6" mt={3} mb={2}>Horario semanal</MDTypography>
      <MDBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" }, gap: 2 }}>
        {DAYS.map((day) => <MDBox key={day.value} p={2} borderRadius="lg" sx={{ border: "1px solid", borderColor: "divider" }}>
          <MDTypography variant="h6" mb={1}>{day.label}</MDTypography>
          {dailyBlocks(data.blocks, day.value).map((block) => {
            const subjects = occupied.get(String(block.id)) || [];
            return <MDBox key={block.id} py={1}>
              <MDTypography variant="button" display="block" color={block.tipo === "Clase" ? "info" : "text"}>{block.label}</MDTypography>
              <MDTypography variant="caption" display="block">{block.horaInicio.slice(0, 5)} a {block.horaFin.slice(0, 5)}</MDTypography>
              {block.tipo === "Clase" && (subjects.length ? subjects.map((materia) => <MDBox key={materia.id} mt={0.5}>
                <MDTypography variant="button" display="block">{materia.nombre}</MDTypography>
                <MDTypography variant="caption" display="block">{teachers(materia)}</MDTypography>
              </MDBox>) : <MDTypography variant="caption" color="text">Hora libre</MDTypography>)}
            </MDBox>;
          })}
          {!dailyBlocks(data.blocks, day.value).length && <MDTypography variant="caption">Sin horarios</MDTypography>}
        </MDBox>)}
      </MDBox>
      <MDTypography variant="h6" mt={3}>Materias del curso</MDTypography>
      {!materias.length && <MDTypography variant="body2" mt={1}>No hay materias asignadas a este curso.</MDTypography>}
      {materias.map((materia) => <MDBox key={materia.id} py={1}>
        <MDTypography variant="button" display="block">{materia.nombre}</MDTypography>
        <MDTypography variant="caption" display="block">{assignmentStatus(materia)}</MDTypography>
        <MDTypography variant="caption" display="block">{teachers(materia)}</MDTypography>
      </MDBox>)}
    </>}
  </MDBox>;
}

CourseScheduleView.propTypes = {
  anexoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  refreshKey: PropTypes.number.isRequired,
};
