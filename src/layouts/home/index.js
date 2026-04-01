import { Typography } from "@mui/material";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import censLogo from "../../assets/images/cens.jpeg";

function Home() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox
        py={3}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="70vh"
      >
        <img
          src={censLogo}
          alt="Logo CENS"
          style={{ width: 180, height: "auto", marginBottom: 16 }}
        />
        <Typography
          variant="h3"
          fontWeight="bold"
          textAlign="center"
          color="dark"
          sx={{
            letterSpacing: 1,
          }}
        >
          Panel de Administración CENS 15
        </Typography>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Home;
