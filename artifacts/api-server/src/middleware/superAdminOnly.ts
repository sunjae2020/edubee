import { Request, Response, NextFunction } from "express";

export function superAdminOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(404).json({ message: "Not Found" });
  }
  next();
}
