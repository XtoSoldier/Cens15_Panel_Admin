import { useEffect, useState } from "react";

import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import loginActivityService from "services/loginActivityService";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function LoginActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await loginActivityService.getAll();
        setActivities(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Error al cargar actividad de logueo");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const columns = [
    { Header: "Fecha", accessor: "createdAt", align: "left" },
    { Header: "Usuario", accessor: "user", align: "left" },
    { Header: "Resultado", accessor: "success", align: "center" },
    { Header: "Motivo", accessor: "reason", align: "left" },
    { Header: "Plataforma", accessor: "platform", align: "center" },
    { Header: "IP", accessor: "ipAddress", align: "center" },
  ];

  const rows = activities.map((item) => ({
    createdAt: (
      <MDTypography variant="caption" color="text">
        {formatDate(item.createdAt)}
      </MDTypography>
    ),
    user: (
      <MDBox>
        <MDTypography variant="button" fontWeight="medium" display="block">
          {item.userName || "Usuario no identificado"}
        </MDTypography>
        <MDTypography variant="caption" color="text.secondary">
          {item.email || "-"}
        </MDTypography>
      </MDBox>
    ),
    success: (
      <MDBox display="flex" alignItems="center" justifyContent="center" gap={0.5}>
        <Icon color={item.success ? "success" : "error"}>
          {item.success ? "check_circle" : "cancel"}
        </Icon>
        <MDTypography variant="caption" color={item.success ? "success" : "error"}>
          {item.success ? "Exitoso" : "Fallido"}
        </MDTypography>
      </MDBox>
    ),
    reason: (
      <MDTypography variant="caption" color="text">
        {item.reason || "-"}
      </MDTypography>
    ),
    platform: (
      <MDBox>
        <MDTypography variant="caption" color="text" display="block">
          {item.platform || "-"}
        </MDTypography>
        <MDTypography variant="caption" color="text.secondary">
          {item.deviceInfo || ""}
        </MDTypography>
      </MDBox>
    ),
    ipAddress: (
      <MDTypography variant="caption" color="text">
        {item.ipAddress || "-"}
      </MDTypography>
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
              >
                <MDTypography variant="h6" color="white">
                  Actividad de Logueo
                </MDTypography>
              </MDBox>
              <MDBox pt={3} px={2}>
                {loading ? (
                  <MDBox display="flex" justifyContent="center" py={6}>
                    <CircularProgress color="info" />
                  </MDBox>
                ) : error ? (
                  <MDBox py={4} textAlign="center">
                    <MDTypography variant="body1" color="error">
                      {error}
                    </MDTypography>
                  </MDBox>
                ) : (
                  <DataTable
                    table={{ columns, rows }}
                    isSorted={false}
                    entriesPerPage={{ defaultValue: 25 }}
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
    </DashboardLayout>
  );
}

export default LoginActivities;
