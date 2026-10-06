import { Request, Response } from "express";
import { exportService } from "./export.service";
import { asyncHandler } from "server/utils/catchAsync";

export const exportController = {
  attendance: asyncHandler(async (req: Request, res: Response) => {
    // if (!req.schoolId) throw new AppError("Tenant context missing.", 403);

    const { classId, startDate, endDate } = req.query as Record<string, string>;
    const { csv, filename } = await exportService.attendanceCsv(req.schoolId, {
      classId,
      startDate,
      endDate,
    });

    sendCsv(res, csv, filename);
  }),

  grades: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);

    const { classId, term, academicYear } = req.query as Record<string, string>;
    const { csv, filename } = await exportService.gradesCsv(req.schoolId, {
      classId,
      term,
      academicYear,
    });

    sendCsv(res, csv, filename);
  }),
};
