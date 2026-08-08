import { Router } from 'express';
import * as ctrl from './students.controller';
import { requireAuth, requirePermission } from '../../common/guards/auth.guard';
import { PERMISSIONS } from '@dbpcms/shared';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(PERMISSIONS.STUDENT_VIEW), ctrl.listStudents);
router.get('/:id', requirePermission(PERMISSIONS.STUDENT_VIEW), ctrl.getStudent);
router.post('/', requirePermission(PERMISSIONS.STUDENT_CREATE), ctrl.createStudent);
router.patch('/:id', requirePermission(PERMISSIONS.STUDENT_UPDATE), ctrl.updateStudent);
router.delete('/:id', requirePermission(PERMISSIONS.STUDENT_DELETE), ctrl.deleteStudent);
router.post('/:id/registrations', requirePermission(PERMISSIONS.STUDENT_UPDATE), ctrl.registerStudent);
router.post('/import', requirePermission(PERMISSIONS.STUDENT_IMPORT), ctrl.bulkImportStudents);

export default router;
