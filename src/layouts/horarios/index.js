import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import anexoService from "services/anexoService";
import horarioAnexoService from "services/horarioAnexoService";
import { DAYS, endTime, repeatDay, serializeSchedule, validateSchedule } from "./schedule";
import CourseScheduleView from "./CourseScheduleView";
import { defaultAnexoId } from "./courseSchedule";

export default function Horarios() {
  const [anexos, setAnexos] = useState([]);
  const [anexoId, setAnexoId] = useState("");
  const [day, setDay] = useState("Monday");
  const [blocks, setBlocks] = useState([]);
  const [loadingAnexos, setLoadingAnexos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [courseRefresh, setCourseRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    anexoService.getAll().then((data) => {
      if (active) {
        setAnexos(data);
        setAnexoId(defaultAnexoId(data));
      }
    }).catch((err) => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoadingAnexos(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!anexoId || !showEditor) return undefined;
    let active = true;
    setLoading(true);
    setLoaded(false);
    setError("");
    setSuccess("");
    horarioAnexoService.getByAnexo(anexoId).then((data) => {
      if (!active) return;
      setBlocks(data.sort((a, b) => a.orden - b.orden).map((block) => ({
        diaSemana: block.diaSemana,
        tipo: block.tipo,
        horaInicio: block.horaInicio.slice(0, 5),
        horaFin: block.horaFin.slice(0, 5),
      })));
      setDirty(false);
      setLoaded(true);
    }).catch((err) => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [anexoId, reload, showEditor]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const changeBlocks = (next) => {
    setBlocks(next);
    setDirty(true);
    setError("");
    setSuccess("");
  };

  const addBlock = (tipo) => {
    const daily = blocks.filter((block) => block.diaSemana === day);
    const start = daily.length ? daily[daily.length - 1].horaFin : "19:10";
    const end = endTime(start, tipo === "Clase" ? 40 : 10);
    if (!end) {
      setError("No hay tiempo disponible para agregar este bloque antes de medianoche.");
      return;
    }
    changeBlocks([...blocks, { diaSemana: day, tipo, horaInicio: start, horaFin: end }]);
  };

  const updateBlock = (index, field, value) => {
    changeBlocks(blocks.map((block, i) => {
      if (i !== index) return block;
      const next = { ...block, [field]: value };
      if (field === "horaInicio") {
        next.horaFin = endTime(value, block.tipo === "Clase" ? 40 : 10);
      }
      return next;
    }));
  };

  const save = async () => {
    const validation = validateSchedule(blocks);
    if (validation) { setError(validation); return; }
    setSaving(true);
    setError("");
    try {
      await horarioAnexoService.save(anexoId, serializeSchedule(blocks));
      setDirty(false);
      setSuccess("Grilla guardada para este anexo.");
      setCourseRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editable = loaded && !loading && !saving;
  const daily = blocks.map((block, index) => ({ ...block, index }))
    .filter((block) => block.diaSemana === day);
  let classNumber = 0;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card>
          <MDBox p={3}>
            <MDTypography variant="h5">Grilla de horarios</MDTypography>
            <MDTypography variant="body2" color="text" mt={1}>
              Consulta los horarios de cada curso y filtra los dias que necesitas visualizar.
            </MDTypography>
            <MDBox mt={3} maxWidth={420}>
              <TextField select fullWidth label="Anexo" value={anexoId}
                disabled={loadingAnexos || loading || saving}
                onChange={(event) => {
                  if (dirty && !window.confirm("Hay cambios sin guardar. Descartarlos y cambiar de anexo?")) return;
                  setBlocks([]);
                  setLoaded(false);
                  setDirty(false);
                  setShowEditor(false);
                  setError("");
                  setSuccess("");
                  setAnexoId(event.target.value);
                }}>
                {anexos.map((anexo) => <MenuItem key={anexo.id} value={anexo.id}>{anexo.nombre}</MenuItem>)}
              </TextField>
            </MDBox>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            <MDBox mt={2}>
              <MDButton variant="outlined" color="dark" disabled={!anexoId || loading || saving}
                onClick={() => {
                  if (showEditor && dirty && !window.confirm("Descartar los cambios sin guardar y ocultar la configuracion?")) return;
                  setDirty(false);
                  setError("");
                  setSuccess("");
                  setShowEditor((value) => !value);
                }}>
                <Icon sx={{ mr: 1 }}>{showEditor ? "visibility_off" : "settings"}</Icon>
                {showEditor ? "Ocultar configuracion del anexo" : "Mostrar configuracion del anexo"}
              </MDButton>
            </MDBox>
            {showEditor && <Alert severity="warning" sx={{ mt: 2 }}>
              Estas editando la grilla base del anexo. Los cambios afectan los bloques disponibles para todos sus cursos.
            </Alert>}
            {loadingAnexos || (showEditor && loading) ? (
              <MDBox py={4} textAlign="center"><CircularProgress /></MDBox>
            ) : !anexoId ? (
              <MDTypography variant="body2" color="text" mt={3}>
                {anexos.length ? "Selecciona un anexo para comenzar." : "Primero debes crear un anexo."}
              </MDTypography>
            ) : !showEditor ? null : !loaded ? (
              <MDButton color="info" onClick={() => setReload((value) => value + 1)} sx={{ mt: 2 }}>
                Reintentar carga
              </MDButton>
            ) : (
              <>
                <Tabs value={day} onChange={(_, value) => setDay(value)} variant="scrollable"
                  scrollButtons="auto" sx={{ mt: 3 }} aria-label="Dia de la semana">
                  {DAYS.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}
                </Tabs>
                <MDBox mt={3} display="flex" flexWrap="wrap" gap={1}>
                  <MDButton color="info" variant="outlined" disabled={!editable} onClick={() => addBlock("Clase")}>
                    Agregar hora (40 min)
                  </MDButton>
                  <MDButton color="dark" variant="outlined" disabled={!editable} onClick={() => addBlock("Receso")}>
                    Agregar receso (10 min)
                  </MDButton>
                  <MDButton color="info" disabled={!editable || !daily.length} onClick={() => {
                    const validation = validateSchedule(blocks.filter((block) => block.diaSemana === day));
                    if (validation) {
                      setError(validation);
                      return;
                    }
                    if (window.confirm("Se reemplazaran los horarios de lunes a viernes con los de este dia. Continuar?")) {
                      changeBlocks(repeatDay(blocks, day));
                    }
                  }}>Repetir horario para toda la semana</MDButton>
                </MDBox>
                <MDTypography variant="caption" color="text" display="block" mt={2}>
                  Al cambiar el inicio se propone la duracion predeterminada. Puedes ajustar el fin manualmente.
                </MDTypography>
                {!daily.length && <MDTypography variant="body2" color="text" py={3}>Este dia no tiene bloques. Agrega la primera hora.</MDTypography>}
                {daily.map((block) => {
                  const label = block.tipo === "Clase" ? `Hora ${++classNumber}` : "Receso";
                  return (
                    <MDBox key={block.index} mt={2} p={2} borderRadius="lg"
                      sx={{ border: "1px solid", borderColor: "divider", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
                      <MDTypography variant="button" fontWeight="bold" sx={{ minWidth: 80 }}>{label}</MDTypography>
                      <TextField type="time" label="Desde" value={block.horaInicio} disabled={!editable}
                        InputLabelProps={{ shrink: true }} inputProps={{ step: 60 }}
                        onChange={(event) => updateBlock(block.index, "horaInicio", event.target.value)} />
                      <TextField type="time" label="Hasta" value={block.horaFin} disabled={!editable}
                        InputLabelProps={{ shrink: true }} inputProps={{ step: 60 }}
                        onChange={(event) => updateBlock(block.index, "horaFin", event.target.value)} />
                      <IconButton aria-label={`Eliminar ${label}`} disabled={!editable} color="error"
                        onClick={() => changeBlocks(blocks.filter((_, index) => index !== block.index))}>
                        <Icon>delete</Icon>
                      </IconButton>
                    </MDBox>
                  );
                })}
                <MDBox mt={3} display="flex" alignItems="center" flexWrap="wrap" gap={2}>
                  <MDButton variant="gradient" color="info" onClick={save} disabled={!editable || !dirty}>
                    {saving ? "Guardando..." : "Guardar grilla"}
                  </MDButton>
                  {dirty && <MDTypography variant="caption" color="warning">Cambios sin guardar</MDTypography>}
                </MDBox>
                <MDTypography variant="h6" mt={4} mb={2}>Vista semanal</MDTypography>
                <MDBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" }, gap: 2 }}>
                  {DAYS.map((item) => {
                    let number = 0;
                    return (
                      <MDBox key={item.value} p={2} borderRadius="lg" sx={{ border: "1px solid", borderColor: "divider" }}>
                        <MDTypography variant="h6" mb={1}>{item.label}</MDTypography>
                        {blocks.filter((block) => block.diaSemana === item.value).map((block, index) => (
                          <MDBox key={index} py={1}>
                            <MDTypography variant="button" fontWeight="medium" display="block" color={block.tipo === "Clase" ? "info" : "text"}>
                              {block.tipo === "Clase" ? `Hora ${++number}` : "Receso"}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">{block.horaInicio || "--:--"} a {block.horaFin || "--:--"}</MDTypography>
                          </MDBox>
                        ))}
                        {!blocks.some((block) => block.diaSemana === item.value) && <MDTypography variant="caption" color="text">Sin horarios</MDTypography>}
                      </MDBox>
                    );
                  })}
                </MDBox>
              </>
            )}
            {anexoId && <CourseScheduleView key={anexoId} anexoId={anexoId} refreshKey={courseRefresh}
              anexoNombre={anexos.find((anexo) => String(anexo.id) === String(anexoId))?.nombre || ""} />}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
