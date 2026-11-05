import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";

import Card from "@mui/material/Card";
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
      alumno.eliminado && canRestore ? (
        <MDButton
          variant="text"
          color="success"
          size="small"
          onClick={() => setRestoreItem(alumno)}
        >
          <Icon>restore</Icon>&nbsp; Restaurar
        </MDButton>
      ) : (
        <MDTypography variant="caption" color="text.secondary">
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
