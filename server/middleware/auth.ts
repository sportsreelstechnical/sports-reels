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
    req.session.userId = "demo-user";
    req.session.teamId = "demo-team";
    req.session.userRole =
      (req.headers["x-user-role"] as string) || "sporting_director";
  }
  next();
};

export const requireTeamRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    req.session.userId = "demo-user";
    req.session.teamId = "demo-team";
    req.session.userRole = "sporting_director";
  }
  next();
};

export const requireScoutRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    req.session.userId = "demo-scout";
    req.session.userRole = "scout";
  }
  next();
};

export const requireEmbassyRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    req.session.userId = "demo-embassy";
    req.session.userRole = "embassy";
    req.session.embassyCountry = "United Kingdom";
  }
  next();
};

export const requireFederationAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    req.session.userId = "demo-federation";
    req.session.userRole = "federation_admin";
  }
  next();
};

export const requireAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    req.session.userId = "demo-admin";
    req.session.userRole = "admin";
  }
  next();
};
