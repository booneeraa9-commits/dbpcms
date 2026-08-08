import { Router } from 'express';
import * as ctrl from './occupations.controller';
import { requireAuth, requirePermission } from '../../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/active', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.getActiveOccupations);
router.get('/', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.listOccupations);
router.post('/', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.createOccupation);
router.patch('/:id', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.updateOccupation);
router.delete('/:id', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.deleteOccupation);

export default router;
