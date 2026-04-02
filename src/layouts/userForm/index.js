import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import userService from "services/userService";

function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const user = await userService.getById(id);
        setFormData({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          password: "",
          confirmPassword: "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError("Nombre, Apellido y Email son obligatorios.");
      return;
    }

    if (!isEditMode) {
      if (!formData.password) {
        setError("La contraseña es obligatoria.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    if (isEditMode) {
      if (formData.password && formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setSaving(true);
    try {
      const userData = {
        nombres: formData.firstName,
        apellido: formData.lastName,
        email: formData.email,
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      if (isEditMode) {
        await userService.update(id, userData);
      } else {
        await userService.create(userData);
      }
      navigate("/usuarios");
    } catch (err) {
      setError(err.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox display="flex" justifyContent="center" py={8}>
          <CircularProgress color="info" />
        </MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container justifyContent="center">
          <Grid item xs={12} lg={8}>
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
                  {isEditMode ? "Editar Usuario" : "Nuevo Usuario"}
                </MDTypography>
              </MDBox>
              <MDBox pt={4} pb={3} px={3}>
                <MDBox component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        label="Nombre"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        label="Apellido"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                    {!isEditMode && (
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
                    )}
                    <Grid item xs={12} md={6}>
                      <MDInput
                        type="password"
                        label="Contraseña"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        type="password"
                        label="Confirmar Contraseña"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                  </Grid>
                  {error && (
                    <MDTypography variant="body2" color="error" mt={2}>
                      {error}
                    </MDTypography>
                  )}
                  <MDBox mt={4} display="flex" gap={2}>
                    <MDButton variant="gradient" color="info" type="submit" disabled={saving}>
                      {saving ? "Guardando..." : isEditMode ? "Guardar cambios" : "Crear Usuario"}
                    </MDButton>
                    <MDButton
                      variant="outlined"
                      color="dark"
                      onClick={() => navigate("/usuarios")}
                      disabled={saving}
                    >
                      Cancelar
                    </MDButton>
                  </MDBox>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default UserForm;
