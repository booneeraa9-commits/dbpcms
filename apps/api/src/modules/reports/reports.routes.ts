import { Router } from "express";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@dbpcms/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { sendSuccess } from "../../core/http/responses.js";
import { ValidationError } from "../../core/errors/app-error.js";
import { hrReportsService } from "./hr-reports.service.js";
import { exportReport } from "../../core/reports/exporters.js";

/**
 * HR report routes. Same report data can be viewed as JSON (on screen) or
 * exported via ?format=pdf|excel|csv. All require the report:view permission.
 */
export const reportsRouter = Router();
reportsRouter.use(authenticate);

reportsRouter.get(
  "/hr/:reportKey",
  requirePermission(PERMISSIONS.REPORT_VIEW),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as Record<string, string>;
    const report = await hrReportsService.build(req.params.reportKey!, filters);
    const format = typeof req.query.format === "string" ? req.query.format : "json";

    if (format === "json") {
      sendSuccess(res, report);
      return;
    }
    if (format !== "pdf" && format !== "excel" && format !== "csv") {
      throw new ValidationError([
        { field: "format", message: "format must be json, pdf, excel, or csv." },
      ]);
    }

    const { data, contentType, filename } = await exportReport(report, format);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(data);
  }),
);
