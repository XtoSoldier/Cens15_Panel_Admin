import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { checkApiHealth } from "config/api";
import EnvironmentBadge from "./index";

jest.mock("config/api", () => ({ config: { apiBase: "https://own.test/api" }, checkApiHealth: jest.fn() }));
jest.mock("@mui/material/Chip", () => ({ label }) => <span>{label}</span>);

let root;
let container;
const previousVisible = process.env.REACT_APP_SHOW_ENV_INDICATOR;
const previousLabel = process.env.REACT_APP_ENV_LABEL;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.clearAllMocks();
  checkApiHealth.mockResolvedValue(true);
  process.env.REACT_APP_SHOW_ENV_INDICATOR = "true";
  process.env.REACT_APP_ENV_LABEL = "TEST";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
  if (previousVisible === undefined) delete process.env.REACT_APP_SHOW_ENV_INDICATOR;
  else process.env.REACT_APP_SHOW_ENV_INDICATOR = previousVisible;
  if (previousLabel === undefined) delete process.env.REACT_APP_ENV_LABEL;
  else process.env.REACT_APP_ENV_LABEL = previousLabel;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("polls once on mount, then every 60 seconds instead of every 2 seconds", async () => {
  await act(async () => root.render(<EnvironmentBadge />));
  expect(checkApiHealth).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(59999));
  expect(checkApiHealth).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(1));
  expect(checkApiHealth).toHaveBeenCalledTimes(2);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(checkApiHealth).toHaveBeenCalledTimes(3);
});

test("focus and reconnect still check immediately, and unmount stops polling", async () => {
  await act(async () => root.render(<EnvironmentBadge />));
  await act(async () => window.dispatchEvent(new Event("focus")));
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(checkApiHealth).toHaveBeenCalledTimes(3);
  await act(async () => root.render(null));
  await act(async () => jest.advanceTimersByTime(120000));
  expect(checkApiHealth).toHaveBeenCalledTimes(3);
});
