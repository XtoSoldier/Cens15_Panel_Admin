import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { LoginModalProvider, useLoginModal } from "context/LoginModalContext";
import authReducer, { setAuth } from "store/slices/authSlice";
import { expireSession, notifySession } from "utils/session";
import ProtectedRoute from "components/ProtectedRoute";
import SessionGuard from "./index";

const jwt = (seconds = 60) => `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds })).replace(/=/g, "")}.signature`;
const save = (token) => {
  const user = { token, name: "Admin", expiration: "2999-01-01" };
  localStorage.setItem("token", token);
  localStorage.setItem("currentUser", JSON.stringify(user));
  return user;
};
function Probe() {
  const { open } = useLoginModal();
  return <span>{useLocation().pathname}:{String(open)}</span>;
}
let root;
let container;
let store;
const mount = (path = "/home") => act(() => root.render(
  <Provider store={store}>
    <MemoryRouter initialEntries={[path]}>
      <LoginModalProvider>
        <SessionGuard />
        <Probe />
        <Routes>
          <Route path="/home" element={<div>Guest</div>} />
          <Route path="/private" element={<ProtectedRoute><div>Private</div></ProtectedRoute>} />
        </Routes>
      </LoginModalProvider>
    </MemoryRouter>
  </Provider>
));
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.setSystemTime(1700000000000);
  localStorage.clear();
  store = configureStore({ reducer: { auth: authReducer } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("anonymous boot has no modal or redirect loop", () => {
  mount();
  expect(container.textContent).toBe("/home:falseGuest");
  expect(store.getState().auth.isAuthenticated).toBe(false);
});

test("anonymous private-route boot returns home without an expiry popup", () => {
  mount("/private");
  expect(container.textContent).toBe("/home:falseGuest");
});

test("a session-expired event immediately clears Redux and private content", () => {
  const token = jwt();
  const user = save(token);
  store.dispatch(setAuth({ isAuthenticated: true, currentUser: user }));
  mount("/private");
  act(() => expireSession(token));
  expect(container.textContent).toBe("/home:trueGuest");
  expect(store.getState().auth.currentUser).toBeNull();
});

test("a valid storage replacement must have a matching persisted user", () => {
  save(jwt());
  mount();
  const next = save(jwt(120));
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "currentUser" })));
  expect(store.getState().auth.currentUser).toEqual(next);
  localStorage.setItem("token", jwt(180));
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "token" })));
  expect(store.getState().auth.currentUser).toBeNull();
  expect(localStorage.length).toBe(0);
});

test("startup drops expired persisted and Redux credentials and opens login", () => {
  const user = save(jwt(-1));
  store.dispatch(setAuth({ isAuthenticated: true, currentUser: user }));
  mount("/private");
  expect(container.textContent).toBe("/home:trueGuest");
  expect(localStorage.length).toBe(0);
  expect(store.getState().auth.currentUser).toBeNull();
});

test("hydrates valid credentials then logs out at the exact JWT deadline", () => {
  const user = save(jwt(1));
  store.dispatch(setAuth({ isAuthenticated: true, currentUser: user }));
  mount("/private");
  expect(container.textContent).toContain("Private");
  act(() => jest.advanceTimersByTime(999));
  expect(store.getState().auth.isAuthenticated).toBe(true);
  act(() => jest.advanceTimersByTime(1));
  expect(container.textContent).toBe("/home:trueGuest");
  expect(store.getState().auth.currentUser).toBeNull();
  expect(localStorage.length).toBe(0);
});

test.each(["focus", "visibilitychange"])("%s detects expiry after a suspended tab resumes", (event) => {
  save(jwt());
  mount();
  jest.setSystemTime(Date.now() + 61000);
  act(() => (event === "focus" ? window : document).dispatchEvent(new Event(event)));
  expect(container.textContent).toBe("/home:trueGuest");
  expect(store.getState().auth.isAuthenticated).toBe(false);
});

test("storage logout clears the old Redux user; invalid replacement is never adopted", () => {
  save(jwt());
  mount();
  localStorage.clear();
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
  expect(store.getState().auth.currentUser).toBeNull();
  save("invalid");
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "token" })));
  expect(store.getState().auth.currentUser).toBeNull();
  expect(localStorage.length).toBe(0);
});

test("new valid login resets the deadline and a late old expiry does not log it out", () => {
  const old = jwt(1);
  save(old);
  mount();
  const next = jwt(120);
  save(next);
  act(() => notifySession("login"));
  act(() => expireSession(old));
  act(() => jest.advanceTimersByTime(1000));
  expect(store.getState().auth.currentUser.token).toBe(next);
  act(() => jest.advanceTimersByTime(119000));
  expect(store.getState().auth.isAuthenticated).toBe(false);
});

test("explicit logout clears Redux without opening login", () => {
  const token = jwt();
  save(token);
  mount();
  act(() => expireSession(token, "logout"));
  expect(container.textContent).toBe("/home:falseGuest");
  expect(store.getState().auth.currentUser).toBeNull();
});

test("caps long timers and removes timers and listeners on unmount", () => {
  save(jwt(3000000));
  mount();
  act(() => jest.advanceTimersByTime(2147483647));
  expect(store.getState().auth.isAuthenticated).toBe(true);
  expect(jest.getTimerCount()).toBe(1);
  act(() => root.unmount());
  expect(jest.getTimerCount()).toBe(0);
  const before = store.getState();
  localStorage.clear();
  window.dispatchEvent(new Event("focus"));
  expect(store.getState()).toBe(before);
  root = createRoot(container);
});
