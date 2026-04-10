import type { Request, Response } from "express";

interface HealthPayload {
  status: "ok" | "degraded";
  message?: string;
}

type HealthProvider = () => HealthPayload;

export class AdminController {
  constructor(
    private readonly healthProvider: HealthProvider = () => ({ status: "ok" })
  ) {}

  health(_req: Request, res: Response): void {
    const payload = this.healthProvider();
    const statusCode = payload.status === "ok" ? 200 : 503;
    res.status(statusCode).json(payload);
  }
}
