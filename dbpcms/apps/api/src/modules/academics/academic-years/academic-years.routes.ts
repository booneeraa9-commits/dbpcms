import { Router } from 'express';
import * as ctrl from './academic-years.controller';
import { requireAuth, requirePermission } from '../../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/current', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.getCurrent);
router.get('/', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.listYears);
router.get('/:id', requirePermission(PERMISSIONS.DEPARTMENT_VIEW), ctrl.getYear);
router.post('/', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.createYear);
router.post('/:id/set-current', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.setCurrentYear);
router.post('/semesters', requirePermission(PERMISSIONS.DEPARTMENT_MANAGE), ctrl.createSemester);

export default router;
