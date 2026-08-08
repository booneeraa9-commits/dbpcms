import { Router } from 'express';
import * as ctrl from './questions.controller';
import { requireAuth, requirePermission, requireRole } from '../../common/guards/auth.guard';
import { PERMISSIONS, ROLES } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.QUESTION_VIEW), ctrl.listQuestions);
router.get('/:id', requirePermission(PERMISSIONS.QUESTION_VIEW), ctrl.getQuestion);
router.post('/', requirePermission(PERMISSIONS.QUESTION_CREATE), ctrl.createQuestion);
router.patch('/:id', requirePermission(PERMISSIONS.QUESTION_UPDATE), ctrl.updateQuestion);
router.post('/:id/submit', requirePermission(PERMISSIONS.QUESTION_CREATE), ctrl.submitForReview);

// Only department_head can review
router.post(
  '/:id/review',
  requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN),
  ctrl.reviewQuestion,
);

// Only exam_committee can approve
router.post(
  '/:id/approve',
  requireRole(ROLES.EXAM_COMMITTEE, ROLES.SUPER_ADMIN),
  ctrl.approveQuestion,
);

router.post('/:id/retire', requirePermission(PERMISSIONS.QUESTION_UPDATE), ctrl.retireQuestion);
router.delete('/:id', requirePermission(PERMISSIONS.QUESTION_DELETE), ctrl.deleteQuestion);

export default router;
