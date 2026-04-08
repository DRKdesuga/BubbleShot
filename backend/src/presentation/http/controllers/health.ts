import { Request, Response } from "express";
import { ping } from "../../../application/services/healthService.js";

export function healthHandler(_req: Request, res: Response) {
  res.json(ping());
}
