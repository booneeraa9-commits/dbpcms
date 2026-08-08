/**
 * Users routes — all require auth + user management permissions.
 */

import { Router } from 'express';
import * as usersController from './users.controller';
import { requireAuth, requirePermission } from '../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();

router.use(requireAuth);

router.get('/roles', requirePermission(PERMISSIONS.USER_VIEW), usersController.getRoles);

router.get(
  '/',
  requirePermission(PERMISSIONS.USER_VIEW),
  usersController.listUsers,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.USER_VIEW),
  usersController.getUser,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.USER_CREATE),
  usersController.createUser,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.USER_UPDATE),
  usersController.updateUser,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.USER_DELETE),
  usersController.deleteUser,
);

export default router;
