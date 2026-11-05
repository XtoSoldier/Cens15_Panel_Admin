import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { isTokenValid, TOKEN_KEY } from "utils/session";

function ProtectedRoute({ children }) {
  const { isAuthenticated, currentUser } = useSelector((state) => state.auth);

  if (!isAuthenticated || !isTokenValid(currentUser?.token) ||
      currentUser.token !== localStorage.getItem(TOKEN_KEY)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
