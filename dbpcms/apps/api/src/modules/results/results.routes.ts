import { Router } from 'express';
import * as ctrl from './results.controller';
import { requireAuth, requirePermission, requireRole } from '../../common/guards/auth.guard';
import { PERMISSIONS, ROLES } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.REPORT_VIEW), ctrl.listResults);
router.get('/:id', requirePermission(PERMISSIONS.REPORT_VIEW), ctrl.getResult);
router.get('/transcript/:studentId', requirePermission(PERMISSIONS.REPORT_VIEW), ctrl.getTranscript);

router.post('/', requirePermission(PERMISSIONS.RESULT_ENTRY), ctrl.createResult);
router.post('/bulk', requirePermission(PERMISSIONS.RESULT_ENTRY), ctrl.bulkCreateResults);
router.patch('/:id', requirePermission(PERMISSIONS.RESULT_ENTRY), ctrl.updateResult);
router.delete('/:id', requirePermission(PERMISSIONS.RESULT_ENTRY), ctrl.deleteResult);

// Workflow actions
router.post('/:id/submit', requirePermission(PERMISSIONS.RESULT_ENTRY), ctrl.submitResult);
router.post('/:id/verify', requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN), ctrl.verifyResult);
router.post('/:id/approve', requireRole(ROLES.ACADEMIC_DEAN, ROLES.SUPER_ADMIN), ctrl.approveResult);
router.post('/:id/authorize', requireRole(ROLES.REGISTRAR, ROLES.SUPER_ADMIN), ctrl.authorizeResult);
router.post('/:id/publish', requireRole(ROLES.REGISTRAR, ROLES.SUPER_ADMIN), ctrl.publishResult);
router.post('/:id/reject', requirePermission(PERMISSIONS.REPORT_VIEW), ctrl.rejectResult);

export default router;
