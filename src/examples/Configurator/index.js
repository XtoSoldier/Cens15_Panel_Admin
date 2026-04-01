import { useState } from "react";

import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { useMaterialUIController } from "context";

import {
  setOpenConfigurator,
  setTransparentSidenav,
  setWhiteSidenav,
  setDarkMode,
} from "store/slices/uiSlice";

const SIDENAV_WIDTH = 200;
const TOGGLE_SIZE = 36;

function Configurator() {
  const [controller, dispatch] = useMaterialUIController();
  const { openConfigurator, transparentSidenav, whiteSidenav, darkMode } = controller;
  const [hoveredType, setHoveredType] = useState(null);

  const toggleConfigurator = () => dispatch(setOpenConfigurator(!openConfigurator));

  const handleTransparentSidenav = () => {
    dispatch(setTransparentSidenav(true));
    dispatch(setWhiteSidenav(false));
  };
  const handleWhiteSidenav = () => {
    dispatch(setWhiteSidenav(true));
    dispatch(setTransparentSidenav(false));
  };
  const handleDarkSidenav = () => {
    dispatch(setWhiteSidenav(false));
    dispatch(setTransparentSidenav(false));
  };
  const handleDarkMode = () => dispatch(setDarkMode(!darkMode));

  const isDark = !transparentSidenav && !whiteSidenav;
  const isTransparent = transparentSidenav && !whiteSidenav;
  const isWhite = whiteSidenav && !transparentSidenav;

  const typeBtn = (label, active, onClick) => (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHoveredType(label)}
      onMouseLeave={() => setHoveredType(null)}
      sx={{
        px: 0.75,
        py: 0.35,
        borderRadius: 1,
        cursor: "pointer",
        fontSize: "0.7rem",
        fontWeight: 700,
        transition: "all 0.15s",
        color: active ? "#fff" : "#555",
        background: active ? "#333" : hoveredType === label ? "rgba(0,0,0,0.08)" : "transparent",
      }}
    >
      {label}
    </Box>
  );

  return (
    <>
      <MDBox
        component={IconButton}
        onClick={toggleConfigurator}
        disableRipple
        sx={{
          minWidth: TOGGLE_SIZE,
          width: TOGGLE_SIZE,
          height: TOGGLE_SIZE,
          bgcolor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
          zIndex: 1100,
          "&:hover": {
            bgcolor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
          },
        }}
      >
        <Tooltip title="Tema" placement="left">
          <Icon sx={{ color: darkMode ? "#ccc" : "#555", fontSize: "18px !important" }}>
            {openConfigurator ? "close" : "palette"}
          </Icon>
        </Tooltip>
      </MDBox>

      <Drawer
        variant="persistent"
        anchor="right"
        open={openConfigurator}
        sx={{
          width: openConfigurator ? SIDENAV_WIDTH : 0,
          flexShrink: 0,
          overflow: "hidden",
          "& .MuiDrawer-paper": {
            width: SIDENAV_WIDTH,
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            bgcolor: "#ffffff",
            border: "none",
            boxShadow: "-2px 0 12px rgba(0,0,0,0.12)",
            transform: openConfigurator ? "translateX(0)" : `translateX(${SIDENAV_WIDTH}px)`,
            transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            p: 2.5,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Box>
            <MDTypography
              variant="caption"
              fontWeight="bold"
              color="#111"
              sx={{ textTransform: "uppercase", letterSpacing: 1 }}
            >
              Tema
            </MDTypography>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mt={1}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "rgba(0,0,0,0.04)",
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Icon sx={{ fontSize: "15px !important", color: "#666" }}>
                  {darkMode ? "dark_mode" : "light_mode"}
                </Icon>
                <MDTypography variant="caption" color="#111">
                  Oscuro
                </MDTypography>
              </Box>
              <Switch checked={darkMode} onChange={handleDarkMode} size="small" />
            </Box>
          </Box>

          <Box>
            <MDTypography
              variant="caption"
              fontWeight="bold"
              color="#111"
              sx={{ textTransform: "uppercase", letterSpacing: 1 }}
            >
              Barra lateral
            </MDTypography>
            <Box
              mt={1}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "rgba(0,0,0,0.04)",
              }}
            >
              <Box display="flex" gap={0.5} justifyContent="center" mb={1}>
                {typeBtn("Oscuro", isDark, handleDarkSidenav)}
                {typeBtn("Transp.", isTransparent, handleTransparentSidenav)}
                {typeBtn("Blanco", isWhite, handleWhiteSidenav)}
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

export default Configurator;
