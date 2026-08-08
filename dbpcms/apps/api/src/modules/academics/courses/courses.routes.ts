import { Router } from 'express';
import * as ctrl from './courses.controller';
import { requireAuth, requirePermission } from '../../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.COURSE_VIEW), ctrl.listCourses);
router.get('/:id', requirePermission(PERMISSIONS.COURSE_VIEW), ctrl.getCourse);
router.post('/', requirePermission(PERMISSIONS.COURSE_MANAGE), ctrl.createCourse);
router.patch('/:id', requirePermission(PERMISSIONS.COURSE_MANAGE), ctrl.updateCourse);
router.delete('/:id', requirePermission(PERMISSIONS.COURSE_MANAGE), ctrl.deleteCourse);

export default router;
