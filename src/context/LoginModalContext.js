import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";

export const LoginModalContext = createContext();

export function LoginModalProvider({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <LoginModalContext.Provider value={{ open, setOpen }}>{children}</LoginModalContext.Provider>
  );
}

LoginModalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) throw new Error("useLoginModal must be used inside LoginModalProvider");
  return context;
}
