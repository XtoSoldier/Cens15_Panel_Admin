const ENV = process.env.REACT_APP_ENV || "development";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://localhost:7000/api";
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

const getHeaders = (extraHeaders = {}) => {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
      else if (errorData?.error) errorMessage = errorData.error;
    } catch {
      // respuesta sin body JSON
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

const request = async (method, endpoint, body = null, options = {}) => {
  const { headers = {}, params = {} } = options;

  const query = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : "";

  const url = `${API_BASE}${endpoint}${query}`;

  const config = {
    method,
    headers: getHeaders(headers),
    signal: AbortSignal.timeout(TIMEOUT),
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
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
