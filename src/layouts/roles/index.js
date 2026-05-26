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
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import Icon from "@mui/material/Icon";
import rolService from "services/rolService";
import responsabilidadService from "services/responsabilidadService";

function FormModal({ open, onClose, onSave, initialData, saving, responsabilidades, error }) {
  const [formData, setFormData] = useState({ nombre: "", responsabilidades: [] });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      const responsabilidadesIds =
        initialData.responsibilityIds || initialData.responsabilidades || [];
      setFormData({
        nombre: initialData.nombre || initialData.name || "",
        responsabilidades: responsabilidadesIds.filter(Boolean),
      });
    } else {
      setFormData({ nombre: "", responsabilidades: [] });
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

  const handleResponsabilidadesChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, responsabilidades: value }));
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      setFormError("El nombre del rol es obligatorio.");
      return;
    }
    setFormError("");
    const payload = {
      name: formData.nombre,
      responsibilityIds: formData.responsabilidades,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {initialData ? "Editar Rol" : "Nuevo Rol"}
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
          <MDBox mb={2}>
            <FormControl fullWidth>
              <InputLabel id="responsabilidades-label">Responsabilidades</InputLabel>
              <Select
                labelId="responsabilidades-label"
                multiple
                name="responsabilidades"
                value={formData.responsabilidades}
                onChange={handleResponsabilidadesChange}
                input={<OutlinedInput label="Responsabilidades" />}
                renderValue={(selected) =>
                  selected
                    .map(
                      (id) =>
                        responsabilidades.find((r) => r.id === id)?.nombre ||
                        responsabilidades.find((r) => r.id === id)?.name
                    )
                    .filter(Boolean)
                    .join(", ")
                }
                disabled={saving}
              >
                {responsabilidades.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    <Checkbox checked={formData.responsabilidades.includes(r.id)} />
                    <ListItemText primary={r.nombre || r.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
  responsabilidades: PropTypes.array.isRequired,
  error: PropTypes.string,
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminacion</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          Esta seguro de eliminar el rol &quot;{nombre}&quot;?
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

function Roles() {
  const [roles, setRoles] = useState([]);
  const [responsabilidades, setResponsabilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, data: null, saving: false, error: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });

  const fetchData = async () => {
    try {
      const [rolesData, responsabilidadesData] = await Promise.all([
        rolService.getAll(),
        responsabilidadService.getAll(),
      ]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setResponsabilidades(Array.isArray(responsabilidadesData) ? responsabilidadesData : []);
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
        await rolService.update(formModal.data.id, data);
      } else {
        await rolService.create(data);
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
      await rolService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getResponsabilidadesDisplay = (role) => {
    const ids = role.responsibilityIds || role.responsabilidades || [];
    if (!ids || ids.length === 0) {
      return (
        <MDTypography variant="caption" color="text.secondary">
          Sin responsabilidades
        </MDTypography>
      );
    }
    return ids.map((id) => {
      const resp = responsabilidades.find((r) => r.id === id);
      return (
        <MDTypography key={id} variant="caption" display="block">
          {resp?.nombre || resp?.name || "-"}
        </MDTypography>
      );
    });
  };

  const columns = [
    { Header: "Nombre", accessor: "nombre", align: "left" },
    { Header: "Responsabilidades", accessor: "responsabilidades", align: "left" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = roles.map((item) => ({
    nombre: (
      <MDTypography variant="button" fontWeight="medium">
        {item.nombre || item.name}
      </MDTypography>
    ),
    responsabilidades: getResponsabilidadesDisplay(item),
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
                  Roles
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => handleOpenForm()}
                >
                  + Nuevo Rol
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
                      Error al cargar roles: {error}
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
        responsabilidades={responsabilidades}
        error={formModal.error}
      />
      <DeleteModal
        open={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        nombre={deleteModal.item?.nombre || deleteModal.item?.name}
        loading={deleteModal.loading}
      />
    </DashboardLayout>
  );
}

export default Roles;
