import { useSelector, useDispatch } from "react-redux";
import { setMiniSidenav } from "store/slices/uiSlice";

export const useUI = () => {
  return useSelector((state) => state.ui);
};

export const useUIDispatch = () => useDispatch();

export const useMiniSidenav = () => {
  const dispatch = useDispatch();
  const miniSidenav = useSelector((state) => state.ui.miniSidenav);
  const toggle = () => dispatch(setMiniSidenav(!miniSidenav));
  return { miniSidenav, toggle };
};
