import { Router } from 'express';
import * as ctrl from './departments.controller';
import { requireAuth, requirePermission } from '../../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/active', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.getActiveDepartments);
router.get('/', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.listDepartments);
router.get('/:id', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.getDepartment);
router.post('/', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.createDepartment);
router.patch('/:id', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.updateDepartment);
router.delete('/:id', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.deleteDepartment);

export default router;
