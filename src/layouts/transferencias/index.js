import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert, Box, Button, Card, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, InputLabel, NativeSelect, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import config from "config/api";
import transferenciaService from "services/transferenciaService";
import authService from "services/authService";
import { clearAuth } from "store/slices/authSlice";
import Checkpoints from "./Checkpoints";
import {
  ALUMNOS_WARNING, REPLACE_WARNING, SECCIONES, leerPaquete, puedeConfirmar,
} from "./transferencia";

export default function Transferencias() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.currentUser);
  const [seccion, setSeccion] = useState("docentes");
  const [modo, setModo] = useState("actualizar");
  const [archivo, setArchivo] = useState(null);
  const [paquete, setPaquete] = useState(null);
  const [reporte, setReporte] = useState(null);
  const [vigente, setVigente] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState("");
  const [checkpointBusy, setCheckpointBusy] = useState(false);
  const checkpointLock = useRef(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const admin = currentUser?.role === "Admin";
  const sectionBlocked = Boolean(busy) || checkpointBusy || Boolean(reporte?.requiereReingreso);
  const habilitado = vigente && puedeConfirmar(paquete, reporte, seccion, modo);

  const invalidar = () => {
    setReporte(null);
    setVigente(false);
    setConfirmacion("");
    setDialog(false);
    setError("");
  };

  const ejecutar = async (label, action) => {
    if (lock.current || checkpointLock.current || reporte?.requiereReingreso || !admin) return;
    lock.current = true;
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy("");
    }
  };

  const exportar = (section) => ejecutar("Descargando archivo", async () => {
    const data = await transferenciaService.exportar(section);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cens15-${section}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const seleccionarArchivo = (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || lock.current || checkpointLock.current) return;
    invalidar();
    setPaquete(null);
    setArchivo(null);
    ejecutar("Leyendo archivo", async () => {
      const data = await leerPaquete(file, seccion);
      setPaquete(data);
      setArchivo({ nombre: file.name, size: file.size });
    });
  };

  const preview = () => ejecutar("Generando vista previa", async () => {
    invalidar();
    const data = await transferenciaService.preview(paquete, modo);
    setReporte(data);
    setVigente(true);
  });

  const importar = () => {
    if (!habilitado || (modo === "reemplazar" && confirmacion !== "REEMPLAZAR")) return;
    ejecutar("Importando datos", async () => {
      setVigente(false);
      setDialog(false);
      setConfirmacion("");
      try {
        const data = await transferenciaService.importar(paquete, modo, reporte.huella, modo === "reemplazar" ? confirmacion : "");
        setReporte(data);
        if (!data.importado) throw new Error("La API no confirmo la importacion. Revise el reporte y genere una nueva vista previa.");
        setArchivo(null);
        setPaquete(null);
      } catch (err) {
        if (err.reporte) setReporte(err.reporte);
        if (!err.status) {
          throw new Error("No se pudo confirmar el resultado de la importacion. Revise el destino y vuelva a generar vista previa antes de intentar nuevamente.");
        }
        if (err.status === 409) throw new Error("La importacion fue rechazada o la vista previa quedo obsoleta. Revise el reporte y genere una nueva vista previa.");
        throw err;
      }
    });
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box py={3}>
        <Typography variant="h4" mb={2}>Transferencia de datos</Typography>
        {!admin ? <Alert severity="warning">Solo el rol Admin puede acceder a las transferencias de datos.</Alert> : (
          <Stack spacing={3}>
            <Alert severity="info">
              <strong>DESTINO ACTUAL: {config.env}</strong>
              <Box sx={{ overflowWrap: "anywhere" }}>{config.apiBase}</Box>
              Las exportaciones leen este entorno; las importaciones escriben en este destino.
            </Alert>
            <Checkpoints disabled={Boolean(busy) || Boolean(reporte?.requiereReingreso)} onBusyChange={(value) => {
              checkpointLock.current = value; setCheckpointBusy(value);
            }} />
            <Typography variant="h5">JSON portable por seccion (no es un respaldo completo)</Typography>
            <Typography variant="body2">
              JSON portable versionado, con coincidencias por claves naturales, no por IDs.
              Orden recomendado: docentes, materias, horarios. Horarios crea prerrequisitos faltantes,
              pero bloquea diferencias con los existentes. Usuarios transfiere perfiles, no contrasenas,
              hashes, tokens ni sesiones. Los usuarios nuevos necesitan primer acceso.
              Solo el respaldo completo incluye historial academico y credenciales.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              {Object.entries(SECCIONES).map(([section, description]) => (
                <Card key={section} sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ textTransform: "capitalize" }}>{section}</Typography>
                  <Typography variant="body2" mb={2}>{description}</Typography>
                  {section === "alumnos" && <Alert severity="warning" sx={{ mb: 2 }}>{ALUMNOS_WARNING}</Alert>}
                  <Button variant="outlined" disabled={sectionBlocked} onClick={() => exportar(section)}>Exportar {section}</Button>
                </Card>
              ))}
            </Box>
            <Card sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Typography variant="h5">Importar al destino actual</Typography>
                <Alert severity="warning">{ALUMNOS_WARNING}</Alert>
                <Typography variant="body2">Los archivos contienen datos personales. Guardelos en un lugar seguro y compartalos solo por canales autorizados. Se envian unicamente a la API del destino al solicitar vista previa o importar. El servidor valida el contenido y su alcance real, independientemente de la metadata del archivo.</Typography>
                <FormControl fullWidth>
                  <InputLabel shrink htmlFor="transfer-section">Seccion a importar</InputLabel>
                  <NativeSelect value={seccion} disabled={sectionBlocked} inputProps={{ id: "transfer-section" }} onChange={(event) => {
                    invalidar(); setSeccion(event.target.value); setModo("actualizar"); setArchivo(null); setPaquete(null);
                  }}>
                    {Object.keys(SECCIONES).map((section) => <option key={section} value={section}>{section}</option>)}
                  </NativeSelect>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel shrink htmlFor="transfer-mode">Modo</InputLabel>
                  <NativeSelect value={modo} disabled={sectionBlocked} inputProps={{ id: "transfer-mode" }} onChange={(event) => {
                    invalidar(); setModo(event.target.value);
                  }}>
                    <option value="actualizar">Agregar / actualizar, sin eliminar ausentes</option>
                    <option value="reemplazar">Reemplazar globalmente la seccion</option>
                  </NativeSelect>
                </FormControl>
                {modo === "reemplazar" && <>
                  <Alert severity="warning">{REPLACE_WARNING}</Alert>
                  <Button disabled={sectionBlocked} onClick={() => exportar(seccion)}>Descargar respaldo del destino</Button>
                </>}
                <Box>
                  <Typography component="label" htmlFor="transfer-file" variant="body2" display="block">Archivo JSON (maximo 20 MiB menos 4096 bytes)</Typography>
                  <input id="transfer-file" type="file" accept=".json,application/json" disabled={sectionBlocked} onChange={seleccionarArchivo} style={{ maxWidth: "100%" }} />
                </Box>
                {archivo && paquete && <Alert severity="info">
                  Archivo: {archivo.nombre} ({archivo.size} bytes). Seccion de origen: {paquete.seccion}.
                  Exportado: {new Date(paquete.exportadoEn).toLocaleString()}.
                  Entorno de origen: no informado por el formato portable.
                </Alert>}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button variant="outlined" disabled={!paquete || sectionBlocked} onClick={preview}>Generar vista previa</Button>
                  <Button variant="contained" disabled={!habilitado || sectionBlocked} onClick={() => { setConfirmacion(""); setDialog(true); }}>Revisar importacion</Button>
                </Stack>
              </Stack>
            </Card>
            {busy && <Box role="status"><CircularProgress size={20} /> {busy}. Espere, puede demorar hasta 120 segundos.</Box>}
            {error && <Alert severity="error">{error}</Alert>}
            {reporte && <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h5">{reporte.importado ? "Importacion completada" : "Reporte de vista previa"}</Typography>
                 {reporte.importado && <Alert severity="success">Importacion confirmada por el servidor. Seleccione un archivo nuevamente para otra operacion.</Alert>}
                 {reporte.requiereReingreso && <Alert severity="warning">
                   Los cambios de usuarios o permisos invalidaron las sesiones anteriores. Ingrese nuevamente antes de realizar otra operacion.
                   <Button onClick={() => { authService.logout(); dispatch(clearAuth()); window.location.assign("/"); }}>Volver a iniciar sesion</Button>
                 </Alert>}
                {!reporte.importado && !vigente && <Alert severity="warning">Debe generar una nueva vista previa antes de importar.</Alert>}
                {(!reporte.puedeImportar || reporte.errores?.length > 0) && <Alert severity="warning">No se puede importar. Los conteos pueden ser parciales si hay errores.</Alert>}
                <TableContainer>
                  <Table size="small" aria-label="Resumen de transferencia">
                    <TableHead sx={{ display: "table-header-group" }}><TableRow>
                      {["Entidad (incluye prerrequisitos)", "Crear", "Actualizar", "Eliminar / baja"].map((title) => <TableCell key={title}>{title}</TableCell>)}
                    </TableRow></TableHead>
                    <TableBody>{(reporte.resumen || []).map((row, index) => <TableRow key={`${row.entidad}-${index}`}>
                      <TableCell>{row.entidad}</TableCell><TableCell>{row.crear}</TableCell><TableCell>{row.actualizar}</TableCell><TableCell>{row.eliminar}</TableCell>
                    </TableRow>)}</TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2">Actualizar incluye coincidencias aunque no cambien sus valores. Los prerrequisitos existentes no se sobrescriben.</Typography>
                {(reporte.advertencias || []).map((text, index) => <Alert severity="warning" key={`warning-${index}`}>{text}</Alert>)}
                {(reporte.errores || []).map((text, index) => <Alert severity="error" key={`error-${index}`}>{text}</Alert>)}
              </Stack>
            </Card>}
          </Stack>
        )}
      </Box>
      <Dialog open={dialog && admin} onClose={() => !sectionBlocked && setDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirmar importacion</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">Destino: {config.env}<Box sx={{ overflowWrap: "anywhere" }}>{config.apiBase}</Box>Seccion: {seccion}. Modo: {modo}.</Alert>
            <Typography variant="body2">Se aplicaran los cambios del reporte al destino indicado. No cierre la pagina durante la operacion.</Typography>
            {modo === "reemplazar" ? <>
              <Alert severity="error">{REPLACE_WARNING}</Alert>
              <TextField label="Escriba REEMPLAZAR" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} disabled={sectionBlocked} autoComplete="off" />
            </> : <Typography variant="body2">Se agregan o actualizan coincidencias. No se eliminan registros ausentes.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)} disabled={sectionBlocked}>Cancelar</Button>
          <Button color="error" onClick={importar} disabled={sectionBlocked || !habilitado || (modo === "reemplazar" && confirmacion !== "REEMPLAZAR")}>Confirmar importacion</Button>
        </DialogActions>
      </Dialog>
      <Footer />
    </DashboardLayout>
  );
}
