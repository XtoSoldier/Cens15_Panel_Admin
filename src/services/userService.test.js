import { api } from "config/api";
import userService from "./userService";

jest.mock("config/api", () => ({ api: { put: jest.fn(), post: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

test.each([undefined, "", " new-password "])("update forwards password unchanged and returns real response: %s", async (password) => {
  const body = { firstName: "Usuario", lastName: "Test" };
  if (password !== undefined) body.password = password;
  api.put.mockResolvedValue("");
  await expect(userService.update("u1", body)).resolves.toBe("");
  expect(api.put).toHaveBeenCalledWith("/Users/u1", body);
  expect(api.put.mock.calls[0][1]).toBe(body);
});

test("update propagates a credential error instead of simulating success", async () => {
  const error = new Error("El usuario no tiene credenciales de acceso.");
  api.put.mockRejectedValue(error);
  await expect(userService.update("u1", { password: "new-password" })).rejects.toBe(error);
});

test("create still uses registration without trimming password", async () => {
  const body = { email: "test@example.com", password: " initial-password " };
  api.post.mockResolvedValue({ id: "u1" });
  await expect(userService.create(body)).resolves.toEqual({ id: "u1" });
  expect(api.post).toHaveBeenCalledWith("/auth/register", body);
});
