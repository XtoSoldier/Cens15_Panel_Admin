import { useEffect } from "react";
import { useStore } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useLoginModal } from "context/LoginModalContext";
import { clearAuth, setAuth } from "store/slices/authSlice";
import { SESSION_EVENT, TOKEN_KEY, USER_KEY, sessionUser, tokenDeadline } from "utils/session";

export default function SessionGuard() {
  const store = useStore();
  const navigate = useNavigate();
  const { setOpen } = useLoginModal();

  useEffect(() => {
    let timer;
    let checking = false;
    const check = (event) => {
      if (checking) return;
      checking = true;
      clearTimeout(timer);
      const auth = store.getState().auth;
      const hadSession = Boolean(auth.currentUser || auth.isAuthenticated ||
        localStorage.getItem(TOKEN_KEY) || localStorage.getItem(USER_KEY));
      const user = sessionUser();
      if (user) {
        if (!auth.isAuthenticated || JSON.stringify(auth.currentUser) !== JSON.stringify(user)) {
          store.dispatch(setAuth({ isAuthenticated: true, currentUser: user }));
        }
        timer = setTimeout(check, Math.min(tokenDeadline(user.token) - Date.now(), 2147483647));
      } else {
        if (auth.isAuthenticated || auth.currentUser || auth.loading || auth.error) {
          store.dispatch(clearAuth());
        }
        const reason = event?.detail?.reason;
        if (hadSession || reason === "expired") {
          navigate("/home", { replace: true });
          setOpen(reason !== "logout");
        }
      }
      checking = false;
    };
    const storage = (event) => {
      if (event.key === null || event.key === TOKEN_KEY || event.key === USER_KEY) check(event);
    };
    window.addEventListener(SESSION_EVENT, check);
    window.addEventListener("focus", check);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", check);
    const unsubscribe = store.subscribe(() => {
      // Redux can also contain a credential that was cleared outside this tab.
      if (!checking) check();
    });
    check();
    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener(SESSION_EVENT, check);
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", check);
    };
  }, [store, navigate, setOpen]);

  return null;
}
