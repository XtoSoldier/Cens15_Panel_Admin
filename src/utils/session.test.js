import { currentToken, expireSession, handleSessionResponse, isTokenValid, sessionUser, SESSION_EVENT, tokenDeadline } from "./session";

const jwt = (payload) => `e30.${btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;
const save = (token) => {
  localStorage.setItem("token", token);
  localStorage.setItem("currentUser", JSON.stringify({ token, expiration: "2999-01-01" }));
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1700000000000);
  localStorage.clear();
});
afterEach(() => jest.useRealTimers());

test("decodes unpadded base64url and expires at the exact JWT deadline", () => {
  const token = jwt({ exp: Date.now() / 1000 + 1 });
  expect(tokenDeadline(token)).toBe(Date.now() + 1000);
  expect(isTokenValid(token)).toBe(true);
  jest.advanceTimersByTime(1000);
  expect(isTokenValid(token)).toBe(false);
});

test.each([null, "bad", "a.b.c", jwt({}), jwt({ exp: "1800000000" }), jwt({ exp: null }), jwt({ exp: 1e308 })])(
  "rejects malformed or non-numeric expiry: %s", (token) => expect(isTokenValid(token)).toBe(false)
);

test("stored expiration cannot extend a JWT; clears both keys with one event", () => {
  save(jwt({ exp: Date.now() / 1000 }));
  const listener = jest.fn();
  window.addEventListener(SESSION_EVENT, listener);
  expect(() => currentToken()).toThrow(/sesion/);
  expect(sessionUser()).toBeNull();
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("currentUser")).toBeNull();
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener(SESSION_EVENT, listener);
});

test("a mismatched persisted user is not authenticated", () => {
  save(jwt({ exp: Date.now() / 1000 + 60 }));
  localStorage.setItem("currentUser", JSON.stringify({ token: "other" }));
  expect(sessionUser()).toBeNull();
  expect(localStorage.length).toBe(0);
});

test("late expiry and 401 cannot remove a newer credential", () => {
  const old = jwt({ exp: Date.now() / 1000 + 60 });
  const next = jwt({ exp: Date.now() / 1000 + 120 });
  save(next);
  expect(expireSession(old)).toBe(false);
  handleSessionResponse({ status: 401 }, old, "https://own/api/users", "https://own/api");
  expect(currentToken()).toBe(next);
});

test.each([
  [403, "https://own/api/users", "GET"],
  [500, "https://own/api/users", "GET"],
  [401, "https://external/api/users", "GET"],
  [401, "https://own/api-other/users", "GET"],
  [401, "https://own/api/health", "GET"],
  [401, "https://own/api/auth/login", "POST"],
])("does not expire HTTP %s for %s", (status, url, method) => {
  const token = jwt({ exp: Date.now() / 1000 + 60 });
  save(token);
  handleSessionResponse({ status }, token, url, "https://own/api", method);
  expect(currentToken()).toBe(token);
});

test("only a 401 carrying the current credential expires the session", () => {
  const token = jwt({ exp: Date.now() / 1000 + 60 });
  save(token);
  handleSessionResponse({ status: 401 }, null, "https://own/api/users", "https://own/api");
  expect(currentToken()).toBe(token);
  handleSessionResponse({ status: 401 }, token, "https://own/api/users", "https://own/api");
  expect(localStorage.length).toBe(0);
});
