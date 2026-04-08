import { Router } from "express";
import { AdminController } from "./controllers/adminController.js";

export function buildHttpRoutes(): Router {
  const router = Router();
  const adminController = new AdminController();

  router.get("/health", adminController.health.bind(adminController));

  return router;
}
