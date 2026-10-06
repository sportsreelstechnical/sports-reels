import type { Express, Request, Response } from "express";
import { requireAuth, requireTeamRole } from "../middleware/auth";
import { asyncHandler } from "server/utils/catchAsync";
import axios from "axios";

export function registerTagRoutes(app: Express): void {
  app.patch(
    "/api/event_tags/:id",
    requireAuth,
    requireTeamRole,
    asyncHandler(async (req: Request, res: Response) => {
      const tagId = req.params.id;

      // validate request body

      // send request to internal microservice
      const response = await axios.patch(
        `${process.env.VIDEO_SERVICE_BASE_URL}/api/v1/event_tags/${tagId}`,
        {
          is_verified: req.body.is_verified ?? true,
          corrected_payload: req.body.corrected_payload,
        },
        {
          headers: {
            "X-Internal-API-Secret": process.env.INTERNAL_API_SECRET,
            "Content-Type": "application/json",
          },
        }
      );
      return res.json(response.data);
    })
  );
}
