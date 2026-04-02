import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
import orientacionService from "services/orientacionService";

function FormModal({ open, onClose, onSave, initialData, saving }) {
  const [formData, setFormData] = useState({ nombre: "", nombreCorto: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({ nombre: initialData.nombre || "", nombreCorto: initialData.nombreCorto || "" });
    } else {
      setFormData({ nombre: "", nombreCorto: "" });
    }
    setError("");
  }, [initialData, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!formData.nombreCorto.trim()) {
      setError("El nombre corto es obligatorio.");
      return;
    }
    setError("");
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {initialData ? "Editar Orientación" : "Nueva Orientación"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <MDBox pt={2} component="form">
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
          <MDBox mb={2}>
            <MDInput
              label="Nombre Corto"
              name="nombreCorto"
              value={formData.nombreCorto}
              onChange={handleChange}
              fullWidth
              disabled={saving}
            />
          </MDBox>
          {error && (
            <MDTypography variant="body2" color="error">
              {error}
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
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          ¿Estás seguro de eliminar la orientación &quot;{nombre}&quot;?
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

function Orientaciones() {
  const navigate = useNavigate();
  const [orientaciones, setOrientaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, data: null, saving: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });

  const fetchOrientaciones = async () => {
    try {
      const data = await orientacionService.getAll();
      setOrientaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrientaciones();
  }, []);

  const handleOpenForm = (item = null) => {
    setFormModal({ open: true, data: item, saving: false });
  };

  const handleCloseForm = () => {
    setFormModal({ open: false, data: null, saving: false });
  };

  const handleSaveForm = async (data) => {
    setFormModal((prev) => ({ ...prev, saving: true }));
    try {
      if (formModal.data) {
        await orientacionService.update(formModal.data.id, data);
      } else {
        await orientacionService.create(data);
      }
      handleCloseForm();
      fetchOrientaciones();
    } catch (err) {
      setFormModal((prev) => ({ ...prev, saving: false }));
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
      await orientacionService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchOrientaciones();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    { Header: "Nombre", accessor: "nombre", align: "left" },
    { Header: "Nombre Corto", accessor: "nombreCorto", align: "left" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = orientaciones.map((item) => ({
    nombre: (
      <MDTypography variant="button" fontWeight="medium">
        {item.nombre}
      </MDTypography>
    ),
    nombreCorto: (
      <MDTypography variant="caption" color="text">
        {item.nombreCorto}
      </MDTypography>
    ),
    actions: (
      <MDBox display="flex" gap={1} justifyContent="center">
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
                  Orientaciones
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => handleOpenForm()}
                >
                  + Nueva Orientación
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
                      Error al cargar orientaciones: {error}
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
      />
      <DeleteModal
        open={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        nombre={deleteModal.item?.nombre}
        loading={deleteModal.loading}
      />
    </DashboardLayout>
  );
}

export default Orientaciones;
