import { currentToken, handleSessionResponse } from "utils/session";

const ENV = process.env.REACT_APP_ENV || "development";
const configuredApiBase = process.env.REACT_APP_API_BASE_URL || "https://localhost:7000/api";
const resolveApiBase = (url) => {
  if (!url.includes("{hostname}")) return url;
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  if (!hostname) throw new Error("INTRANET API URL requires a browser page hostname.");
  return url.replace(/\{hostname\}/g, hostname);
};
const API_BASE = resolveApiBase(configuredApiBase);
const TIMEOUT = parseInt(process.env.REACT_APP_REQUEST_TIMEOUT, 10) || 30000;

export const IS_DEV = ENV === "development";
export const IS_STAGING = ENV === "staging";
export const IS_PROD = ENV === "production";

export const config = {
  env: ENV,
  apiBase: API_BASE,
  timeout: TIMEOUT,
  isDev: IS_DEV,
  isStaging: IS_STAGING,
  isProd: IS_PROD,
};

export const checkApiHealth = async (signal) => {
  const response = await fetch(`${API_BASE.replace(/\/$/, "")}/health`, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  return response.ok && (await response.json()).status === "ok";
};

const getHeaders = (extraHeaders = {}, token) => {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let errorData;
    let errorMessage = `Error ${response.status}: ${response.statusText}`;
    if (contentType && contentType.includes("application/json")) {
      try {
        errorData = await response.json();
        if (errorData?.message) errorMessage = errorData.message;
        else if (errorData?.error) errorMessage = errorData.error;
        else if (typeof errorData === "string") errorMessage = errorData;
      } catch {
        // respuesta sin body JSON
      }
    } else {
      try {
        errorMessage = await response.text();
      } catch {
        // fallback
      }
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = errorData;
    if (response.status === 409) error.reporte = errorData;
    throw error;
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

const request = async (method, endpoint, body = null, options = {}) => {
  const { headers = {}, params = {} } = options;

  const query = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : "";

  const url = `${API_BASE}${endpoint}${query}`;
  const anonymous = (method === "POST" && endpoint.toLowerCase() === "/auth/login") || endpoint === "/health";
  let token = null;
  if (anonymous) {
    // A stale credential must not prevent the next public login attempt.
    if (endpoint !== "/health") {
      try { currentToken(); } catch { /* Cleared by the session utility. */ }
    }
  } else {
    token = currentToken();
  }

  const config = {
    method,
    headers: getHeaders(headers, token),
    signal: AbortSignal.timeout(TIMEOUT),
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  const sentToken = config.headers.Authorization?.startsWith("Bearer ")
    ? config.headers.Authorization.slice(7) : null;
  handleSessionResponse(response, sentToken, url, API_BASE, method);
  return handleResponse(response);
};

export const api = {
  get: (endpoint, options = {}) => request("GET", endpoint, null, options),
  post: (endpoint, body, options = {}) => request("POST", endpoint, body, options),
  put: (endpoint, body, options = {}) => request("PUT", endpoint, body, options),
  patch: (endpoint, body, options = {}) => request("PATCH", endpoint, body, options),
  delete: (endpoint, options = {}) => request("DELETE", endpoint, null, options),
};

export default config;
