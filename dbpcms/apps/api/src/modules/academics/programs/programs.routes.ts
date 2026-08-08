import { Router } from 'express';
import * as ctrl from './programs.controller';
import { requireAuth, requirePermission } from '../../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.listPrograms);
router.get('/:id', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.getProgram);
router.post('/', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.createProgram);
router.patch('/:id', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.updateProgram);
router.delete('/:id', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.deleteProgram);

export default router;
