import type { Request, Response } from "express";

export class AdminController {
  health(_req: Request, res: Response): void {
    res.status(200).json({ status: "ok" });
  }
}
