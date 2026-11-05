import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert, Box, Button, Card, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import config from "config/api";
import checkpointService from "services/checkpointService";
import authService from "services/authService";
import { clearAuth } from "store/slices/authSlice";
import { descargarCheckpoint, filtrarCheckpoints, puedeRestaurar, previewValido, RESTORE_TEXT } from "./checkpointHelpers";

export default function Checkpoints({ disabled = false, onBusyChange }) {
  const admin = useSelector((state) => state.auth.currentUser?.role === "Admin");
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [filtro, setFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [claveImport, setClaveImport] = useState("");
  const [exportId, setExportId] = useState(null);
  const [claveExport, setClaveExport] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [vigente, setVigente] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [texto, setTexto] = useState("");
  const [respaldo, setRespaldo] = useState(true);
  const [aceptar, setAceptar] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [resultado, setResultado] = useState(null);
  const lock = useRef(false);
  const completed = useRef(false);
  const revision = useRef(0);
  const blocked = disabled || Boolean(busy) || Boolean(resultado);

  const resetConfirm = () => { setDialog(false); setTexto(""); setRespaldo(true); setAceptar(false); };
  const invalidar = () => { resetConfirm(); setVigente(false); setPreview(null); setSelectedId(null); };
  const cargar = async () => {
    const data = await checkpointService.listar();
    if (!Array.isArray(data)) throw new Error("La API no devolvio una lista de checkpoints valida.");
    setItems(data);
  };
  const ejecutar = async (label, action) => {
    if (!admin || disabled || lock.current || completed.current) return;
    lock.current = true;
    revision.current += 1;
    setBusy(label); setError(""); setAviso("");
    onBusyChange?.(true);
    try { await action(); } catch (err) { setError(err.message); } finally {
      lock.current = false; setBusy(""); onBusyChange?.(completed.current);
    }
  };

  useEffect(() => {
    if (!admin) return;
    let active = true;
    checkpointService.listar().then((data) => {
      if (!Array.isArray(data)) throw new Error("La API no devolvio una lista de checkpoints valida.");
      if (active && revision.current === 0) setItems(data);
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [admin]);

  const crear = (exportar) => ejecutar("Creando punto completo", async () => {
    invalidar();
    const punto = await checkpointService.crear(nombre.trim() || "Respaldo completo", descripcion.trim());
    if (!punto?.id) throw new Error("La API no confirmo el punto creado. Actualice la lista antes de repetir.");
    setItems((prev) => [punto, ...prev.filter((item) => item.id !== punto.id)]);
    setAviso("Punto de restauracion creado en el servidor.");
    if (exportar) { setClaveExport(""); setExportId(punto.id); }
  });

  const importar = () => {
    if (!archivo || claveImport.length < 12) return;
    ejecutar("Registrando respaldo cifrado", async () => {
      invalidar();
      const clave = claveImport;
      setClaveImport("");
      await checkpointService.importar(archivo, clave);
      setArchivo(null);
      setAviso("Respaldo registrado. NO se modifico la base de datos. Elija el punto y solicite una vista previa para restaurar.");
      await cargar();
    });
  };

  const verPreview = (id) => ejecutar("Calculando vista previa completa", async () => {
    invalidar(); setSelectedId(id);
    const data = await checkpointService.preview(id);
    setPreview(data); setVigente(previewValido(data, id));
  });

  const restaurar = () => {
    if (!vigente || !puedeRestaurar(preview, selectedId, texto, respaldo, aceptar)) return;
    ejecutar("Restaurando todo el destino", async () => {
      const options = { huella: preview.huella, confirmacion: texto, crearRespaldo: respaldo, aceptarSinRespaldo: !respaldo && aceptar };
      setVigente(false); resetConfirm();
      try {
        const data = await checkpointService.restaurar(selectedId, options);
        if (data?.restaurado !== true) throw new Error("La API no confirmo la restauracion.");
        completed.current = true;
        setResultado(data);
        // Do not issue authenticated requests after the server invalidates sessions.
      } catch (err) {
        if (err.reporte) {
          const report = err.reporte;
          setPreview((prev) => ({ ...prev,
            advertencias: [...(prev?.advertencias || []), ...(report.advertencias || [])],
            errores: [...(prev?.errores || []), ...(report.errores || [])],
          }));
        }
        if (!err.status) throw new Error("No se pudo confirmar el resultado de la restauracion. Verifique el destino antes de volver a intentar; no se puede asegurar que no hubo cambios. Genere una nueva vista previa.");
        throw new Error(`${err.message} ${err.status === 409 ? "La vista previa quedo obsoleta o fue rechazada. " : ""}Genere una nueva vista previa antes de restaurar.`);
      }
    });
  };

  if (!admin) return null;
  return <Card sx={{ p: { xs: 2, md: 3 } }}>
    <Stack spacing={2}>
      <Typography variant="h5">Respaldos completos y puntos de restauracion</Typography>
      <Alert severity="warning">
        Un respaldo completo NO es el JSON por seccion. Incluye TODOS los datos y relaciones: cuentas y credenciales bcrypt,
        historiales, calificaciones, bajas logicas, plantillas y archivos subidos. Contiene secretos: custodielo como un respaldo sensible.
        Se cifra en el servidor; guarde la clave por separado. No incluye binarios de la aplicacion, configuracion del servidor ni claves JWT.
      </Alert>
      <Typography variant="body2">
        Solo puede volver a un punto que haya sido creado; no hay recuperacion a una fecha arbitraria ni eliminacion automatica.
        Requiere un build con esquema compatible: no revierte migraciones de base de datos.
        La restauracion sobrescribe GLOBALMENTE todas las tablas y archivos, no combina datos.
        Invalida las sesiones: debera ingresar con las cuentas y credenciales del snapshot, que pueden ser distintas de las actuales.
      </Typography>
      <TextField label="Nombre del punto" value={nombre} disabled={blocked} onChange={(e) => setNombre(e.target.value)} />
      <TextField label="Descripcion del punto" value={descripcion} disabled={blocked} multiline onChange={(e) => setDescripcion(e.target.value)} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button disabled={blocked || !nombre.trim()} onClick={() => crear(false)}>Crear punto</Button>
        <Button disabled={blocked} onClick={() => crear(true)}>Exportar todo</Button>
        <Button disabled={blocked} onClick={() => ejecutar("Actualizando puntos", cargar)}>Actualizar puntos</Button>
      </Stack>
      <Typography variant="body2">Exportar todo primero crea un punto completo y luego pide una clave de al menos 12 caracteres para descargar el archivo cifrado .censbackup.</Typography>
      <Typography variant="h6">Registrar respaldo externo (sin restaurar)</Typography>
      <Typography component="label" htmlFor="checkpoint-file">Archivo cifrado .censbackup</Typography>
      <input id="checkpoint-file" type="file" accept=".censbackup" disabled={blocked} style={{ maxWidth: "100%" }} onChange={(e) => {
        const file = e.target.files[0]; e.target.value = "";
        if (blocked || lock.current) return;
        invalidar(); setClaveImport(""); setArchivo(null); setError("");
        if (file && !/\.censbackup$/i.test(file.name)) { setError("Seleccione un archivo .censbackup."); return; }
        setArchivo(file || null);
      }} />
      {archivo && <Typography variant="body2">{archivo.name}</Typography>}
      <TextField id="checkpoint-import-password" label="Clave del respaldo a registrar" type="password" autoComplete="new-password" value={claveImport} disabled={blocked} onChange={(e) => setClaveImport(e.target.value)} helperText="Minimo 12 caracteres. Solo se usa para esta operacion; no se guarda en el navegador." />
      <Button disabled={blocked || !archivo || claveImport.length < 12} onClick={importar}>Registrar respaldo sin restaurar</Button>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField label="Buscar punto por nombre" value={filtro} disabled={blocked} onChange={(e) => setFiltro(e.target.value)} />
        <TextField label="Desde (fecha local)" type="date" InputLabelProps={{ shrink: true }} value={desde} disabled={blocked} onChange={(e) => setDesde(e.target.value)} />
        <TextField label="Hasta (fecha local)" type="date" InputLabelProps={{ shrink: true }} value={hasta} disabled={blocked} onChange={(e) => setHasta(e.target.value)} />
      </Stack>
      {desde && hasta && desde > hasta && <Alert severity="warning">El rango de fechas esta invertido.</Alert>}
      <TableContainer><Table size="small" aria-label="Puntos de restauracion">
        <TableHead sx={{ display: "table-header-group" }}><TableRow>{["Punto / fecha local", "Contenido", "Acciones"].map((title) => <TableCell key={title}>{title}</TableCell>)}</TableRow></TableHead>
        <TableBody>{filtrarCheckpoints(items, filtro, desde, hasta).map((item) => <TableRow key={item.id} selected={selectedId === item.id}>
          <TableCell>{item.nombre}<br />{new Date(item.creadoEn).toLocaleString()}<br />{item.descripcion}<br />Creado por: {item.creadoPor || "No informado"}{item.automatico ? " (automatico)" : ""}</TableCell>
          <TableCell>{(item.tablas || []).map((tabla) => <Box key={tabla.entidad}>{tabla.entidad}: {tabla.cantidad}</Box>)}Archivos: {item.cantidadArchivos}. Tamano: {Number(item.tamanoBytes || 0).toLocaleString()} bytes.</TableCell>
          <TableCell><Stack spacing={1}>
            <Button disabled={blocked} onClick={() => { invalidar(); setClaveExport(""); setExportId(item.id); }}>Exportar</Button>
            <Button disabled={blocked} onClick={() => verPreview(item.id)}>Vista previa / Restaurar</Button>
          </Stack></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
      {!items.length && <Typography variant="body2">No hay puntos cargados. Cree o registre un respaldo; no se puede restaurar una fecha sin un punto existente.</Typography>}
      {busy && <Box role="status"><CircularProgress size={20} /> {busy}. Puede demorar hasta 300 segundos; no cierre la pagina.</Box>}
      {aviso && <Alert severity="success">{aviso}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {preview && <Stack spacing={2}>
        <Typography variant="h6">Vista previa del respaldo completo: {preview.nombre}</Typography>
        <Alert severity="warning">Fecha del punto: {new Date(preview.creadoEn).toLocaleString()}. DESTINO: {config.env}<Box sx={{ overflowWrap: "anywhere" }}>{config.apiBase}</Box>Sobrescritura GLOBAL, no combinacion. Los conteos snapshot son los conteos finales previstos.</Alert>
        {!vigente && <Alert severity="warning">Vista previa no valida o desactualizada. Solicite una nueva vista previa del punto elegido.</Alert>}
        <TableContainer><Table size="small" aria-label="Conteos de restauracion completa"><TableHead sx={{ display: "table-header-group" }}><TableRow><TableCell>Entidad</TableCell><TableCell>Actual</TableCell><TableCell>Snapshot (final)</TableCell></TableRow></TableHead>
          <TableBody>{(preview.tablas || []).map((row) => <TableRow key={row.entidad}><TableCell>{row.entidad}</TableCell><TableCell>{row.actual}</TableCell><TableCell>{row.snapshot}</TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>
        <Typography variant="body2">Archivos actuales: {preview.archivosActuales}. Archivos snapshot (final): {preview.archivosSnapshot}.</Typography>
        {(preview.advertencias || []).map((text, i) => <Alert severity="warning" key={`w-${i}`}>{text}</Alert>)}
        {(preview.errores || []).map((text, i) => <Alert severity="error" key={`e-${i}`}>{text}</Alert>)}
        <Button color="error" disabled={blocked || !vigente || !previewValido(preview, selectedId)} onClick={() => { resetConfirm(); setDialog(true); }}>Revisar restauracion completa</Button>
      </Stack>}
      {resultado && <Alert severity="success">
        {resultado.mensaje || "Restauracion confirmada por el servidor."} Respaldo previo: {resultado.respaldoPrevioId || "No creado"}.
        Debe volver a ingresar con una cuenta del snapshot. No se realizaran nuevas consultas con el token invalidado.
        <Button onClick={() => { authService.logout(); dispatch(clearAuth()); window.location.assign("/"); }}>Volver a iniciar sesion</Button>
      </Alert>}
    </Stack>
    <Dialog open={exportId !== null} onClose={() => { if (!busy) { setExportId(null); setClaveExport(""); } }} fullWidth maxWidth="sm">
      <DialogTitle>Exportar respaldo completo cifrado</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>Guarde esta clave separada del archivo .censbackup. Sin ella no podra registrar el respaldo.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {busy && <Typography role="status">{busy}. Espere hasta 300 segundos.</Typography>}
        <TextField id="checkpoint-export-password" label="Clave de cifrado" type="password" autoComplete="new-password" value={claveExport} disabled={blocked} onChange={(e) => setClaveExport(e.target.value)} helperText="Al menos 12 caracteres. No se almacena ni se incluye en la URL." />
      </Stack></DialogContent>
      <DialogActions><Button disabled={blocked} onClick={() => { setExportId(null); setClaveExport(""); resetConfirm(); }}>Cancelar exportacion</Button>
        <Button disabled={blocked || claveExport.length < 12} onClick={() => {
          if (claveExport.length < 12) return;
          ejecutar("Descargando respaldo cifrado", async () => {
            const id = exportId; const clave = claveExport; setClaveExport("");
            descargarCheckpoint(await checkpointService.exportar(id, clave)); setExportId(null);
          });
        }}>Descargar cifrado</Button></DialogActions>
    </Dialog>
    <Dialog open={dialog} onClose={() => { if (!busy) resetConfirm(); }} fullWidth maxWidth="sm">
      <DialogTitle>Confirmar restauracion completa</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="error">Se sobrescribiran TODAS las tablas y archivos del destino {config.env}<Box sx={{ overflowWrap: "anywhere" }}>{config.apiBase}</Box>Punto: {preview?.nombre}, {preview && new Date(preview.creadoEn).toLocaleString()}. No es una combinacion. Todas las sesiones quedaran invalidadas.</Alert>
        <FormControlLabel control={<Checkbox checked={respaldo} disabled={blocked} onChange={(e) => { setRespaldo(e.target.checked); setAceptar(false); }} />} label="Crear copia de seguridad del estado actual antes de restaurar" />
        {!respaldo && <FormControlLabel control={<Checkbox checked={aceptar} disabled={blocked} onChange={(e) => setAceptar(e.target.checked)} />} label="Acepto restaurar SIN copia de seguridad del estado actual y perder la posibilidad de recuperarlo con esta operacion" />}
        <Typography variant="body2">Si falla la copia de seguridad, el servidor debe abortar la restauracion. Revise cualquier error y genere una nueva vista previa.</Typography>
        <TextField id="checkpoint-confirm" label={`Escriba ${RESTORE_TEXT}`} autoComplete="off" value={texto} disabled={blocked} onChange={(e) => setTexto(e.target.value)} />
      </Stack></DialogContent>
      <DialogActions><Button disabled={blocked} onClick={resetConfirm}>Cancelar restauracion</Button>
        <Button color="error" disabled={blocked || !vigente || !puedeRestaurar(preview, selectedId, texto, respaldo, aceptar)} onClick={restaurar}>Confirmar restauracion</Button>
      </DialogActions>
    </Dialog>
  </Card>;
}

Checkpoints.propTypes = { disabled: PropTypes.bool, onBusyChange: PropTypes.func };
