import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography,
} from "@mui/material";
import { getLuminance } from "@mui/material/styles";
import { calendarWeeks } from "./parte";

const actionButtonSx = (theme) => {
  const dark = getLuminance(theme.palette.background.paper) < 0.5;
  const action = dark ? "#bfdbfe" : "#1555a0";
  const hover = dark ? "#dbeafe" : "#103f78";
  const onAction = dark ? "#14213d" : "#ffffff";
  return {
    color: action,
    opacity: 1,
    "&:hover, &:focus:not(:hover)": { color: action, backgroundColor: dark ? "#283e59" : "#eaf2ff", opacity: 1 },
    "&:focus-visible, &.Mui-focusVisible": { outline: `3px solid ${action}`, outlineOffset: 2 },
    "&.MuiButton-outlined": {
      color: action,
      borderColor: action,
      "&:hover, &:focus:not(:hover)": { color: action, borderColor: action },
    },
    "&.MuiButton-contained": {
      color: onAction,
      backgroundColor: action,
      boxShadow: "none",
      "&:hover, &:focus:not(:hover), &:active": { color: onAction, backgroundColor: hover, opacity: 1 },
    },
    "&.Mui-disabled": {
      color: dark ? "#aebdce" : "#526176",
      backgroundColor: dark ? "#2d3748" : "#e2e8f0",
      border: "1px solid",
      borderColor: dark ? "#526176" : "#b8c3d1",
      boxShadow: "none",
      opacity: 1,
    },
  };
};

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function ParteDialog({ open, onClose, cursos, initialCourseIds, materias, bloques, anexoNombre }) {
  const [month, setMonth] = useState(currentMonth);
  const [courseIds, setCourseIds] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [institucion, setInstitucion] = useState("CENS N\u00b0 15");
  const [datosInstitucion, setDatosInstitucion] = useState("");
  const [sinColores, setSinColores] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const working = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    setMonth(currentMonth());
    setCourseIds(initialCourseIds.map(String));
    setWeeks([]);
    setPreview(null);
    setError("");
  }, [open, initialCourseIds]);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  useEffect(() => {
    if (!open) setPreview(null);
  }, [open]);

  const invalidar = () => { setPreview(null); setError(""); };
  let calendar = [];
  try { if (month) calendar = calendarWeeks(month); } catch { /* Invalid/incomplete month cannot add weeks. */ }
  const selectedCourses = cursos.filter((curso) => courseIds.includes(String(curso.id)));
  const orderedWeeks = [...weeks].sort((a, b) => a.id.localeCompare(b.id));
  const canGenerate = selectedCourses.length > 0 && weeks.length > 0 && institucion.trim().length > 0;

  const generate = async (withoutColors = sinColores) => {
    if (!canGenerate || working.current) return;
    working.current = true;
    setBusy(true);
    invalidar();
    try {
      const { createPartePdf } = await import("./partePdf");
      const result = createPartePdf({ cursos: selectedCourses, semanas: orderedWeeks,
        materias, bloques, institucion: institucion.trim(), datosInstitucion: datosInstitucion.trim(), anexoNombre,
        sinColores: withoutColors });
      if (mounted.current) setPreview({ url: URL.createObjectURL(result.blob), blob: result.blob,
        filename: result.filename, pageCount: result.pageCount, planillaCount: result.planillaCount });
    } catch (err) {
      if (mounted.current) setError(err.message || "No se pudo generar la planilla de parte.");
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const download = () => {
    if (!preview || busy) return;
    const link = document.createElement("a");
    link.href = preview.url;
    link.download = preview.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="lg" aria-labelledby="parte-dialog-title">
    <DialogTitle id="parte-dialog-title">Generar Planilla de Parte</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="info">
          Anexo: <strong>{anexoNombre}</strong>. Se utiliza la grilla guardada completa de lunes a viernes,
          independientemente del filtro de dias de la pantalla. Cada hoja A4 horizontal contiene dos semanas distintas
          del mismo curso, una arriba y otra debajo, separadas por una linea de corte.
        </Alert>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Institucion" value={institucion} disabled={busy} fullWidth inputProps={{ maxLength: 120 }}
            onChange={(event) => { invalidar(); setInstitucion(event.target.value); }} />
          <TextField label="Datos institucionales (opcional)" value={datosInstitucion} disabled={busy} fullWidth
            placeholder="Direccion, localidad o telefono" inputProps={{ maxLength: 180 }}
            onChange={(event) => { invalidar(); setDatosInstitucion(event.target.value); }} />
        </Stack>
        <Box>
          <Typography variant="h6">Cursos a generar</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {cursos.map((curso) => <FormControlLabel key={curso.id}
              control={<Checkbox disabled={busy} checked={courseIds.includes(String(curso.id))}
                onChange={(_, checked) => {
                  invalidar();
                  setCourseIds((ids) => checked ? [...ids, String(curso.id)] : ids.filter((id) => id !== String(curso.id)));
                }} />}
              label={`${curso.curso} ${curso.division}${curso.orientacionNombreCorto ? ` - ${curso.orientacionNombreCorto}` : ""}`} />)}
          </Box>
          <Button sx={actionButtonSx} disabled={busy} onClick={() => { invalidar(); setCourseIds(cursos.map((curso) => String(curso.id))); }}>Seleccionar todos los cursos</Button>
          <Button sx={actionButtonSx} disabled={busy} onClick={() => { invalidar(); setCourseIds([]); }}>Quitar todos los cursos</Button>
        </Box>
        <Box>
          <Typography variant="h6" mb={2}>Que semanas del calendario desea generar</Typography>
          <TextField type="month" label="Mes del calendario" value={month} disabled={busy}
            InputLabelProps={{ shrink: true }} inputProps={{ min: "1000-01", max: "9998-12" }}
            onChange={(event) => { invalidar(); setMonth(event.target.value); }} />
          <Box mt={1}>
            {calendar.map((week) => <FormControlLabel key={week.id} sx={{ display: "flex" }}
              control={<Checkbox disabled={busy} checked={weeks.some((selected) => selected.id === week.id)}
                onChange={(_, checked) => {
                  invalidar();
                  setWeeks((selected) => checked ? [...selected, week] : selected.filter((item) => item.id !== week.id));
                }} />}
              label={`${week.label} (${week.monthLabel})`} />)}
          </Box>
          <Button sx={actionButtonSx} disabled={busy || !calendar.length} onClick={() => {
            invalidar();
            setWeeks((selected) => [...new Map([...selected, ...calendar].map((week) => [week.id, week])).values()]);
          }}>Agregar todas las semanas del mes</Button>
          <Typography variant="caption" display="block">Podes cambiar de mes y conservar las semanas ya seleccionadas.</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" mb={1}>Semanas seleccionadas: {weeks.length}</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {orderedWeeks.map((week) => <Chip key={week.id} label={week.label} disabled={busy}
              onDelete={busy ? undefined : () => { invalidar(); setWeeks((selected) => selected.filter((item) => item.id !== week.id)); }} />)}
          </Box>
          {weeks.length > 0 && <Button sx={actionButtonSx} disabled={busy} onClick={() => { invalidar(); setWeeks([]); }}>Quitar todas las semanas</Button>}
          <Typography variant="body2" mt={1}>
            {selectedCourses.length} curso(s), {weeks.length * selectedCourses.length} planilla(s),
            {` ${selectedCourses.length * Math.ceil(weeks.length / 2)} hoja(s) A4 horizontal.`}
            {weeks.length % 2 === 1 ? " La ultima mitad de cada curso quedara vacia; no se repite ninguna semana." : ""}
          </Typography>
        </Box>
        <Box>
          <FormControlLabel label="Quitar colores de fondo"
            control={<Checkbox checked={sinColores} disabled={busy} onChange={(_, checked) => {
              setSinColores(checked);
              if (preview) void generate(checked);
              else invalidar();
            }} />} />
          <Typography variant="caption" display="block">Se aplica a todas las celdas. Si ya hay una vista previa, se regenera automaticamente y la descarga usa esa misma version.</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {busy && <Box role="status" display="flex" alignItems="center" gap={1}><CircularProgress size={20} />Generando PDF...</Box>}
        {preview && <Box>
          <Typography variant="h6" mb={1}>Vista previa del PDF</Typography>
          <Typography variant="body2" mb={1}>{preview.planillaCount} planillas en {preview.pageCount} hojas A4 horizontales. Se descargara este mismo archivo.</Typography>
          <Box component="iframe" src={preview.url} title="Vista previa PDF de planillas de parte"
            sx={{ display: "block", width: "100%", height: { xs: 360, md: 560 }, border: "1px solid", borderColor: "divider", borderRadius: 1 }} />
          <Button sx={actionButtonSx} component="a" href={preview.url} target="_blank" rel="noopener noreferrer">Abrir vista previa en otra pestana</Button>
        </Box>}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
      <Button sx={actionButtonSx} disabled={busy} onClick={onClose}>Cerrar</Button>
      <Button sx={actionButtonSx} variant="outlined" disabled={busy || !canGenerate} onClick={() => generate()}>Generar vista previa</Button>
      <Button sx={actionButtonSx} variant="contained" disabled={busy || !preview} onClick={download}>Descargar PDF</Button>
    </DialogActions>
  </Dialog>;
}

ParteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cursos: PropTypes.array.isRequired,
  initialCourseIds: PropTypes.array.isRequired,
  materias: PropTypes.array.isRequired,
  bloques: PropTypes.array.isRequired,
  anexoNombre: PropTypes.string.isRequired,
};
