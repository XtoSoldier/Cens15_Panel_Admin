import { useEffect, useState } from "react";
import Chip from "@mui/material/Chip";
import { config, checkApiHealth } from "config/api";

const API_CHECK_INTERVAL_MS = 2000;
const API_CHECK_TIMEOUT_MS = 1500;

function EnvironmentBadge() {
  const visible = process.env.REACT_APP_SHOW_ENV_INDICATOR === "true";
  const label = process.env.REACT_APP_ENV_LABEL;
  const apiBaseUrl = config.apiBase;
  const swaggerUrl = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/api\/?$/, "")}/swagger/index.html`
    : "";
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    if (!visible || !swaggerUrl) return undefined;

    let mounted = true;
    const checkApi = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
      try {
        const healthy = await checkApiHealth(controller.signal);
        if (mounted) setApiStatus(healthy ? "up" : "down");
      } catch {
        if (mounted) setApiStatus("down");
      } finally {
        window.clearTimeout(timeout);
      }
    };

    checkApi();
    const interval = window.setInterval(checkApi, API_CHECK_INTERVAL_MS);
    const handleFocus = () => checkApi();
    const handleOffline = () => mounted && setApiStatus("down");
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);
    window.addEventListener("offline", handleOffline);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
      window.removeEventListener("offline", handleOffline);
    };
  }, [apiBaseUrl, swaggerUrl, visible]);

  if (!visible || !label || !apiBaseUrl) return null;

  const statusLabel = apiStatus === "up" ? "API ACTIVA" : apiStatus === "down" ? "API CAIDA" : "VERIFICANDO";
  const statusColor = apiStatus === "up" ? "success" : apiStatus === "down" ? "error" : "warning";

  return (
    <Chip
      label={`${statusLabel} · ${label} · ${apiBaseUrl}`}
      title={`Abrir Swagger: ${swaggerUrl}`}
      color={statusColor}
      size="small"
      clickable
      onClick={() => window.open(swaggerUrl, "_blank", "noopener,noreferrer")}
      sx={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1400,
        fontWeight: 700,
        maxWidth: "calc(100vw - 32px)",
        letterSpacing: "0.04em",
        boxShadow: 3,
        "& .MuiChip-label": {
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

export default EnvironmentBadge;
