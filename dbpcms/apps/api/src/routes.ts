/**
 * Central API router.
 */

import { Router } from 'express';
import { globalRateLimiter } from './common/middlewares/rateLimit';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import departmentsRoutes from './modules/academics/departments/departments.routes';
import programsRoutes from './modules/academics/programs/programs.routes';
import occupationsRoutes from './modules/academics/occupations/occupations.routes';
import coursesRoutes from './modules/academics/courses/courses.routes';
import competenciesRoutes from './modules/academics/competencies/competencies.routes';
import academicYearsRoutes from './modules/academics/academic-years/academic-years.routes';
import studentsRoutes from './modules/students/students.routes';
import questionsRoutes from './modules/questions/questions.routes';
import examsRoutes from './modules/exams/exams.routes';
import resultsRoutes from './modules/results/results.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import activityRoutes from './modules/activity/activity.routes';

const router = Router();
router.use(globalRateLimiter);

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/departments', departmentsRoutes);
router.use('/programs', programsRoutes);
router.use('/occupations', occupationsRoutes);
router.use('/courses', coursesRoutes);
router.use('/competencies', competenciesRoutes);
router.use('/academic-years', academicYearsRoutes);
router.use('/students', studentsRoutes);
router.use('/questions', questionsRoutes);
router.use('/exams', examsRoutes);
router.use('/results', resultsRoutes);

export default router;
