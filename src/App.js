/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import MDBox from "components/MDBox";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import Sidenav from "examples/Sidenav";

import LoginModal from "components/LoginModal";
import { LoginModalProvider } from "context/LoginModalContext";
import ProtectedRoute from "components/ProtectedRoute";

// Material Dashboard 2 React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// Material Dashboard 2 React Dark Mode themes
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Material Dashboard 2 React routes
import routes from "routes";

// Material Dashboard 2 React contexts
import { useMaterialUIController } from "context";
import { setAuth } from "store/slices/authSlice";
import { setMiniSidenav } from "store/slices/uiSlice";
import authService from "services/authService";
import NotFound from "layouts/notFound";
import UserForm from "layouts/userForm";

// Images
import brandWhite from "assets/images/logo-ct.png";
import brandDark from "assets/images/logo-ct-dark.png";

export default function App() {
  const dispatch = useDispatch();
  const [controller] = useMaterialUIController();
  const {
    miniSidenav,
    direction,
    layout,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
    isAuthenticated,
  } = controller;
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser && authService.isAuthenticated()) {
      dispatch(setAuth({ isAuthenticated: true, currentUser: storedUser }));
    }
  }, [dispatch]);

  // Cache for the rtl
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }

      if (route.route) {
        const isHome = route.key === "home";
        return (
          <Route
            exact
            path={route.route}
            element={isHome ? route.component : <ProtectedRoute>{route.component}</ProtectedRoute>}
            key={route.key}
          />
        );
      }

      return null;
    });

  // Boundary toggle button: placed at the right edge of the sidenav boundary
  const boundaryLeft = miniSidenav ? 96 : 250;
  const leftPos = boundaryLeft - 14;
  const toggleBoundarySidenav = () => dispatch(setMiniSidenav(!miniSidenav));

  const boundaryToggleButton = (
    <MDBox
      onClick={toggleBoundarySidenav}
      sx={{
        position: "fixed",
        top: "50%",
        left: leftPos,
        transform: "translateY(-50%)",
        width: 28,
        height: 28,
        bgcolor: "rgba(0,0,0,.6)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: 1,
        cursor: "pointer",
        zIndex: 9999,
      }}
      aria-label="Toggle sidenav"
      title={miniSidenav ? "Expand" : "Collapse"}
    >
      {miniSidenav ? (
        <ChevronRightIcon sx={{ color: "white" }} fontSize="small" />
      ) : (
        <ChevronLeftIcon sx={{ color: "white" }} fontSize="small" />
      )}
    </MDBox>
  );

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
        <LoginModalProvider>
          <CssBaseline />
          {layout === "dashboard" && isAuthenticated && (
            <>
              <Sidenav
                color={sidenavColor}
                brand={(transparentSidenav && !darkMode) || whiteSidenav ? brandDark : brandWhite}
                brandName="Material Dashboard 2"
                routes={routes}
              />
              {boundaryToggleButton}
            </>
          )}
          <Routes>
            {getRoutes(routes)}
            <Route path="/usuarios/nuevo" element={<UserForm />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <LoginModal />
        </LoginModalProvider>
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <LoginModalProvider>
        <CssBaseline />
        {layout === "dashboard" && isAuthenticated && (
          <>
            <Sidenav color={sidenavColor} brandName="CENS 15 - Administración" routes={routes} />
            {boundaryToggleButton}
          </>
        )}
        <Routes>
          {getRoutes(routes)}
          <Route path="/usuarios/nuevo" element={<UserForm />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <LoginModal />
      </LoginModalProvider>
    </ThemeProvider>
  );
}
