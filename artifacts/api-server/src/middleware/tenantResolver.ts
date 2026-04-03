import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { organisations } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: typeof organisations.$inferSelect;
    }
  }
}

export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const orgId = req.headers["x-organisation-id"] as string | undefined;

  if (!orgId) return next();

  try {
    const rows = await db
      .select()
      .from(organisations)
      .where(
        and(
          eq(organisations.id, orgId),
          eq(organisations.status as any, "Active")
        )
      )
      .limit(1);

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid organisation" });
    }

    req.tenantId = orgId;
    req.tenant   = rows[0];
    next();
  } catch {
    next();
  }
}
