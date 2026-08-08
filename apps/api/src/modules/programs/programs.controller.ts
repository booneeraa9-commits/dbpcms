import type { Request, Response } from "express";
import { sendList, sendSuccess } from "../../core/http/responses.js";
import { programsService } from "./programs.service.js";

function actor(req: Request) {
  return {
    userId: req.auth!.userId,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export const programsController = {
  async list(req: Request, res: Response): Promise<void> {
    const { items, total, page, pageSize } = await programsService.list(
      req.query as Record<string, unknown>,
    );
    sendList(res, items, { page, pageSize, totalItems: total });
  },
  async getById(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await programsService.getById(req.params.id!));
  },
  async create(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await programsService.create(req.body, actor(req)), 201);
  },
  async update(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await programsService.update(req.params.id!, req.body, actor(req)),
    );
  },
  async remove(req: Request, res: Response): Promise<void> {
    await programsService.remove(req.params.id!, actor(req));
    res.status(204).send();
  },
};
