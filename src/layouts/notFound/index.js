import { Link } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function NotFound() {
  return (
    <MDBox
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="70vh"
      textAlign="center"
      px={3}
    >
      <MDTypography variant="h1" fontWeight="bold" color="primary" mb={2}>
        404
      </MDTypography>
      <MDTypography variant="h4" color="text" mb={2}>
        Página no encontrada
      </MDTypography>
      <MDTypography variant="body1" color="text" mb={4}>
        La página que buscas no existe o fue movida.
      </MDTypography>
      <MDButton component={Link} to="/dashboard" variant="gradient" color="info">
        Volver al inicio
      </MDButton>
    </MDBox>
  );
}

export default NotFound;
