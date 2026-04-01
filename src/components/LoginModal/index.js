import { useState } from "react";

import { useSelector, useDispatch } from "react-redux";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import MuiLink from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import { useLoginModal } from "context/LoginModalContext";
import { setAuth } from "store/slices/authSlice";
import authService from "services/authService";

function LoginModal() {
  const { open, setOpen } = useLoginModal();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { isAuthenticated, currentUser } = useSelector((state) => state.auth);

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor complete todos los campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userData = await authService.login(email, password);
      dispatch(setAuth({ isAuthenticated: true, currentUser: userData }));
      handleClose();
    } catch (err) {
      setError(err.message || "Error al iniciar sesión. Verifique sus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    dispatch(setAuth({ isAuthenticated: false, currentUser: null }));
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 0 }}>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="info"
          p={2}
          textAlign="center"
        >
          <MDBox display="flex" justifyContent="space-between" alignItems="center">
            <MDTypography variant="h5" fontWeight="medium" color="white">
              {isAuthenticated ? "Mi Cuenta" : "Iniciar Sesión"}
            </MDTypography>
            <IconButton size="small" onClick={handleClose} sx={{ color: "white" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </MDBox>
        </MDBox>

        <MDBox pt={4} pb={3} px={3}>
          {isAuthenticated ? (
            <MDBox>
              <MDTypography variant="body1" color="text" mb={1} textAlign="center">
                Bienvenido,
              </MDTypography>
              <MDTypography variant="h6" color="text" mb={1} textAlign="center" fontWeight="bold">
                {currentUser?.name}
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={3} textAlign="center">
                {currentUser?.email}
              </MDTypography>
              <MDTypography
                variant="caption"
                color="text"
                mb={3}
                textAlign="center"
                display="block"
              >
                Rol: {currentUser?.role}
              </MDTypography>
              <MDBox mt={2} mb={1}>
                <MDButton variant="gradient" color="error" fullWidth onClick={handleLogout}>
                  Cerrar Sesión
                </MDButton>
              </MDBox>
            </MDBox>
          ) : (
            <MDBox component="form" onSubmit={handleLogin}>
              <MDBox mb={2}>
                <MDInput
                  type="email"
                  label="Email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </MDBox>
              <MDBox mb={2}>
                <MDInput
                  type="password"
                  label="Contraseña"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </MDBox>
              {error && (
                <MDTypography variant="caption" color="error" display="block" mb={2}>
                  {error}
                </MDTypography>
              )}
              <MDBox display="flex" alignItems="center" mb={3}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  style={{ marginRight: 8 }}
                  disabled={loading}
                />
                <MDTypography variant="button" color="text" component="label" htmlFor="rememberMe">
                  Recordarme
                </MDTypography>
              </MDBox>
              <MDBox mt={2} mb={1}>
                <MDButton
                  variant="gradient"
                  color="info"
                  fullWidth
                  type="submit"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </MDButton>
              </MDBox>
              <MDBox mt={2} textAlign="center">
                <MDTypography variant="button" color="text">
                  ¿No tenés cuenta?{" "}
                  <MuiLink href="#" variant="button" color="info" fontWeight="medium">
                    Registrate
                  </MuiLink>
                </MDTypography>
              </MDBox>
            </MDBox>
          )}
        </MDBox>
      </DialogContent>
    </Dialog>
  );
}

export default LoginModal;
