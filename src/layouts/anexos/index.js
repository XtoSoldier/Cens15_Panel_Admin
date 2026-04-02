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

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import Icon from "@mui/material/Icon";
import anexoService from "services/anexoService";
import cursoService from "services/cursoService";
import orientacionService from "services/orientacionService";

function FormModal({ open, onClose, onSave, initialData, saving, error }) {
  const [formData, setFormData] = useState({ nombre: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({ nombre: initialData.nombre || "" });
    } else {
      setFormData({ nombre: "" });
    }
    setFormError("");
  }, [initialData, open]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleChange = (e) => {
    setFormData({ nombre: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    setFormError("");
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {initialData ? "Editar Anexo" : "Nuevo Anexo"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <MDBox pt={2}>
          <MDBox mb={2}>
            <MDInput
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              fullWidth
              disabled={saving}
            />
          </MDBox>
          {formError && (
            <MDTypography variant="body2" color="error">
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
  error: PropTypes.string,
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          ¿Estás seguro de eliminar el anexo &quot;{nombre}&quot;?
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

function CoursesModal({ open, onClose, anexo, cursos, orientaciones }) {
  const filteredCursos = cursos.filter((c) => {
    const anexoId = c.id_anexo || c.anexo?.id;
    return anexoId === anexo?.id;
  });

  const getOrientacionNombre = (orientacionId) => {
    const id = orientacionId || orientacionId?.id;
    return orientaciones.find((o) => o.id === id)?.nombre || "-";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Cursos del Anexo: {anexo?.nombre}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {filteredCursos.length === 0 ? (
          <MDTypography variant="body2" color="text.secondary" py={4} textAlign="center">
            Este anexo no tiene cursos asociados.
          </MDTypography>
        ) : (
          <MDBox>
            {filteredCursos.map((curso) => (
              <MDBox
                key={curso.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <MDBox display="flex" alignItems="center" gap={2}>
                  <MDTypography variant="button" fontWeight="bold">
                    {curso.curso}° {curso.division}
                  </MDTypography>
                  <MDTypography variant="caption" color="text.secondary">
                    {getOrientacionNombre(curso.id_orientacion || curso.orientacion?.id)}
                  </MDTypography>
                </MDBox>
                {curso.semipresencial && (
                  <MDTypography variant="caption" color="info.main" fontWeight="medium">
                    Semipresencial
                  </MDTypography>
                )}
              </MDBox>
            ))}
          </MDBox>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="gradient" color="info" onClick={onClose}>
          Cerrar
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

CoursesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  anexo: PropTypes.object,
  cursos: PropTypes.array.isRequired,
  orientaciones: PropTypes.array.isRequired,
};

function Anexos() {
  const [anexos, setAnexos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [orientaciones, setOrientaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, data: null, saving: false, error: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });
  const [coursesModal, setCoursesModal] = useState({ open: false, item: null });

  const fetchData = async () => {
    try {
      const [anexosData, cursosData, orientacionesData] = await Promise.all([
        anexoService.getAll(),
        cursoService.getAll(),
        orientacionService.getAll(),
      ]);
      setAnexos(Array.isArray(anexosData) ? anexosData : []);
      setCursos(Array.isArray(cursosData) ? cursosData : []);
      setOrientaciones(Array.isArray(orientacionesData) ? orientacionesData : []);
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
        await anexoService.update(formModal.data.id, data);
      } else {
        await anexoService.create(data);
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
      await anexoService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    { Header: "Nombre", accessor: "nombre", align: "left" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = anexos.map((item) => ({
    nombre: (
      <MDTypography variant="button" fontWeight="medium">
        {item.nombre}
      </MDTypography>
    ),
    actions: (
      <MDBox display="flex" gap={1} justifyContent="center">
        <MDButton
          variant="text"
          color="info"
          size="small"
          onClick={() => setCoursesModal({ open: true, item })}
        >
          <Icon>school</Icon>
        </MDButton>
        <MDButton variant="text" color="dark" size="small" onClick={() => handleOpenForm(item)}>
          <Icon>edit</Icon>
        </MDButton>
        <MDButton variant="text" color="error" size="small" onClick={() => handleOpenDelete(item)}>
          <Icon>delete</Icon>
        </MDButton>
      </MDBox>
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
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Anexos
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => handleOpenForm()}
                >
                  + Nuevo Anexo
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
                      Error al cargar anexos: {error}
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
        error={formModal.error}
      />
      <DeleteModal
        open={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        nombre={deleteModal.item?.nombre}
        loading={deleteModal.loading}
      />
      <CoursesModal
        open={coursesModal.open}
        onClose={() => setCoursesModal({ open: false, item: null })}
        anexo={coursesModal.item}
        cursos={cursos}
        orientaciones={orientaciones}
      />
    </DashboardLayout>
  );
}

export default Anexos;
