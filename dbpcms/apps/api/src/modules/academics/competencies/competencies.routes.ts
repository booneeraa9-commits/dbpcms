import { Router } from 'express';
import * as ctrl from './competencies.controller';
import { requireAuth, requirePermission } from '../../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.COURSE_VIEW), ctrl.listCompetencies);
router.get('/:id', requirePermission(PERMISSIONS.COURSE_VIEW), ctrl.getCompetency);
router.post('/', requirePermission(PERMISSIONS.COURSE_MANAGE), ctrl.createCompetency);
router.patch('/:id', requirePermission(PERMISSIONS.COURSE_MANAGE), ctrl.updateCompetency);
router.delete('/:id', requirePermission(PERMISSIONS.COURSE_MANAGE), ctrl.deleteCompetency);

export default router;
