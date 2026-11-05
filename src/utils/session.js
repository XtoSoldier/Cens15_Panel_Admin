export const TOKEN_KEY = "token";
export const USER_KEY = "currentUser";
export const SESSION_EVENT = "panel-session-change";

export function tokenDeadline(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts.every(Boolean)) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    const deadline = exp * 1000;
    return typeof exp === "number" && Number.isFinite(deadline) ? deadline : null;
  } catch {
    return null;
  }
}

export const isTokenValid = (token) => {
  const deadline = tokenDeadline(token);
  return deadline !== null && deadline > Date.now();
};

export function notifySession(reason) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { reason } }));
}

// Comparing the credential prevents a late response from removing a newer login.
export function expireSession(expectedToken, reason = "expired") {
  if (localStorage.getItem(TOKEN_KEY) !== expectedToken) return false;
  const hadSession = Boolean(expectedToken || localStorage.getItem(USER_KEY));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (hadSession) notifySession(reason);
  return hadSession;
}

export function currentToken({ required = false } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && isTokenValid(token)) return token;
  const stale = Boolean(token || localStorage.getItem(USER_KEY));
  if (stale) expireSession(token);
  if (required || stale) {
    const error = new Error("La sesion vencio. Inicie sesion nuevamente.");
    error.status = 401;
    throw error;
  }
  return null;
}

export function sessionUser() {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    if (isTokenValid(token) && user?.token === token) return user;
  } catch { /* Invalid persisted credentials are not a session. */ }
  expireSession(token);
  return null;
}

export function handleSessionResponse(response, requestToken, url, apiBase, method = "GET") {
  const target = new URL(url, window.location.href);
  const base = new URL(apiBase, window.location.href);
  const path = base.pathname.replace(/\/$/, "");
  const ownApi = target.origin === base.origin && target.pathname.startsWith(`${path}/`);
  const anonymous = target.pathname === `${path}/health` ||
    (method === "POST" && target.pathname.toLowerCase() === `${path}/auth/login`.toLowerCase());
  if (response.status === 401 && requestToken && ownApi && !anonymous) {
    expireSession(requestToken);
  }
}
