/**
 * Exam Form — create exam + auto-generate questions.
 *
 * Two-step flow:
 *   1. Create the exam (title, course, semester, time, marks, etc.)
 *   2. Auto-generate questions from the bank, OR pick manually (next phase)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, Loader2, ArrowLeft, Sparkles, BookOpen, Clock, Award,
  CheckCircle2, AlertCircle, FileText, ChevronRight,
} from 'lucide-react';
import { useCreateExam, useAutoGenerate, useExam } from '@/hooks/useExams';
import { useCourses } from '@/hooks/useAcademics';
import { useCurrentAcademicYear, useAcademicYears } from '@/hooks/useAcademics';
import { QUESTION_TYPES } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  courseId: z.string().uuid('Select a course'),
  semesterId: z.string().uuid('Select a semester'),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  totalMarks: z.coerce.number().min(1).max(1000),
  instructions: z.string().max(2000).optional(),
  difficultyEasy: z.coerce.number().min(0).max(100).default(30),
  difficultyMedium: z.coerce.number().min(0).max(100).default(50),
  difficultyHard: z.coerce.number().min(0).max(100).default(20),
});

type FormData = z.infer<typeof formSchema>;

export default function ExamFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'generate'>('details');
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['MULTIPLE_CHOICE', 'TRUE_FALSE']);

  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: years } = useAcademicYears();
  const currentYear = useCurrentAcademicYear();
  const create = useCreateExam();
  const autoGen = useAutoGenerate();
  const { data: createdExam } = useExam(createdExamId || undefined);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      courseId: '',
      semesterId: currentYear.data?.semester?.id ?? '',
      durationMinutes: 60,
      totalMarks: 50,
      instructions: '',
      difficultyEasy: 30,
      difficultyMedium: 50,
      difficultyHard: 20,
    },
  });

  const onCreate = async (data: FormData) => {
    try {
      const exam = await create.mutateAsync({
        title: data.title,
        courseId: data.courseId,
        semesterId: data.semesterId,
        durationMinutes: data.durationMinutes,
        totalMarks: data.totalMarks,
        instructions: data.instructions,
        difficultyDistribution: {
          EASY: data.difficultyEasy,
          MEDIUM: data.difficultyMedium,
          HARD: data.difficultyHard,
        },
      });
      setCreatedExamId(exam.id);
      setStep('generate');
      toast.success('Exam created! Now generate questions.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onAutoGenerate = async () => {
    if (!createdExamId) return;
    try {
      const data = watch();
      await autoGen.mutateAsync({
        id: createdExamId,
        config: {
          totalQuestions,
          types: selectedTypes,
          difficultyDistribution: {
            EASY: data.difficultyEasy,
            MEDIUM: data.difficultyMedium,
            HARD: data.difficultyHard,
          },
        },
      });
      toast.success('🎉 Questions generated! Redirecting…');
      setTimeout(() => navigate(`/app/exams/${createdExamId}`), 800);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Exam</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Step {step === 'details' ? '1' : '2'} of 2: {step === 'details' ? 'Exam Details' : 'Generate Questions'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`flex items-center gap-2 ${step === 'details' ? 'text-primary-700 font-semibold' : 'text-success-700'}`}>
          {step === 'details' ? (
            <div className="h-6 w-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">1</div>
          ) : (
            <CheckCircle2 className="h-5 w-5 text-success-600" />
          )}
          Details
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <div className={`flex items-center gap-2 ${step === 'generate' ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === 'generate' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          Generate
        </div>
      </div>

      {step === 'details' && (
        <form onSubmit={handleSubmit(onCreate)} className="card">
          <div className="card-body space-y-4">
            <div>
              <label className="form-label">Title *</label>
              <input {...register('title')} className="form-input" placeholder="e.g. Mid-term Exam - Database Design" />
              {errors.title && <p className="form-error">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Course *</label>
                <select {...register('courseId')} className="form-input">
                  <option value="">Select course…</option>
                  {coursesData?.items.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name} (L{c.level})</option>
                  ))}
                </select>
                {errors.courseId && <p className="form-error">{errors.courseId.message}</p>}
              </div>
              <div>
                <label className="form-label">Semester *</label>
                <select {...register('semesterId')} className="form-input">
                  <option value="">Select semester…</option>
                  {years?.flatMap((y) => (y.semesters || []).map((s) => (
                    <option key={s.id} value={s.id}>{y.name} — {s.name}</option>
                  )))}
                </select>
                {errors.semesterId && <p className="form-error">{errors.semesterId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Duration (minutes) *</label>
                <input type="number" min={5} max={600} {...register('durationMinutes')} className="form-input" />
                {errors.durationMinutes && <p className="form-error">{errors.durationMinutes.message}</p>}
              </div>
              <div>
                <label className="form-label">Total marks *</label>
                <input type="number" min={1} {...register('totalMarks')} className="form-input" />
                {errors.totalMarks && <p className="form-error">{errors.totalMarks.message}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Instructions (optional)</label>
              <textarea {...register('instructions')} rows={3} className="form-input" placeholder="Instructions for students taking this exam…" />
            </div>

            <div>
              <label className="form-label">Difficulty distribution (% of questions)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Easy</label>
                  <input type="number" min={0} max={100} {...register('difficultyEasy')} className="form-input" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Medium</label>
                  <input type="number" min={0} max={100} {...register('difficultyMedium')} className="form-input" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Hard</label>
                  <input type="number" min={0} max={100} {...register('difficultyHard')} className="form-input" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={create.isPending} className="btn-primary">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create & Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'generate' && (
        <div className="card">
          <div className="card-body space-y-4">
            <div className="rounded-md bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30 p-3 flex items-center gap-2 text-success-900 dark:text-success-200">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm"><strong>"{createdExam?.title}"</strong> created. Now generate questions.</span>
            </div>

            <div>
              <label className="form-label">Total questions to generate</label>
              <input
                type="number"
                min={1}
                max={200}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                The system picks from ACTIVE questions matching your filters, preferring less-used ones.
              </p>
            </div>

            <div>
              <label className="form-label">Question types to include</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {Object.entries(QUESTION_TYPES).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    MULTIPLE_CHOICE: 'Multiple Choice',
                    TRUE_FALSE: 'True/False',
                    MATCHING: 'Matching',
                    SHORT_ANSWER: 'Short Answer',
                    ESSAY: 'Essay',
                    PRACTICAL: 'Practical',
                  };
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 cursor-pointer ${
                        selectedTypes.includes(key)
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(key)}
                        onChange={() => toggleType(key)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <span className="text-sm">{labels[key]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md bg-primary-50 dark:bg-primary-500/10 p-3 text-sm text-primary-900 dark:text-primary-200">
              <Sparkles className="h-4 w-4 inline mr-1" />
              <strong>Smart selection:</strong> questions you've used less often are picked first to ensure variety across exams.
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => navigate(`/app/exams/${createdExamId}`)} className="btn-secondary">
                Skip — I'll pick manually
              </button>
              <button onClick={onAutoGenerate} disabled={autoGen.isPending || selectedTypes.length === 0} className="btn-primary">
                {autoGen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Auto-Generate {totalQuestions} Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
