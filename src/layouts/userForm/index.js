import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import userService from "services/userService";

function UserForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      await userService.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      navigate("/usuarios");
    } catch (err) {
      setError(err.message || "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

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
                  Nuevo Usuario
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
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        label="Apellido"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        fullWidth
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <MDInput
                        type="password"
                        label="Contraseña"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        fullWidth
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </Grid>
                  </Grid>
                  {error && (
                    <MDTypography variant="body2" color="error" mt={2}>
                      {error}
                    </MDTypography>
                  )}
                  <MDBox mt={4} display="flex" gap={2}>
                    <MDButton variant="gradient" color="info" type="submit" disabled={loading}>
                      {loading ? "Guardando..." : "Guardar"}
                    </MDButton>
                    <MDButton
                      variant="outlined"
                      color="dark"
                      onClick={() => navigate("/usuarios")}
                      disabled={loading}
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
