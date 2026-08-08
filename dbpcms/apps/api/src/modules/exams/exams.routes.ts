import { Router } from 'express';
import * as ctrl from './exams.controller';
import { requireAuth, requirePermission, requireRole } from '../../common/guards/auth.guard';
import { PERMISSIONS, ROLES } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.EXAM_VIEW), ctrl.listExams);
router.get('/:id', requirePermission(PERMISSIONS.EXAM_VIEW), ctrl.getExam);
router.post('/', requirePermission(PERMISSIONS.EXAM_CREATE), ctrl.createExam);
router.patch('/:id', requirePermission(PERMISSIONS.EXAM_CREATE), ctrl.updateExam);
router.post('/:id/auto-generate', requirePermission(PERMISSIONS.EXAM_CREATE), ctrl.autoGenerate);
router.post('/:id/questions', requirePermission(PERMISSIONS.EXAM_CREATE), ctrl.addQuestions);
router.delete(
  '/:id/questions/:questionId',
  requirePermission(PERMISSIONS.EXAM_CREATE),
  ctrl.removeQuestion,
);
router.post('/:id/reorder', requirePermission(PERMISSIONS.EXAM_CREATE), ctrl.reorder);
router.post(
  '/:id/publish',
  requireRole(ROLES.EXAM_COMMITTEE, ROLES.SUPER_ADMIN),
  ctrl.publish,
);
router.post(
  '/:id/archive',
  requireRole(ROLES.EXAM_COMMITTEE, ROLES.SUPER_ADMIN, ROLES.PRINCIPAL),
  ctrl.archive,
);
router.delete(
  '/:id',
  requireRole(ROLES.EXAM_COMMITTEE, ROLES.SUPER_ADMIN),
  ctrl.deleteExam,
);

export default router;
