/**
 * Application router.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PERMISSIONS } from '@dbpcms/shared';

// Lazy-loaded pages (code-split for smaller initial bundle)
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'));
const DashboardHome = lazy(() => import('@/features/dashboard/DashboardHome'));
const UsersListPage = lazy(() => import('@/features/users/UsersListPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const ChangePasswordPage = lazy(() => import('@/features/profile/ChangePasswordPage'));
const DepartmentsListPage = lazy(() => import('@/features/academics/DepartmentsListPage'));
const ProgramsListPage = lazy(() => import('@/features/academics/ProgramsListPage'));
const CoursesListPage = lazy(() => import('@/features/academics/CoursesListPage'));
const AcademicYearsPage = lazy(() => import('@/features/academics/AcademicYearsPage'));
const StudentsListPage = lazy(() => import('@/features/students/StudentsListPage'));
const StudentFormPage = lazy(() => import('@/features/students/StudentFormPage'));
const StudentDetailPage = lazy(() => import('@/features/students/StudentDetailPage'));
const StudentImportPage = lazy(() => import('@/features/students/StudentImportPage'));
const StudentIDCardPage = lazy(() => import('@/features/students/StudentIDCardPage'));
const QuestionsListPage = lazy(() => import('@/features/questions/QuestionsListPage'));
const QuestionFormPage = lazy(() => import('@/features/questions/QuestionFormPage'));
const QuestionDetailPage = lazy(() => import('@/features/questions/QuestionDetailPage'));
const ExamsListPage = lazy(() => import('@/features/exams/ExamsListPage'));
const ExamFormPage = lazy(() => import('@/features/exams/ExamFormPage'));
const ExamDetailPage = lazy(() => import('@/features/exams/ExamDetailPage'));
const ResultsListPage = lazy(() => import('@/features/results/ResultsListPage'));
const ResultEntryPage = lazy(() => import('@/features/results/ResultEntryPage'));
const ResultDetailPage = lazy(() => import('@/features/results/ResultDetailPage'));
const ResultBulkEntryPage = lazy(() => import('@/features/results/ResultBulkEntryPage'));
const TranscriptPage = lazy(() => import('@/features/results/TranscriptPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
const ActivityLogPage = lazy(() => import('@/features/activity/ActivityLogPage'));
const ForbiddenPage = lazy(() => import('@/features/errors/ForbiddenPage'));
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Authenticated routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />

            {/* Profile — every authenticated user can access */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/change-password" element={<ChangePasswordPage />} />

            {/* Users — admin only */}
            <Route
              path="users"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.USER_VIEW]}>
                  <UsersListPage />
                </ProtectedRoute>
              }
            />

            {/* Academic structure */}
            <Route
              path="departments"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.DEPARTMENT_VIEW]}>
                  <DepartmentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="programs"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.DEPARTMENT_VIEW]}>
                  <ProgramsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.COURSE_VIEW]}>
                  <CoursesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="academic-years"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.DEPARTMENT_VIEW]}>
                  <AcademicYearsPage />
                </ProtectedRoute>
              }
            />

            {/* Students */}
            <Route
              path="students"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.STUDENT_VIEW]}>
                  <StudentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/new"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.STUDENT_CREATE]}>
                  <StudentFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/import"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.STUDENT_IMPORT]}>
                  <StudentImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/:id"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.STUDENT_VIEW]}>
                  <StudentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/:id/edit"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.STUDENT_UPDATE]}>
                  <StudentFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/:id/id-card"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.STUDENT_VIEW]}>
                  <StudentIDCardPage />
                </ProtectedRoute>
              }
            />

            {/* Question Bank */}
            <Route
              path="questions"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.QUESTION_VIEW]}>
                  <QuestionsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="questions/new"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.QUESTION_CREATE]}>
                  <QuestionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="questions/:id"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.QUESTION_VIEW]}>
                  <QuestionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="questions/:id/edit"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.QUESTION_UPDATE]}>
                  <QuestionFormPage />
                </ProtectedRoute>
              }
            />

            {/* Exams */}
            <Route
              path="exams"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.EXAM_VIEW]}>
                  <ExamsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="exams/new"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.EXAM_CREATE]}>
                  <ExamFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="exams/:id"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.EXAM_VIEW]}>
                  <ExamDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="exams/:id/edit"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.EXAM_CREATE]}>
                  <ExamFormPage />
                </ProtectedRoute>
              }
            />

            {/* Results */}
            <Route
              path="results"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.REPORT_VIEW]}>
                  <ResultsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="results/new"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.RESULT_ENTRY]}>
                  <ResultEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="results/bulk"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.RESULT_ENTRY]}>
                  <ResultBulkEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="results/transcript"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.REPORT_VIEW]}>
                  <TranscriptPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="results/transcript/:studentId"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.REPORT_VIEW]}>
                  <TranscriptPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="results/:id"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.REPORT_VIEW]}>
                  <ResultDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="notifications"
              element={<NotificationsPage />}
            />
            <Route
              path="activity"
              element={
                <ProtectedRoute permissions={[PERMISSIONS.AUDIT_VIEW]}>
                  <ActivityLogPage />
                </ProtectedRoute>
              }
            />

            {/* Other module routes will be added in their phases */}
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
