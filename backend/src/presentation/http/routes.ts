import { Router } from "express";
import { AdminController } from "./controllers/adminController.js";

interface HealthPayload {
  status: "ok" | "degraded";
  message?: string;
}

interface HttpRoutesConfig {
  healthProvider?: () => HealthPayload;
}

export function buildHttpRoutes(config?: HttpRoutesConfig): Router {
  const router = Router();
  const adminController = new AdminController(config?.healthProvider);

  router.get("/health", adminController.health.bind(adminController));

  return router;
}
