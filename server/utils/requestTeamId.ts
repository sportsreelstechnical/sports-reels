import type { Request } from "express";

type StorageLike = {
  getUser: (id: string) => Promise<{ teamId?: string | null } | undefined>;
};

/**
 * Resolves teamId for the request: use session.teamId, or load from user when
 * session has userId but no teamId (e.g. session not fully restored).
 */
export async function getTeamIdForRequest(
  req: Request,
  storage: StorageLike
): Promise<string | undefined> {
  // If session already has teamId, use it
  if (req.session.teamId) {
    return req.session.teamId;
  }
  
  // No userId means not logged in
  if (!req.session.userId) {
    return undefined;
  }
  
  // Load teamId from user record and cache in session
  const user = await storage.getUser(req.session.userId);
  const teamId = user?.teamId ?? undefined;
  
  console.log("[getTeamIdForRequest] userId:", req.session.userId, "user.teamId:", user?.teamId, "resolved:", teamId);
  
  if (teamId) {
    req.session.teamId = teamId;
    // Save session to persist the teamId
    await new Promise<void>((resolve) => {
      req.session.save((err) => {
        if (err) console.error("[getTeamIdForRequest] Session save error:", err);
        resolve();
      });
    });
  }
  
  return teamId;
}
