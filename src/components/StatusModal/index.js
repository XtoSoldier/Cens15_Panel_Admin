import PropTypes from "prop-types";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";

function StatusModal({ open, onClose, onConfirm, userName, currentStatus, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar estado</DialogTitle>
      <DialogContent>
        <DialogContentText>
          ¿Estás seguro de que querés <strong>{currentStatus ? "desactivar" : "activar"}</strong> al
          usuario <strong>{userName}</strong>?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={currentStatus ? "error" : "success"}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : currentStatus ? (
            "Desactivar"
          ) : (
            "Activar"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

StatusModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  userName: PropTypes.string.isRequired,
  currentStatus: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default StatusModal;
