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
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import materiaService from "services/materiaService";
import cursoService from "services/cursoService";
import orientacionService from "services/orientacionService";
import docenteService from "services/docenteService";

function DocentesSection({ docentes, onChange, disabled, allDocentes }) {
  const handleChange = (index, field, value) => {
    const updated = [...docentes];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...docentes, { docenteId: "", rol: "" }]);
  };

  const handleRemove = (index) => {
    onChange(docentes.filter((_, i) => i !== index));
  };

  return (
    <MDBox>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <MDTypography variant="caption" color="text.secondary">
          Docentes ({allDocentes.length} disponibles)
        </MDTypography>
        <MDButton variant="outlined" size="small" onClick={handleAdd} disabled={disabled}>
          + Agregar Docente
        </MDButton>
      </MDBox>
      {docentes.length === 0 && (
        <MDTypography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          Presiona &quot;Agregar Docente&quot; para asignar docentes a esta materia.
        </MDTypography>
      )}
      {docentes.map((docente, index) => (
        <Grid container spacing={1} key={index} alignItems="center" mb={1}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Docente"
              value={docente.docenteId}
              onChange={(e) => handleChange(index, "docenteId", e.target.value)}
              fullWidth
              size="small"
              disabled={disabled}
            >
              <MenuItem value="">
                <em>Seleccionar...</em>
              </MenuItem>
              {allDocentes.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.apellidos}, {d.nombres}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Rol"
              value={docente.rol}
              onChange={(e) => handleChange(index, "rol", e.target.value)}
              fullWidth
              size="small"
              disabled={disabled}
              placeholder="Ej: Titular, Suplente"
            />
          </Grid>
          <Grid item xs={12} md={2} sx={{ display: "flex", justifyContent: "center" }}>
            <MDButton
              variant="text"
              color="error"
              size="small"
              onClick={() => handleRemove(index)}
              disabled={disabled}
            >
              <Icon>delete</Icon>
            </MDButton>
          </Grid>
        </Grid>
      ))}
    </MDBox>
  );
}

DocentesSection.propTypes = {
  docentes: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  allDocentes: PropTypes.array.isRequired,
};

function FormModal({
  open,
  onClose,
  onSave,
  initialData,
  saving,
  cursos,
  orientaciones,
  docentes,
  error,
}) {
  const [formData, setFormData] = useState({ nombre: "", cursoId: "", docentes: [] });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre || "",
        cursoId: initialData.cursoId || "",
        docentes: (initialData.docentes || []).map((d) => ({
          docenteId: d.docenteId || d.docente?.id || "",
          rol: d.rol || d.rolDocente || "",
        })),
      });
    } else {
      setFormData({ nombre: "", cursoId: "", docentes: [] });
    }
    setFormError("");
  }, [initialData, open]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      setFormError("El nombre de la materia es obligatorio.");
      return;
    }
    if (!formData.cursoId) {
      setFormError("Debe seleccionar un curso.");
      return;
    }
    setFormError("");

    const payload = {
      nombre: formData.nombre.trim(),
      cursoId: formData.cursoId,
    };

    const docentesValidos = formData.docentes.filter((d) => d.docenteId && d.rol.trim());
    if (docentesValidos.length > 0) {
      payload.docentes = docentesValidos.map((d) => ({
        docenteId: d.docenteId,
        rol: d.rol.trim(),
      }));
    }

    onSave(payload);
  };

  const getOrientacionDelCurso = () => {
    const curso = cursos.find(
      (c) => c.id === parseInt(formData.cursoId) || c.id === formData.cursoId
    );
    if (!curso) return null;
    const orientacionId = curso.id_orientacion || curso.orientacion?.id;
    return orientaciones.find((o) => o.id === orientacionId);
  };

  const selectedOrientacion = getOrientacionDelCurso();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {initialData ? "Editar Materia" : "Nueva Materia"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <MDBox pt={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Nombre"
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                fullWidth
                size="medium"
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Curso"
                value={formData.cursoId}
                onChange={(e) => handleChange("cursoId", e.target.value)}
                fullWidth
                size="medium"
                disabled={saving}
              >
                <MenuItem value="">
                  <em>Seleccionar curso...</em>
                </MenuItem>
                {cursos.map((c) => {
                  const orientacionId = c.id_orientacion || c.orientacion?.id;
                  const orientacion = orientaciones.find((o) => o.id === orientacionId);
                  return (
                    <MenuItem key={c.id} value={c.id}>
                      {c.curso}° {c.division} - {orientacion?.nombre || "Sin orientación"} -{" "}
                      {c.anexo?.nombre || ""}
                    </MenuItem>
                  );
                })}
              </TextField>
              {selectedOrientacion && (
                <MDTypography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  Orientación: {selectedOrientacion.nombre}
                </MDTypography>
              )}
            </Grid>
            <Grid item xs={12}>
              <DocentesSection
                docentes={formData.docentes}
                onChange={(d) => handleChange("docentes", d)}
                disabled={saving}
                allDocentes={docentes}
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
  cursos: PropTypes.array.isRequired,
  orientaciones: PropTypes.array.isRequired,
  docentes: PropTypes.array.isRequired,
  error: PropTypes.string,
};

function DeleteModal({ open, onClose, onConfirm, nombre, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirmar eliminación</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2">
          ¿Estás seguro de eliminar la materia &quot;{nombre}&quot;?
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

function Materias() {
  const [materias, setMaterias] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [orientaciones, setOrientaciones] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, data: null, saving: false, error: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });

  const fetchData = async () => {
    try {
      const [materiasData, cursosData, orientacionesData, docentesData] = await Promise.all([
        materiaService.getAll(),
        cursoService.getAll(),
        orientacionService.getAll(),
        docenteService.getAll(),
      ]);
      setMaterias(Array.isArray(materiasData) ? materiasData : []);
      setCursos(Array.isArray(cursosData) ? cursosData : []);
      setOrientaciones(Array.isArray(orientacionesData) ? orientacionesData : []);
      setDocentes(Array.isArray(docentesData) ? docentesData : []);
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
        await materiaService.update(formModal.data.id, data);
      } else {
        await materiaService.create(data);
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
      await materiaService.delete(deleteModal.item.id);
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getCursoNombre = (materia) => {
    const cursoId = materia.cursoId || materia.curso?.id;
    const curso = cursos.find((c) => c.id === cursoId);
    if (!curso) return "-";
    const orientacionId = curso.id_orientacion || curso.orientacion?.id;
    const orientacion = orientaciones.find((o) => o.id === orientacionId);
    return `${curso.curso}° ${curso.division} - ${
      orientacion?.nombreCorto || orientacion?.nombre || ""
    }`;
  };

  const getDocentesDisplay = (materia) => {
    const docenteList = materia.docentes || [];
    if (docenteList.length === 0)
      return (
        <MDTypography variant="caption" color="text.secondary">
          Sin docente
        </MDTypography>
      );
    return docenteList.map((d) => {
      const nombre = d.docente?.nombre || d.docente?.firstName || d.docente?.first_name || "";
      const apellido = d.docente?.apellido || d.docente?.lastName || d.docente?.last_name || "";
      const nombreCompleto = `${nombre} ${apellido}`.trim() || `Docente ${d.docenteId}`;
      const rol = d.rol || d.rolDocente || "";
      return (
        <MDTypography key={d.docenteId || Math.random()} variant="caption" display="block">
          {nombreCompleto} {rol && `(${rol})`}
        </MDTypography>
      );
    });
  };

  const columns = [
    { Header: "Materia", accessor: "nombre", align: "left" },
    { Header: "Curso", accessor: "curso", align: "left" },
    { Header: "Docentes", accessor: "docentes", align: "left" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = materias.map((item) => ({
    nombre: (
      <MDTypography variant="button" fontWeight="medium">
        {item.nombre}
      </MDTypography>
    ),
    curso: (
      <MDTypography variant="caption" color="text">
        {getCursoNombre(item)}
      </MDTypography>
    ),
    docentes: getDocentesDisplay(item),
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
                  Materias
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => handleOpenForm()}
                >
                  + Nueva Materia
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
                      Error al cargar materias: {error}
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
        cursos={cursos}
        orientaciones={orientaciones}
        docentes={docentes}
        error={formModal.error}
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

export default Materias;
