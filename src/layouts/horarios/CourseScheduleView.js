import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import cursoService from "services/cursoService";
import materiaService from "services/materiaService";
import horarioAnexoService from "services/horarioAnexoService";
import { DAYS } from "./schedule";
import { weeklyRows, courseOccupancy, subjectColor, subjectPeriods } from "./courseSchedule";
import ParteDialog from "./ParteDialog";

const courseLabel = (curso) => `${curso.curso} ${curso.division}`;
const teachers = (materia) => {
  const active = (materia.docentes || []).filter((docente) => docente.activo);
  return active.length ? active.map((docente) => `${docente.docente} (${docente.rol})`).join(", ") : "Sin docente activo";
};

export default function CourseScheduleView({ anexoId, anexoNombre, refreshKey }) {
  const [hiddenCourses, setHiddenCourses] = useState([]);
  const [selectedDays, setSelectedDays] = useState(DAYS.map((day) => day.value));
  const [detail, setDetail] = useState(null);
  const [parteCourses, setParteCourses] = useState(null);
  const [data, setData] = useState({ anexoid: "", cursos: [], materias: [], blocks: [], loading: true, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setParteCourses(null);
    setData({ anexoid: String(anexoId), cursos: [], materias: [], blocks: [], loading: true, error: "" });
    Promise.all([cursoService.getAll(), materiaService.getAll(), horarioAnexoService.getByAnexo(anexoId)])
      .then(([cursos, materias, blocks]) => {
        if (active) setData({ anexoid: String(anexoId), cursos: cursos.filter((curso) =>
          String(curso.id_anexo) === String(anexoId)).sort((a, b) => courseLabel(a).localeCompare(courseLabel(b))),
          materias, blocks, loading: false, error: "" });
      }).catch((err) => {
        if (active) setData({ anexoid: String(anexoId), cursos: [], materias: [], blocks: [], loading: false, error: err.message });
      });
    return () => { active = false; };
  }, [anexoId, refreshKey, retry]);

  if (data.loading || data.anexoid !== String(anexoId)) return <MDBox py={3}><CircularProgress /></MDBox>;
  if (data.error) return <Alert severity="error" sx={{ mt: 3 }}>{data.error}
    <MDButton color="info" onClick={() => setRetry((value) => value + 1)}>Reintentar</MDButton>
  </Alert>;

  const days = DAYS.filter((day) => selectedDays.includes(day.value));
  const courses = data.cursos.filter((curso) => !hiddenCourses.includes(String(curso.id)));
  const rows = weeklyRows(data.blocks, days);

  return <MDBox mt={3}>
    <MDBox mb={2}>
      <MDButton color="info" variant="gradient" disabled={!courses.length || !data.blocks.length}
        onClick={() => setParteCourses(courses.map((curso) => curso.id))}>
        Generar Planilla de Parte
      </MDButton>
    </MDBox>
    <MDBox p={2} borderRadius="lg" sx={{ border: "1px solid", borderColor: "divider" }}>
      <MDBox display="flex" alignItems="center" flexWrap="wrap" gap={1}>
        <MDTypography variant="h6" sx={{ mr: "auto" }}>Cursos visibles</MDTypography>
        <MDButton variant="text" color="info" size="small" onClick={() => setHiddenCourses([])}>Todos</MDButton>
        <MDButton variant="text" color="dark" size="small" onClick={() => setHiddenCourses(data.cursos.map((curso) => String(curso.id)))}>Ninguno</MDButton>
      </MDBox>
      <MDBox display="flex" flexWrap="wrap" gap={1}>
        {data.cursos.map((curso) => <FormControlLabel key={curso.id}
          control={<Checkbox checked={!hiddenCourses.includes(String(curso.id))}
            onChange={(_, checked) => setHiddenCourses((current) => checked
              ? current.filter((id) => id !== String(curso.id)) : [...current, String(curso.id)])} />}
          label={<MDTypography variant="button">{courseLabel(curso)}{curso.orientacionNombreCorto ? ` - ${curso.orientacionNombreCorto}` : ""}</MDTypography>} />)}
      </MDBox>
      <MDBox display="flex" alignItems="center" flexWrap="wrap" gap={1} mt={2}>
        <MDTypography variant="h6" sx={{ mr: "auto" }}>Dias visibles</MDTypography>
        <MDButton variant="text" color="info" size="small" onClick={() => setSelectedDays(DAYS.map((day) => day.value))}>Toda la semana</MDButton>
      </MDBox>
      <MDBox display="flex" flexWrap="wrap" gap={1}>
        {DAYS.map((day) => <FormControlLabel key={day.value}
          control={<Checkbox checked={selectedDays.includes(day.value)}
            onChange={(_, checked) => setSelectedDays((current) => checked
              ? [...current, day.value] : current.filter((value) => value !== day.value))} />}
          label={<MDTypography variant="button">{day.label}</MDTypography>} />)}
      </MDBox>
    </MDBox>

    {!data.cursos.length ? <MDTypography variant="body2" mt={3}>No hay cursos en este anexo.</MDTypography>
      : !courses.length ? <MDTypography variant="body2" mt={3}>Selecciona al menos un curso para visualizar su grilla.</MDTypography>
      : !days.length ? <MDTypography variant="body2" mt={3}>Selecciona al menos un dia para visualizar los horarios.</MDTypography>
      : courses.map((curso) => {
        const occupied = courseOccupancy(data.materias, curso.id);
        return <Card key={curso.id} variant="outlined" sx={{ mt: 3, boxShadow: "none", overflow: "hidden" }}>
          <MDBox px={3} py={1.25} sx={{ borderBottom: "1px solid", borderColor: "divider", borderTop: "4px solid", borderTopColor: "info.main", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <MDBox>
            <MDTypography variant="overline" color="text">{anexoNombre || curso.anexoNombre} / Horario por curso</MDTypography>
            <MDTypography variant="h5">{courseLabel(curso)}</MDTypography>
            {curso.orientacionNombreCorto && <MDTypography variant="body2" color="text">{curso.orientacionNombreCorto}</MDTypography>}
            </MDBox>
            <MDButton size="small" color="info" variant="outlined" disabled={!data.blocks.length}
              onClick={() => setParteCourses([curso.id])}>
              Generar parte de este curso
            </MDButton>
          </MDBox>
          <MDBox p={{ xs: 1, md: 1.5 }} sx={{ overflowX: "auto" }}>
            <MDBox component="table" aria-label={`Horario de ${courseLabel(curso)}`}
              sx={{ width: "100%", minWidth: 124 + days.length * 156, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "8px 6px" }}>
              <colgroup><col style={{ width: 124 }} />{days.map((day) => <col key={day.value} />)}</colgroup>
              <thead><tr>
                <MDBox component="th" scope="col" sx={{ position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper", textAlign: "left" }}>
                  <MDTypography variant="h6">Hora</MDTypography>
                </MDBox>
                {days.map((day) => <MDBox component="th" scope="col" key={day.value} sx={{ textAlign: "left" }}>
                  <MDTypography variant="h6">{day.label}</MDTypography>
                </MDBox>)}
              </tr></thead>
              <tbody>
                {rows.map((row) => <tr key={row.key}>
                  <MDBox component="th" scope="row" px={1} py={0.25} borderRadius="md"
                    sx={{ position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper", textAlign: "left", verticalAlign: "middle" }}>
                    <MDTypography variant="caption" fontWeight="bold" display="block" sx={{ lineHeight: 1.2 }}>{row.label}</MDTypography>
                    <MDTypography variant="caption" color="text" display="block" sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}>
                      {row.horaInicio.slice(0, 5)} a {row.horaFin.slice(0, 5)}
                    </MDTypography>
                  </MDBox>
                  {days.map((day) => {
                    const block = row.blocks[day.value];
                    const subjects = block ? occupied.get(String(block.id)) || [] : [];
                    return <MDBox component="td" key={day.value} sx={{ p: 0, verticalAlign: "top" }}>
                      {!block ? <MDBox px={1.5} py={0.5}>
                        <MDTypography variant="caption" color="text">Sin bloque</MDTypography>
                      </MDBox> : block.tipo !== "Clase" ? <MDBox px={1} py={0.5} borderRadius="md"
                        sx={{ bgcolor: "#f1ede5", border: "1px solid #e4ddd1", minHeight: 30 }}>
                        <MDTypography variant="caption" sx={{ color: "#6b604e" }}>Receso</MDTypography>
                      </MDBox> : <Card sx={{ borderRadius: 2, border: "1px solid #dde2e8", boxShadow: "none", overflow: "hidden" }}>
                        {subjects.length ? subjects.map((materia) => {
                          const color = subjectColor(materia);
                          return <CardActionArea key={materia.id} onClick={() => setDetail({ materia, curso })}
                            aria-label={`Ver horarios de ${materia.nombre} - ${courseLabel(curso)}`}
                            sx={{ bgcolor: color.background, borderLeft: `3px solid ${color.border}`, px: 1.5, py: 0.75, minHeight: 56 }}>
                            <MDTypography variant="button" fontWeight="bold" sx={{ color: "#293343", overflowWrap: "anywhere" }} display="block">{materia.nombre}</MDTypography>
                            <MDTypography variant="caption" sx={{ color: "#465264", overflowWrap: "anywhere" }} display="block" mt={0.25}>{teachers(materia)}</MDTypography>
                          </CardActionArea>;
                        }) : <MDBox px={1.5} py={0.75} sx={{ bgcolor: "#f3f5f7", minHeight: 56 }}>
                          <MDTypography variant="button" sx={{ color: "#677384" }}>Hora libre</MDTypography>
                        </MDBox>}
                      </Card>}
                    </MDBox>;
                  })}
                </tr>)}
                {!rows.length && <tr><td colSpan={days.length + 1}>
                  <MDTypography variant="caption" color="text">Sin horarios configurados para los dias seleccionados</MDTypography>
                </td></tr>}
              </tbody>
            </MDBox>
          </MDBox>
        </Card>;
      })}

    <ParteDialog open={parteCourses !== null} onClose={() => setParteCourses(null)} initialCourseIds={parteCourses || []}
      cursos={data.cursos} materias={data.materias} bloques={data.blocks} anexoNombre={anexoNombre} />
    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
      {detail && <>
        <DialogTitle>{detail.materia.nombre}</DialogTitle>
        <DialogContent>
          <MDTypography variant="h6">Curso {courseLabel(detail.curso)}</MDTypography>
          <MDTypography variant="body2" color="text">{anexoNombre || detail.curso.anexoNombre}</MDTypography>
          <MDTypography variant="body2" mt={2}>{teachers(detail.materia)}</MDTypography>
          <MDTypography variant="body2" mt={1}>Carga horaria: {detail.materia.cargaHoraria} horas catedra semanales</MDTypography>
          <MDTypography variant="h6" mt={3} mb={1}>Todos los dias y horarios</MDTypography>
          {subjectPeriods(detail.materia, data.blocks).map((block) => <MDBox key={block.id} py={1} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
            <MDTypography variant="button" fontWeight="bold" display="block">{block.dayLabel} / {block.label}</MDTypography>
            <MDTypography variant="body2" color="text">{block.horaInicio.slice(0, 5)} a {block.horaFin.slice(0, 5)}</MDTypography>
          </MDBox>)}
        </DialogContent>
        <DialogActions><MDButton color="info" onClick={() => setDetail(null)}>Cerrar</MDButton></DialogActions>
      </>}
    </Dialog>
  </MDBox>;
}

CourseScheduleView.propTypes = {
  anexoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  anexoNombre: PropTypes.string.isRequired,
  refreshKey: PropTypes.number.isRequired,
};
