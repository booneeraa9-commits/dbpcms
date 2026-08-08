import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess, sendNoContent } from '../../common/utils/response';
import { getCurrentUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../common/errors/AppError';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
} from './users.schema';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.list(req, query);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getById(req.params.id);
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const caller = getCurrentUser(req);
    if (!caller) throw new UnauthorizedError();
    const input = createUserSchema.parse(req.body);
    const user = await usersService.create(req, input, caller.id);
    return sendSuccess(res, user, 201);
  } catch (err) {
    return next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const caller = getCurrentUser(req);
    if (!caller) throw new UnauthorizedError();
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.update(req, req.params.id, input, caller.id);
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const caller = getCurrentUser(req);
    if (!caller) throw new UnauthorizedError();
    await usersService.delete(req, req.params.id, caller.id);
    return sendNoContent(res);
  } catch (err) {
    return next(err);
  }
}

export async function getRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await usersService.getAllRoles();
    return sendSuccess(res, roles);
  } catch (err) {
    return next(err);
  }
}
