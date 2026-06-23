import { api } from "config/api";

export const loginActivityService = {
  getAll: () => api.get("/LoginActivities"),
};

export default loginActivityService;
