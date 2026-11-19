import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";

import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import alumnoService from "services/alumnoService";
import { matchesAlumnoSearch, formatAlumnoBirthDate, formatAlumnoGender } from "./alumnoFields";

const dependencyLabels = {
  Calificaciones: "Calificaciones",
  CursadasMaterias: "Cursadas de materias",
  Inscripciones: "Inscripciones",
  AlumnoDocumentos: "Documentos del alumno",
  AlumnoContactos: "Datos de contacto",
  AlumnoNacimientos: "Datos de nacimiento",
  Alumnos: "Alumno",
};

function RestoreModal({ alumno, loading, onClose, onConfirm }) {
  return (
    <Dialog open={Boolean(alumno)} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Restaurar alumno</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          ¿Restaurar a {alumno ? `${alumno.apellidos}, ${alumno.nombres}` : ""}? Volverá a
          visualizarse con sus inscripciones, cursos y calificaciones.
        </MDTypography>
      </DialogContent>
      <DialogActions>
        <MDButton variant="outlined" color="dark" onClick={onClose} disabled={loading}>
          Cancelar
        </MDButton>
        <MDButton variant="gradient" color="success" onClick={onConfirm} disabled={loading}>
          {loading ? "Restaurando..." : "Restaurar"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

RestoreModal.propTypes = {
  alumno: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

function Alumnos() {
  const currentUser = useSelector((state) => state.auth.currentUser);
  const normalizedRole = String(currentUser?.role || "")
    .replace(/\s/g, "")
    .toLowerCase();
  const canRestore = normalizedRole === "admin" || normalizedRole === "superadmin";

  const [alumnos, setAlumnos] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoreItem, setRestoreItem] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [permanentItem, setPermanentItem] = useState(null);
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [checkingDeletion, setCheckingDeletion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const deletionRequest = useRef(0);
  const deletionPending = useRef(false);

  const fetchAlumnos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await alumnoService.getAll(canRestore);
      setAlumnos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar el listado de alumnos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnos();
  }, [canRestore]);

  const filteredAlumnos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return alumnos.filter((alumno) => {
      const matchesStatus =
        status === "all" || (status === "deleted" ? alumno.eliminado : !alumno.eliminado);
      const matchesSearch = matchesAlumnoSearch(alumno, query);
      return matchesStatus && matchesSearch;
    });
  }, [alumnos, search, status]);

  const handleRestore = async () => {
    if (!restoreItem) return;
    setRestoring(true);
    try {
      await alumnoService.restore(restoreItem.id);
      setRestoreItem(null);
      await fetchAlumnos();
    } catch (err) {
      setError(err.message || "No se pudo restaurar el alumno");
    } finally {
      setRestoring(false);
    }
  };

  const checkPermanentDeletion = async (alumno) => {
    const request = ++deletionRequest.current;
    setCheckingDeletion(true);
    setDeletionInfo(null);
    setConfirmation("");
    try {
      const info = await alumnoService.getPermanentDeletionInfo(alumno.id);
      if (request === deletionRequest.current) setDeletionInfo(info);
    } catch (err) {
      if (request === deletionRequest.current) setDeletionError(err.message || "No se pudieron verificar las dependencias del alumno.");
    } finally {
      if (request === deletionRequest.current) setCheckingDeletion(false);
    }
  };

  const openPermanentDeletion = (alumno) => {
    if (!canRestore || deletionPending.current) return;
    setPermanentItem(alumno);
    setDeletionError("");
    void checkPermanentDeletion(alumno);
  };

  const closePermanentDeletion = () => {
    if (deletionPending.current) return;
    deletionRequest.current += 1;
    setPermanentItem(null);
    setDeletionInfo(null);
    setDeletionError("");
    setConfirmation("");
    setCheckingDeletion(false);
  };

  const handlePermanentDeletion = async () => {
    if (!canRestore || !permanentItem || !deletionInfo?.puedeEliminar ||
        checkingDeletion || confirmation !== "ELIMINAR" || deletionPending.current) return;
    const id = permanentItem.id;
    deletionPending.current = true;
    setDeleting(true);
    setDeletionError("");
    try {
      await alumnoService.deletePermanently(id);
      setAlumnos((items) => items.filter((item) => item.id !== id));
      setPermanentItem(null);
      setDeletionInfo(null);
      setConfirmation("");
      deletionRequest.current += 1;
    } catch (err) {
      setDeletionError(err.message || "No se pudo eliminar definitivamente al alumno. Verificá su estado antes de reintentar.");
      setDeletionInfo(null);
      setConfirmation("");
      if (err.status === 409) await checkPermanentDeletion(permanentItem);
    } finally {
      deletionPending.current = false;
      setDeleting(false);
    }
  };

  const columns = [
    { Header: "Apellidos", accessor: "apellidos", align: "left" },
    { Header: "Nombres", accessor: "nombres", align: "left" },
    { Header: "DNI", accessor: "dni", align: "left" },
    { Header: "Nacimiento", accessor: "fechaNacimiento", align: "left" },
    { Header: "Sexo", accessor: "genero", align: "left" },
    { Header: "Estado", accessor: "estado", align: "center" },
    { Header: "Eliminado el", accessor: "fechaEliminacion", align: "left" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = filteredAlumnos.map((alumno) => ({
    apellidos: <MDTypography variant="button">{alumno.apellidos}</MDTypography>,
    nombres: <MDTypography variant="body2">{alumno.nombres}</MDTypography>,
    dni: <MDTypography variant="caption">{alumno.numeroDocumento || "-"}</MDTypography>,
    fechaNacimiento: (
      <MDTypography variant="caption">{formatAlumnoBirthDate(alumno.fechaNacimiento)}</MDTypography>
    ),
    genero: <MDTypography variant="caption">{formatAlumnoGender(alumno.genero)}</MDTypography>,
    estado: (
      <Chip
        label={alumno.eliminado ? "Eliminado" : "Activo"}
        color={alumno.eliminado ? "error" : "success"}
        size="small"
      />
    ),
    fechaEliminacion: (
      <MDTypography variant="caption">
        {alumno.fechaEliminacion
          ? new Date(alumno.fechaEliminacion).toLocaleString("es-AR")
          : "-"}
      </MDTypography>
    ),
    actions:
      canRestore ? (
        <MDBox display="flex" flexWrap="wrap" gap={1}>
          {alumno.eliminado && <MDButton
            variant="text" color="success" size="small"
            disabled={restoring || deleting || checkingDeletion}
            onClick={() => setRestoreItem(alumno)}
          >
            <Icon>restore</Icon>&nbsp; Restaurar
          </MDButton>}
          <MDButton variant="text" color="error" size="small"
            aria-label={`Eliminar definitivamente a ${alumno.apellidos}, ${alumno.nombres}`}
            disabled={restoring || deleting || checkingDeletion}
            onClick={() => openPermanentDeletion(alumno)}>
            <Icon>delete_forever</Icon>&nbsp; Eliminar definitivamente
          </MDButton>
        </MDBox>
      ) : (
        <MDTypography variant="caption" color="text">
          -
        </MDTypography>
      ),
  }));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Alumnos
                </MDTypography>
              </MDBox>
              <MDBox p={2}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <MDInput
                      label="Buscar por nombre o DNI"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Estado"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      fullWidth
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      <MenuItem value="active">Activos</MenuItem>
                      <MenuItem value="deleted">Eliminados</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </MDBox>
              <MDBox px={2} pb={3}>
                {loading ? (
                  <MDBox display="flex" justifyContent="center" py={6}>
                    <CircularProgress color="info" />
                  </MDBox>
                ) : error ? (
                  <MDBox py={4} textAlign="center">
                    <MDTypography color="error">{error}</MDTypography>
                    <MDButton color="info" variant="text" onClick={fetchAlumnos}>
                      Reintentar
                    </MDButton>
                  </MDBox>
                ) : (
                  <DataTable
                    table={{ columns, rows }}
                    isSorted={false}
                    entriesPerPage={{ defaultValue: 10 }}
                    showTotalEntries
                    noEndBorder
                  />
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
      <Dialog open={canRestore && Boolean(permanentItem)} onClose={closePermanentDeletion}
        fullWidth maxWidth="sm" aria-labelledby="permanent-delete-title">
        <DialogTitle id="permanent-delete-title">Eliminar alumno definitivamente</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Se eliminará definitivamente a <strong>{permanentItem?.apellidos}, {permanentItem?.nombres}</strong>
            {permanentItem?.numeroDocumento ? ` (DNI ${permanentItem.numeroDocumento})` : ""}.
            Esta operación es irreversible: el alumno no podrá restaurarse desde el panel.
            No se eliminarán registros relacionados automáticamente.
          </Alert>
          {checkingDeletion && <MDBox display="flex" alignItems="center" gap={1} role="status" mb={2}>
            <CircularProgress size={20} />Verificando dependencias...
          </MDBox>}
          {deletionError && <Alert severity="error" sx={{ mb: 2 }}>{deletionError}</Alert>}
          {deletionInfo && <>
            <Alert severity={deletionInfo.puedeEliminar ? "info" : "error"} sx={{ mb: 2 }}>
              {deletionInfo.puedeEliminar
                ? "No se encontraron registros dependientes. La API volverá a comprobarlo al confirmar."
                : "No se puede eliminar: quedan registros dependientes o relaciones que requieren revisión, incluso si el alumno tiene baja lógica."}
            </Alert>
            {deletionInfo.dependencias?.some((item) => item.cantidad > 0) && <MDBox component="ul" pl={3} mb={2}>
              {deletionInfo.dependencias.filter((item) => item.cantidad > 0).map((item) => (
                <MDTypography component="li" variant="body2" key={item.entidad}>
                  {dependencyLabels[item.entidad] || item.entidad}: {item.cantidad}
                </MDTypography>
              ))}
            </MDBox>}
            <MDTypography variant="body2" mb={1}>
              Retirá los registros manualmente con una herramienta autorizada, desde la entidad más hija hacia la más padre:
            </MDTypography>
            <MDTypography variant="body2" mb={2}>
              {(deletionInfo.ordenEliminacion || []).map((item) => dependencyLabels[item] || item).join(" > ")}
            </MDTypography>
            <MDTypography variant="caption" display="block" mb={2}>
              También bloquean documentos, contacto y datos de nacimiento. Vaciar sus campos no elimina esos registros.
            </MDTypography>
            {deletionInfo.puedeEliminar && <TextField label="Escribí ELIMINAR para confirmar"
              value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              fullWidth disabled={deleting} autoComplete="off" />}
          </>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          <MDButton variant="outlined" color="dark" onClick={closePermanentDeletion} disabled={deleting}>Cancelar</MDButton>
          <MDButton variant="outlined" color="info" disabled={checkingDeletion || deleting}
            onClick={() => { setDeletionError(""); void checkPermanentDeletion(permanentItem); }}>Volver a verificar</MDButton>
          <MDButton variant="gradient" color="error" onClick={handlePermanentDeletion}
            disabled={checkingDeletion || deleting || !deletionInfo?.puedeEliminar || confirmation !== "ELIMINAR"}>
            {deleting ? "Eliminando..." : "Eliminar definitivamente"}
          </MDButton>
        </DialogActions>
      </Dialog>
      <RestoreModal
        alumno={restoreItem}
        loading={restoring}
        onClose={() => setRestoreItem(null)}
        onConfirm={handleRestore}
      />
    </DashboardLayout>
  );
}

export default Alumnos;
