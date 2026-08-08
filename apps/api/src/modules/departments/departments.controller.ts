import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { departmentsService } from "./departments.service.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const departmentsController = {
  async list(req: Request, res: Response): Promise<void> {
    const { items, total, page, pageSize } = await departmentsService.list(
      req.query,
    );
    sendList(res, items, { page, pageSize, totalItems: total });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const department = await departmentsService.getById(req.params.id!);
    sendSuccess(res, department);
  },

  async create(req: Request, res: Response): Promise<void> {
    const created = await departmentsService.create(req.body, actor(req));
    sendSuccess(res, created, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const updated = await departmentsService.update(
      req.params.id!,
      req.body,
      actor(req),
    );
    sendSuccess(res, updated);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await departmentsService.remove(req.params.id!, actor(req));
    res.status(204).send();
  },
};
