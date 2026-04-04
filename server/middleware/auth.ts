import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    teamId?: string;
    userRole?: string;
    username?: string;
    embassyCountry?: string;
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const TEAM_ROLES = ["sporting_director", "coach", "legal", "admin"];

export const requireTeamRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.userRole && !TEAM_ROLES.includes(req.session.userRole)) {
    return res.status(403).json({ error: "Forbidden: team role required" });
  }
  next();
};

export const requireScoutRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.userRole && req.session.userRole !== "scout" && req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden: scout role required" });
  }
  next();
};

export const requireEmbassyRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.userRole && req.session.userRole !== "embassy" && req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden: embassy role required" });
  }
  next();
};

export const requireFederationAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.userRole && req.session.userRole !== "federation_admin" && req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden: federation role required" });
  }
  next();
};

export const requireAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden: admin role required" });
  }
  next();
};
