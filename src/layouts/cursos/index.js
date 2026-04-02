import { useState, useEffect } from "react";

import PropTypes from "prop-types";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import Icon from "@mui/material/Icon";
import cursoService from "services/cursoService";
import orientacionService from "services/orientacionService";
import anexoService from "services/anexoService";

const CURSOS_VALIDOS = ["1°", "2°", "3°"];
const DIVISIONES_VALIDAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

function FormModal({ open, onClose, onSave, initialData, saving, orientaciones, anexos, error }) {
  const [formData, setFormData] = useState({
    idOrientacion: "",
    idAnexo: "",
    curso: "",
    division: "",
    semipresencial: false,
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        idOrientacion: initialData.id_orientacion || "",
        idAnexo: initialData.id_anexo || "",
        curso: initialData.curso || "",
        division: initialData.division || "",
        semipresencial: initialData.semipresencial || false,
      });
    } else {
      setFormData({
        idOrientacion: "",
        idAnexo: "",
        curso: "",
        division: "",
        semipresencial: false,
      });
    }
    setFormError("");
  }, [initialData, open]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.idOrientacion) {
      setFormError("Debe seleccionar una orientación.");
      return;
    }
    if (!formData.idAnexo) {
      setFormError("Debe seleccionar un anexo.");
      return;
    }
    if (!formData.curso) {
      setFormError("Debe seleccionar un curso (1°, 2° o 3°).");
      return;
    }
    if (!formData.division) {
      setFormError("Debe seleccionar una división (A-K).");
      return;
    }
    setFormError("");
    onSave({
      curso: formData.curso,
      division: formData.division,
      id_orientacion: formData.idOrientacion,
      id_anexo: formData.idAnexo,
      semipresencial: formData.semipresencial,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {initialData ? "Editar Curso" : "Nuevo Curso"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <MDBox pt={2} component="form">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                select
                label="Orientación"
                name="idOrientacion"
                value={formData.idOrientacion}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ "& .MuiSelect-select": { py: 2.5 } }}
              >
                {orientaciones.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Anexo"
                name="idAnexo"
                value={formData.idAnexo}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ "& .MuiSelect-select": { py: 2.5 } }}
              >
                {anexos.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Curso"
                name="curso"
                value={formData.curso}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ "& .MuiSelect-select": { py: 2.5 } }}
              >
                {CURSOS_VALIDOS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                size="medium"
                label="División"
                name="division"
                value={formData.division}
                onChange={handleChange}
                fullWidth
                disabled={saving}
                sx={{ "& .MuiSelect-select": { py: 2.5 } }}
              >
                {DIVISIONES_VALIDAS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="semipresencial"
                    checked={formData.semipresencial}
                    onChange={handleChange}
                    disabled={saving}
                  />
                }
                label="Semipresencial"
              />
            </Grid>
          </Grid>
          {formError && (
            <MDTypography variant="body2" color="error" mt={2}>
              {formError}
            </MDTypography>
          )}
        </MDBox>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="outlined" color="dark" onClick={onClose} disabled={saving}>
          Cancelar
        </MDButton>
        <MDButton variant="gradient" color="info" onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

FormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  saving: PropTypes.bool,
  orientaciones: PropTypes.array.isRequired,
  anexos: PropTypes.array.isRequired,
  error: PropTypes.string,
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          ¿Estás seguro de eliminar el curso &quot;{nombre}&quot;?
        </MDTypography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="outlined" color="dark" onClick={onClose} disabled={loading}>
          Cancelar
        </MDButton>
        <MDButton variant="gradient" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? "Eliminando..." : "Eliminar"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

DeleteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  nombre: PropTypes.string,
  loading: PropTypes.bool,
};

function Cursos() {
  const [cursos, setCursos] = useState([]);
  const [orientaciones, setOrientaciones] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, data: null, saving: false, error: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });

  const fetchData = async () => {
    try {
      const [cursosData, orientacionesData, anexosData] = await Promise.all([
        cursoService.getAll(),
        orientacionService.getAll(),
        anexoService.getAll(),
      ]);
      setCursos(Array.isArray(cursosData) ? cursosData : []);
      setOrientaciones(Array.isArray(orientacionesData) ? orientacionesData : []);
      setAnexos(Array.isArray(anexosData) ? anexosData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenForm = (item = null) => {
    setFormModal({ open: true, data: item, saving: false, error: "" });
  };

  const handleCloseForm = () => {
    setFormModal({ open: false, data: null, saving: false, error: "" });
  };

  const handleSaveForm = async (data) => {
    setFormModal((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      if (formModal.data) {
        await cursoService.update(formModal.data.id, data);
      } else {
        await cursoService.create(data);
      }
      handleCloseForm();
      fetchData();
    } catch (err) {
      setFormModal((prev) => ({ ...prev, saving: false, error: err.message }));
    }
  };

  const handleOpenDelete = (item) => {
    setDeleteModal({ open: true, item, loading: false });
  };

  const handleCloseDelete = () => {
    setDeleteModal({ open: false, item: null, loading: false });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await cursoService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    { Header: "Curso", accessor: "curso", align: "left" },
    { Header: "Div.", accessor: "division", align: "center" },
    { Header: "Orientación", accessor: "orientacion", align: "left" },
    { Header: "Anexo", accessor: "anexo", align: "left" },
    { Header: "Semi.", accessor: "semipresencial", align: "center" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = cursos.map((item) => {
    const orientacionId = item.id_orientacion || item.orientacion?.id;
    const anexoId = item.id_anexo || item.anexo?.id;
    const orientacionNombre = orientaciones.find((o) => o.id === orientacionId)?.nombre || "-";
    const anexoNombre = anexos.find((a) => a.id === anexoId)?.nombre || "-";

    return {
      curso: (
        <MDTypography variant="button" fontWeight="medium">
          {item.curso}
        </MDTypography>
      ),
      division: (
        <MDTypography variant="button" fontWeight="bold">
          {item.division}
        </MDTypography>
      ),
      orientacion: (
        <MDTypography variant="caption" color="text">
          {orientacionNombre}
        </MDTypography>
      ),
      anexo: (
        <MDTypography variant="caption" color="text">
          {anexoNombre}
        </MDTypography>
      ),
      semipresencial: item.semipresencial ? (
        <MDTypography variant="caption" color="success">
          Sí
        </MDTypography>
      ) : (
        <MDTypography variant="caption" color="text">
          No
        </MDTypography>
      ),
      actions: (
        <MDBox display="flex" gap={1} justifyContent="center">
          <MDButton variant="text" color="dark" size="small" onClick={() => handleOpenForm(item)}>
            <Icon>edit</Icon>
          </MDButton>
          <MDButton
            variant="text"
            color="error"
            size="small"
            onClick={() => handleOpenDelete(item)}
          >
            <Icon>delete</Icon>
          </MDButton>
        </MDBox>
      ),
    };
  });

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
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Cursos
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => handleOpenForm()}
                >
                  + Nuevo Curso
                </MDButton>
              </MDBox>
              <MDBox pt={3} px={2}>
                {loading ? (
                  <MDBox display="flex" justifyContent="center" py={6}>
                    <CircularProgress color="info" />
                  </MDBox>
                ) : error ? (
                  <MDBox py={4} textAlign="center">
                    <MDTypography variant="body1" color="error">
                      Error al cargar cursos: {error}
                    </MDTypography>
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
      <FormModal
        open={formModal.open}
        onClose={handleCloseForm}
        onSave={handleSaveForm}
        initialData={formModal.data}
        saving={formModal.saving}
        orientaciones={orientaciones}
        anexos={anexos}
        error={formModal.error}
      />
      <DeleteModal
        open={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        nombre={deleteModal.item ? `${deleteModal.item.curso} ${deleteModal.item.division}` : ""}
        loading={deleteModal.loading}
      />
    </DashboardLayout>
  );
}

export default Cursos;
