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

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import Icon from "@mui/material/Icon";
import docenteService from "services/docenteService";
import userService from "services/userService";

function FormModal({ open, onClose, onSave, initialData, saving, usuarios, error }) {
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    userId: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombres: initialData.nombres || "",
        apellidos: initialData.apellidos || "",
        email: initialData.email || "",
        userId: initialData.userId || "",
      });
    } else {
      setFormData({ nombres: "", apellidos: "", email: "", userId: "" });
    }
    setFormError("");
  }, [initialData, open]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.nombres.trim()) {
      setFormError("El nombre del docente es obligatorio.");
      return;
    }
    if (!formData.apellidos.trim()) {
      setFormError("El apellido del docente es obligatorio.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("El email del docente es obligatorio.");
      return;
    }
    setFormError("");

    const payload = {
      nombres: formData.nombres.trim(),
      apellidos: formData.apellidos.trim(),
      email: formData.email.trim(),
    };

    if (formData.userId) {
      payload.userId = formData.userId;
    }

    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {initialData ? "Editar Docente" : "Nuevo Docente"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <MDBox pt={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <MDInput
                label="Nombres"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <MDInput
                label="Apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <MDInput
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Usuario vinculado (opcional)"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                fullWidth
                size="medium"
                disabled={saving}
              >
                <option value="">
                  <em>Sin usuario vinculado</em>
                </option>
              </TextField>
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
  usuarios: PropTypes.array.isRequired,
  error: PropTypes.string,
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          ¿Estás seguro de eliminar el docente &quot;{nombre}&quot;?
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

function Docentes() {
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, data: null, saving: false, error: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });

  const fetchDocentes = async () => {
    try {
      const data = await docenteService.getAll();
      setDocentes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
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
        await docenteService.update(formModal.data.id, data);
      } else {
        await docenteService.create(data);
      }
      handleCloseForm();
      fetchDocentes();
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
      await docenteService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchDocentes();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    { Header: "Apellidos", accessor: "apellidos", align: "left" },
    { Header: "Nombres", accessor: "nombres", align: "left" },
    { Header: "Email", accessor: "email", align: "left" },
    { Header: "Usuario", accessor: "usuario", align: "left" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = docentes.map((item) => ({
    apellidos: (
      <MDTypography variant="button" fontWeight="medium">
        {item.apellidos}
      </MDTypography>
    ),
    nombres: <MDTypography variant="body2">{item.nombres}</MDTypography>,
    email: (
      <MDTypography variant="caption" color="text">
        {item.email}
      </MDTypography>
    ),
    usuario: item.userId ? (
      <MDTypography variant="caption" color="success">
        Vinculado
      </MDTypography>
    ) : (
      <MDTypography variant="caption" color="text.secondary">
        Sin vincular
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
                  Docentes
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => handleOpenForm()}
                >
                  + Nuevo Docente
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
                      Error al cargar docentes: {error}
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
        usuarios={[]}
        error={formModal.error}
      />
      <DeleteModal
        open={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        nombre={
          deleteModal.item ? `${deleteModal.item.apellidos}, ${deleteModal.item.nombres}` : ""
        }
        loading={deleteModal.loading}
      />
    </DashboardLayout>
  );
}

export default Docentes;
