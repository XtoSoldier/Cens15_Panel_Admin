import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import PropTypes from "prop-types";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import MDBadge from "components/MDBadge";
import MDButton from "components/MDButton";
import Icon from "@mui/material/Icon";

import userService from "services/userService";

const UserCell = ({ name, email }) => (
  <MDBox display="flex" alignItems="center" lineHeight={1}>
    <MDBox ml={0} lineHeight={1}>
      <MDTypography display="block" variant="button" fontWeight="medium">
        {name}
      </MDTypography>
      <MDTypography variant="caption">{email}</MDTypography>
    </MDBox>
  </MDBox>
);

const StatusCell = ({ status }) => (
  <MDBox ml={-1}>
    <MDBadge
      badgeContent={status ? "Activo" : "Inactivo"}
      color={status ? "success" : "dark"}
      variant="gradient"
      size="sm"
    />
  </MDBox>
);

UserCell.propTypes = {
  name: PropTypes.string,
  email: PropTypes.string,
};

StatusCell.propTypes = {
  status: PropTypes.bool,
};

function Tables() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await userService.getAll();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const columns = [
    { Header: "Nombre", accessor: "name", align: "left" },
    { Header: "Email", accessor: "email", align: "left" },
    { Header: "Rol", accessor: "role", align: "center" },
    { Header: "Estado", accessor: "status", align: "center" },
    { Header: "Acciones", accessor: "actions", align: "center" },
  ];

  const rows = users.map((user) => ({
    name: (
      <UserCell
        name={`${user.firstName || ""} ${user.lastName || ""}`.trim()}
        email={user.email || ""}
      />
    ),
    email: user.email || "-",
    role: (
      <MDTypography component="span" variant="caption" color="text">
        {user.role?.name || "-"}
      </MDTypography>
    ),
    status: <StatusCell status={user.status} />,
    actions: (
      <MDBox display="flex" gap={1} justifyContent="center">
        <MDButton
          variant="text"
          color="info"
          size="small"
          onClick={() => console.log("Ver", user.id)}
        >
          <Icon>visibility</Icon>
        </MDButton>
        <MDButton
          variant="text"
          color="dark"
          size="small"
          onClick={() => console.log("Editar", user.id)}
        >
          <Icon>edit</Icon>
        </MDButton>
        <MDButton
          variant="text"
          color="error"
          size="small"
          onClick={() => console.log("Eliminar", user.id)}
        >
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
                  Usuarios
                </MDTypography>
                <MDButton
                  variant="outlined"
                  color="white"
                  size="small"
                  onClick={() => navigate("/usuarios/nuevo")}
                >
                  + Nuevo Usuario
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
                      Error al cargar usuarios: {error}
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
    </DashboardLayout>
  );
}

export default Tables;
