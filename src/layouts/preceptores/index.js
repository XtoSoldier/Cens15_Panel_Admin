import { useEffect, useRef, useState } from "react";
import {
  Alert, Card, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, Icon, IconButton, ListItemText, MenuItem, TextField,
} from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import preceptorService from "services/preceptorService";

const emptyForm = { nombres: "", apellidos: "", email: "", userId: "", cursoIds: [] };
const courseLabel = (curso) => [
  `${curso.curso} ${curso.division}`.trim(), curso.anexoNombre,
  curso.orientacionNombreCorto, curso.semipresencial ? "Semipresencial" : "",
].filter(Boolean).join(" - ");
const userLabel = (user) => [
  `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Usuario sin nombre", user.email,
].filter(Boolean).join(" - ");

export default function Preceptores() {
  const [preceptores, setPreceptores] = useState([]);
  const [opciones, setOpciones] = useState({ usuarios: [], cursos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [items, choices] = await Promise.all([
        preceptorService.getAll(), preceptorService.getOpciones(),
      ]);
      setPreceptores(items);
      setOpciones(choices);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los preceptores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const otherPreceptores = preceptores.filter((item) => item.id !== form?.id);
  const courseOwners = new Map(otherPreceptores.flatMap((item) =>
    (item.cursos || []).map((curso) => [curso.id, `${item.apellidos}, ${item.nombres}`])));
  const usedUsers = new Set(otherPreceptores.map((item) => item.userId).filter(Boolean));
  const availableUsers = opciones.usuarios.filter((user) =>
    user.role?.trim().toLowerCase() === "preceptor" && !usedUsers.has(user.id));

  const openForm = (item = null) => {
    setFormError("");
    setForm(item ? {
      id: item.id, nombres: item.nombres, apellidos: item.apellidos,
      email: item.email || "", userId: item.userId || "",
      cursoIds: (item.cursos || []).map((curso) => curso.id),
    } : { ...emptyForm });
  };
  const closeForm = () => { if (!pending.current) setForm(null); };
  const change = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const changeUser = (event) => {
    const userId = event.target.value;
    const user = availableUsers.find((item) => item.id === userId);
    setForm((prev) => ({
      ...prev, userId,
      ...(user ? {
        nombres: user.firstName || "", apellidos: user.lastName || "", email: user.email || "",
      } : {}),
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setFormError("Los nombres y apellidos del preceptor son obligatorios.");
      return;
    }
    if (form.userId && !availableUsers.some((user) => user.id === form.userId)) {
      setFormError("El usuario debe tener rol Preceptor y no estar vinculado a otro preceptor.");
      return;
    }
    if (form.cursoIds.some((id) => courseOwners.has(id))) {
      setFormError("Hay cursos asignados a otro preceptor. Liberalos antes de asignarlos aquí.");
      return;
    }
    const body = {
      nombres: form.nombres.trim(), apellidos: form.apellidos.trim(),
      email: form.email.trim() || null, userId: form.userId || null, cursoIds: form.cursoIds,
    };
    pending.current = true;
    setSaving(true);
    setFormError("");
    try {
      if (form.id) await preceptorService.update(form.id, body);
      else await preceptorService.create(body);
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err.message || "No se pudo guardar el preceptor.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const remove = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setDeleteError("");
    try {
      await preceptorService.delete(deleteItem.id);
      setDeleteItem(null);
      await load();
    } catch (err) {
      setDeleteError(err.message || "No se pudo eliminar el preceptor.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const columns = [
    { Header: "Apellidos", accessor: "apellidos" },
    { Header: "Nombres", accessor: "nombres" },
    { Header: "Email", accessor: "email" },
    { Header: "Usuario", accessor: "usuario" },
    { Header: "Cursos", accessor: "cursos" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];
  const rows = preceptores.map((item) => ({
    apellidos: item.apellidos, nombres: item.nombres, email: item.email || "-",
    usuario: item.userId
      ? userLabel(opciones.usuarios.find((user) => user.id === item.userId) || {})
      : "Sin vincular",
    cursos: item.cursos?.length ? item.cursos.map((curso) => (
      <MDTypography key={curso.id} variant="caption" display="block">{courseLabel(curso)}</MDTypography>
    )) : "Sin cursos",
    actions: (
      <MDBox display="flex" gap={1} justifyContent="center">
        <MDButton variant="text" color="dark" size="small" disabled={saving}
          aria-label={`Editar preceptor ${item.apellidos}, ${item.nombres}`} onClick={() => openForm(item)}>
          <Icon>edit</Icon>
        </MDButton>
        <MDButton variant="text" color="error" size="small" disabled={saving}
          aria-label={`Eliminar preceptor ${item.apellidos}, ${item.nombres}`}
          onClick={() => { setDeleteError(""); setDeleteItem(item); }}>
          <Icon>delete</Icon>
        </MDButton>
      </MDBox>
    ),
  }));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox mx={2} mt={-3} py={3} px={2} variant="gradient" bgColor="info"
            borderRadius="lg" coloredShadow="info" display="flex" alignItems="center"
            justifyContent="space-between" flexWrap="wrap" gap={2}>
            <MDTypography variant="h6" color="white">Preceptores</MDTypography>
            <MDBox display="flex" gap={1}>
              <MDButton variant="outlined" color="white" size="small" onClick={load} disabled={loading || saving}>
                Actualizar
              </MDButton>
              <MDButton variant="outlined" color="white" size="small" onClick={() => openForm()} disabled={loading || saving || Boolean(error)}>
                + Nuevo Preceptor
              </MDButton>
            </MDBox>
          </MDBox>
          <MDBox pt={3} px={2} pb={2}>
            <MDTypography variant="body2" mb={2}>
              Cada curso puede tener un solo preceptor. Un preceptor puede estar a cargo de varios cursos, con o sin usuario vinculado.
            </MDTypography>
            {loading ? <MDBox display="flex" justifyContent="center" py={6}><CircularProgress color="info" /></MDBox>
              : error ? <Alert severity="error">{error}</Alert>
                : <DataTable table={{ columns, rows }} isSorted={false}
                    entriesPerPage={{ defaultValue: 10 }} showTotalEntries noEndBorder canSearch />}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
      <Dialog open={Boolean(form)} onClose={closeForm} maxWidth="sm" fullWidth aria-labelledby="preceptor-form-title">
        <MDBox component="form" onSubmit={save}>
          <DialogTitle id="preceptor-form-title" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {form?.id ? "Editar Preceptor" : "Nuevo Preceptor"}
            <IconButton aria-label="Cerrar formulario de preceptor" onClick={closeForm} disabled={saving}><Icon>close</Icon></IconButton>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} pt={2}>
              <Grid item xs={12}>
                <TextField select label="Usuario vinculado (opcional)" name="userId" value={form?.userId || ""}
                  onChange={changeUser} fullWidth disabled={saving}
                  helperText="Solo usuarios con rol Preceptor disponibles. Al elegir uno se completan nombres, apellidos y email.">
                  <MenuItem value="">Sin usuario vinculado</MenuItem>
                  {availableUsers.map((user) => <MenuItem key={user.id} value={user.id}>{userLabel(user)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Nombres" name="nombres" value={form?.nombres || ""} onChange={change} required fullWidth disabled={saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Apellidos" name="apellidos" value={form?.apellidos || ""} onChange={change} required fullWidth disabled={saving} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Email (opcional)" type="email" name="email" value={form?.email || ""} onChange={change} fullWidth disabled={saving} />
              </Grid>
              <Grid item xs={12}>
                <TextField select label="Cursos a cargo" name="cursoIds" value={form?.cursoIds || []}
                  onChange={change} fullWidth disabled={saving}
                  helperText="Podés seleccionar varios cursos o ninguno. Para reasignar un curso ocupado, primero desvinculalo de su preceptor actual."
                  SelectProps={{ multiple: true, renderValue: (ids) => ids.map((id) => courseLabel(opciones.cursos.find((curso) => curso.id === id))).join(", ") }}>
                  {opciones.cursos.length === 0 && <MenuItem disabled>No hay cursos registrados</MenuItem>}
                  {opciones.cursos.map((curso) => (
                    <MenuItem key={curso.id} value={curso.id} disabled={courseOwners.has(curso.id)}>
                      <Checkbox checked={form?.cursoIds.includes(curso.id) || false} />
                      <ListItemText primary={courseLabel(curso)} secondary={courseOwners.has(curso.id) ? `Asignado a ${courseOwners.get(curso.id)}` : null} />
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <MDButton variant="outlined" color="dark" onClick={closeForm} disabled={saving}>Cancelar</MDButton>
            <MDButton variant="gradient" color="info" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</MDButton>
          </DialogActions>
        </MDBox>
      </Dialog>
      <Dialog open={Boolean(deleteItem)} onClose={() => { if (!pending.current) setDeleteItem(null); }} maxWidth="xs" fullWidth aria-labelledby="preceptor-delete-title">
        <DialogTitle id="preceptor-delete-title">Eliminar Preceptor</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            ¿Eliminar a {deleteItem?.apellidos}, {deleteItem?.nombres}? Sus cursos quedarán sin preceptor asignado. Los cursos y el usuario vinculado no se eliminarán.
          </MDTypography>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="outlined" color="dark" onClick={() => setDeleteItem(null)} disabled={saving}>Cancelar</MDButton>
          <MDButton variant="gradient" color="error" onClick={remove} disabled={saving}>{saving ? "Eliminando..." : "Eliminar"}</MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
