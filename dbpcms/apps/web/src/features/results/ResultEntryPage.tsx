/**
 * Result Entry — simple form for teachers to enter marks.
 * Selects student + course + semester + assessment type, then enters marks.
 */

import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2, FileSpreadsheet, Award, CheckCircle2, XCircle } from 'lucide-react';
import { useCreateResult } from '@/hooks/useResults';
import { useStudents } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useAcademics';
import { useAcademicYears } from '@/hooks/useAcademics';
import toast from 'react-hot-toast';

const formSchema = z.object({
  studentId: z.string().uuid('Select a student'),
  courseId: z.string().uuid('Select a course'),
  semesterId: z.string().uuid('Select a semester'),
  assessmentType: z.enum(['EXAM', 'ASSIGNMENT', 'PRACTICAL', 'PROJECT']),
  marksObtained: z.coerce.number().min(0).max(1000),
  marksTotal: z.coerce.number().min(0.1).max(1000),
  remarks: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ResultEntryPage() {
  const navigate = useNavigate();
  const create = useCreateResult();
  const { data: studentsData } = useStudents({ pageSize: 100 });
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: years } = useAcademicYears();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      courseId: '',
      semesterId: years?.[0]?.semesters?.[0]?.id ?? '',
      assessmentType: 'EXAM',
      marksObtained: 0,
      marksTotal: 100,
      remarks: '',
    },
  });

  const obtained = watch('marksObtained');
  const total = watch('marksTotal');
  const pct = total > 0 ? (obtained / total) * 100 : 0;
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : pct >= 50 ? 'E' : 'F';
  const isPass = pct >= 50;

  const onSubmit = async (data: FormData) => {
    try {
      const created = await create.mutateAsync(data);
      toast.success(`Result entered! ${isPass ? '✓ Pass' : '✗ Fail'} · Grade ${grade}`);
      navigate(`/app/results/${created.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enter Result</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Record a student's marks for a course</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <div className="card-body space-y-4">
          <div>
            <label className="form-label">Student *</label>
            <select {...register('studentId')} className="form-input">
              <option value="">Select student…</option>
              {studentsData?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentIdNumber} — {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            {errors.studentId && <p className="form-error">{errors.studentId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Course *</label>
              <select {...register('courseId')} className="form-input">
                <option value="">Select course…</option>
                {coursesData?.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
              {errors.courseId && <p className="form-error">{errors.courseId.message}</p>}
            </div>
            <div>
              <label className="form-label">Semester *</label>
              <select {...register('semesterId')} className="form-input">
                <option value="">Select semester…</option>
                {years?.flatMap((y) => y.semesters.map((s) => (
                  <option key={s.id} value={s.id}>{y.name} — {s.name}</option>
                )))}
              </select>
              {errors.semesterId && <p className="form-error">{errors.semesterId.message}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Assessment type *</label>
            <select {...register('assessmentType')} className="form-input">
              <option value="EXAM">Exam</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PRACTICAL">Practical</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Marks obtained *</label>
              <input type="number" step="0.01" min={0} {...register('marksObtained')} className="form-input" />
              {errors.marksObtained && <p className="form-error">{errors.marksObtained.message}</p>}
            </div>
            <div>
              <label className="form-label">Out of (total) *</label>
              <input type="number" step="0.01" min={0.1} {...register('marksTotal')} className="form-input" />
              {errors.marksTotal && <p className="form-error">{errors.marksTotal.message}</p>}
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-700/30 p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Calculated</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${isPass ? 'text-success-600' : 'text-danger-600'}`}>
                  {pct.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Grade</span>
                <span className={`text-2xl font-bold ${
                  grade === 'A' ? 'text-success-600' : grade === 'F' ? 'text-danger-600' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {grade}
                </span>
              </div>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
              isPass
                ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400'
                : 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400'
            }`}>
              {isPass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {isPass ? 'Pass' : 'Fail'}
            </div>
          </div>

          <div>
            <label className="form-label">Remarks (optional)</label>
            <textarea {...register('remarks')} rows={2} className="form-input" placeholder="Any notes about this result…" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Result
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
