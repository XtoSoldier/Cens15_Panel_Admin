/**
 * =============================================================================
 * REDUX STORE - Reemplazó al contexto original de Material Dashboard 2
 * =============================================================================
 *
 * Este archivo mantiene la API de exports original para no romper componentes.
 * Internamente usa Redux Toolkit. Los componentes pueden migrar gradualmente
 * a usar Redux directamente (useSelector / useDispatch).
 */

import { useSelector, useDispatch } from "react-redux";

import {
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
  setSidenavColor,
  setTransparentNavbar,
  setFixedNavbar,
  setOpenConfigurator,
  setDirection,
  setLayout,
  setDarkMode,
} from "../store/slices/uiSlice";

import { setAuth as setAuthAction } from "../store/slices/authSlice";
import store from "../store";

export {
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
  setSidenavColor,
  setTransparentNavbar,
  setFixedNavbar,
  setOpenConfigurator,
  setDirection,
  setLayout,
  setDarkMode,
  store,
};

export const setAuth = (dispatch, value) => dispatch(setAuthAction(value));

export const useMaterialUIController = () => {
  const dispatch = useDispatch();
  const ui = useSelector((state) => state.ui);
  const auth = useSelector((state) => state.auth);

  const controller = {
    ...ui,
    isAuthenticated: auth.isAuthenticated,
    currentUser: auth.currentUser,
  };

  return [controller, dispatch];
};
