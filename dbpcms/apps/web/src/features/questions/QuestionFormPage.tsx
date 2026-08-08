/**
 * Question Form — create or edit a question.
 *
 * The content editor changes based on the selected question type:
 *   - MULTIPLE_CHOICE:  list of options + correct answer
 *   - TRUE_FALSE:      just a toggle
 *   - MATCHING:        two parallel lists of pairs
 *   - SHORT_ANSWER:    question + sample answer
 *   - ESSAY:           question + rubric + min words
 *   - PRACTICAL:       question + rubric criteria
 *
 * The form data is stored in a single `content` JSON object.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, Loader2, ArrowLeft, Plus, Trash2, Check, Circle, FileText,
  BookOpen, Hash, Type, AlignLeft, ListChecks, Award, Lightbulb,
} from 'lucide-react';
import { useCreateQuestion, useUpdateQuestion, useQuestion } from '@/hooks/useQuestions';
import { useCourses } from '@/hooks/useAcademics';
import { QUESTION_TYPES, BLOOMS_LABELS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const QUESTION_TYPE_OPTIONS = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: ListChecks },
  { value: 'TRUE_FALSE', label: 'True/False', icon: Check },
  { value: 'MATCHING', label: 'Matching', icon: AlignLeft },
  { value: 'SHORT_ANSWER', label: 'Short Answer', icon: Type },
  { value: 'ESSAY', label: 'Essay', icon: FileText },
  { value: 'PRACTICAL', label: 'Practical', icon: Award },
] as const;

const formSchema = z.object({
  courseId: z.string().uuid('Select a course'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_ANSWER', 'ESSAY', 'PRACTICAL']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']),
  bloomsLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']),
  marks: z.coerce.number().min(0.5).max(1000),
  keywords: z.string(), // comma-separated, split on submit
  content: z.record(z.any()),
});

type FormData = z.infer<typeof formSchema>;

export default function QuestionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useQuestion(isEdit ? id : undefined);
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const create = useCreateQuestion();
  const update = useUpdateQuestion();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: '',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'MEDIUM',
      bloomsLevel: 'APPLY',
      marks: 2,
      keywords: '',
      content: {
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
    },
  });

  const selectedType = watch('type');

  // When existing question loads, populate form
  useEffect(() => {
    if (existing && isEdit) {
      setValue('courseId', existing.courseId);
      setValue('type', existing.type);
      setValue('difficulty', existing.difficulty);
      setValue('bloomsLevel', existing.bloomsLevel);
      setValue('marks', existing.marks);
      setValue('keywords', existing.keywords.join(', '));
      setValue('content', existing.content);
    }
  }, [existing, isEdit, setValue]);

  // Initialize content when type changes (for new questions)
  useEffect(() => {
    if (isEdit) return; // Don't override when editing
    const content = watch('content');
    switch (selectedType) {
      case 'MULTIPLE_CHOICE':
        if (!content?.options) setValue('content', { text: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
        break;
      case 'TRUE_FALSE':
        setValue('content', { text: '', correctAnswer: true, explanation: '' });
        break;
      case 'MATCHING':
        if (!content?.pairs) setValue('content', { text: '', pairs: [{ left: '', right: '' }, { left: '', right: '' }] });
        break;
      case 'SHORT_ANSWER':
        setValue('content', { text: '', sampleAnswer: '' });
        break;
      case 'ESSAY':
        setValue('content', { text: '', rubric: '', minWords: 100 });
        break;
      case 'PRACTICAL':
        if (!content?.criteria) setValue('content', { text: '', criteria: [{ name: '', points: 5 }] });
        break;
    }
  }, [selectedType, isEdit, setValue, watch]);

  const onSubmit = async (data: FormData) => {
    try {
      const keywords = data.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const payload = {
        courseId: data.courseId,
        type: data.type,
        difficulty: data.difficulty,
        bloomsLevel: data.bloomsLevel,
        marks: data.marks,
        content: data.content,
        keywords,
      };

      if (isEdit && id) {
        await update.mutateAsync({ id, ...payload });
        toast.success('Question updated');
        navigate(`/app/questions/${id}`);
      } else {
        const created = await create.mutateAsync(payload);
        toast.success('Question created! Now submit for review when ready.');
        navigate(`/app/questions/${created.id}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading question…
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit Question' : 'New Question'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose a type and fill in the details. You can save as a draft and submit for review later.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Meta section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary-600" /> Metadata
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="form-label">Course *</label>
              <select {...register('courseId')} className="form-input">
                <option value="">Select course…</option>
                {coursesData?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} (L{c.level})
                  </option>
                ))}
              </select>
              {errors.courseId && <p className="form-error">{errors.courseId.message}</p>}
            </div>

            <div>
              <label className="form-label">Question Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
                {QUESTION_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 cursor-pointer transition-colors ${
                      selectedType === opt.value
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input type="radio" value={opt.value} {...register('type')} className="sr-only" />
                    <opt.icon className={`h-4 w-4 ${selectedType === opt.value ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Difficulty</label>
                <select {...register('difficulty')} className="form-input">
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <div>
                <label className="form-label">Bloom's Level</label>
                <select {...register('bloomsLevel')} className="form-input">
                  {Object.entries(BLOOMS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Marks</label>
                <input type="number" step="0.5" min="0.5" {...register('marks')} className="form-input" />
                {errors.marks && <p className="form-error">{errors.marks.message}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Keywords (comma-separated)</label>
              <input
                {...register('keywords')}
                className="form-input"
                placeholder="e.g. python, variables, syntax"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used for search and duplicate detection
              </p>
            </div>
          </div>
        </div>

        {/* Type-specific content editor */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" /> Question Content
            </h2>
          </div>
          <div className="card-body">
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <ContentEditor
                  type={selectedType}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        {/* Submit buttons */}
        <div className="flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 py-3 -mx-4 px-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || create.isPending || update.isPending} className="btn-primary">
            {(isSubmitting || create.isPending || update.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create Question'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Content editor — switches by type ────────────────────
function ContentEditor({
  type,
  value,
  onChange,
}: {
  type: string;
  value: any;
  onChange: (v: any) => void;
}) {
  const update = (patch: Record<string, any>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <label className="form-label">Question text *</label>
        <textarea
          value={value?.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
          className="form-input"
          placeholder="Enter the question…"
        />
      </div>

      {type === 'MULTIPLE_CHOICE' && <MCQEditor value={value} onChange={update} />}
      {type === 'TRUE_FALSE' && <TFEditor value={value} onChange={update} />}
      {type === 'MATCHING' && <MatchingEditor value={value} onChange={update} />}
      {type === 'SHORT_ANSWER' && <ShortAnswerEditor value={value} onChange={update} />}
      {type === 'ESSAY' && <EssayEditor value={value} onChange={update} />}
      {type === 'PRACTICAL' && <PracticalEditor value={value} onChange={update} />}
    </div>
  );
}

function MCQEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const options = value?.options ?? ['', '', '', ''];
  const correct = value?.correctAnswer ?? 0;

  return (
    <div className="space-y-3">
      <label className="form-label">Options (click the radio to mark the correct one)</label>
      {options.map((opt: string, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, correctAnswer: i })}
            className="p-1"
            title="Mark as correct"
          >
            {correct === i ? (
              <Check className="h-5 w-5 text-success-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300" />
            )}
          </button>
          <input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange({ ...value, options: next });
            }}
            className="form-input flex-1"
            placeholder={`Option ${String.fromCharCode(65 + i)}`}
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => {
                const next = options.filter((_: any, idx: number) => idx !== i);
                onChange({ ...value, options: next, correctAnswer: correct >= next.length ? 0 : correct });
              }}
              className="p-1.5 text-gray-400 hover:text-danger-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...value, options: [...options, ''] })}
        className="btn-secondary"
      >
        <Plus className="h-4 w-4" />
        Add option
      </button>
      <div>
        <label className="form-label">Explanation (optional)</label>
        <textarea
          value={value?.explanation ?? ''}
          onChange={(e) => onChange({ ...value, explanation: e.target.value })}
          rows={2}
          className="form-input"
          placeholder="Why is the correct answer correct?"
        />
      </div>
    </div>
  );
}

function TFEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <label className="form-label">Correct answer</label>
      <div className="flex gap-2">
        {[true, false].map((val) => (
          <button
            key={String(val)}
            type="button"
            onClick={() => onChange({ ...value, correctAnswer: val })}
            className={`flex-1 px-4 py-3 rounded-md border-2 font-medium ${
              value?.correctAnswer === val
                ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-500/10'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {val ? 'True' : 'False'}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label className="form-label">Explanation (optional)</label>
        <textarea
          value={value?.explanation ?? ''}
          onChange={(e) => onChange({ ...value, explanation: e.target.value })}
          rows={2}
          className="form-input"
        />
      </div>
    </div>
  );
}

function MatchingEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const pairs = value?.pairs ?? [];
  const updatePair = (i: number, side: 'left' | 'right', val: string) => {
    const next = pairs.map((p: any, idx: number) => idx === i ? { ...p, [side]: val } : p);
    onChange({ ...value, pairs: next });
  };
  return (
    <div className="space-y-3">
      <label className="form-label">Matching pairs (left column items match right column items)</label>
      {pairs.map((pair: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={pair.left}
            onChange={(e) => updatePair(i, 'left', e.target.value)}
            className="form-input flex-1"
            placeholder={`Left ${i + 1}`}
          />
          <span className="text-gray-400">↔</span>
          <input
            value={pair.right}
            onChange={(e) => updatePair(i, 'right', e.target.value)}
            className="form-input flex-1"
            placeholder={`Right ${i + 1}`}
          />
          {pairs.length > 2 && (
            <button
              type="button"
              onClick={() => onChange({ ...value, pairs: pairs.filter((_: any, idx: number) => idx !== i) })}
              className="p-1.5 text-gray-400 hover:text-danger-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...value, pairs: [...pairs, { left: '', right: '' }] })}
        className="btn-secondary"
      >
        <Plus className="h-4 w-4" />
        Add pair
      </button>
    </div>
  );
}

function ShortAnswerEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <label className="form-label">Sample answer (for grader reference)</label>
      <textarea
        value={value?.sampleAnswer ?? ''}
        onChange={(e) => onChange({ ...value, sampleAnswer: e.target.value })}
        rows={4}
        className="form-input"
        placeholder="A model answer that graders can compare against…"
      />
    </div>
  );
}

function EssayEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">Grading rubric</label>
        <textarea
          value={value?.rubric ?? ''}
          onChange={(e) => onChange({ ...value, rubric: e.target.value })}
          rows={4}
          className="form-input"
          placeholder="Describe how this essay will be graded. e.g. 'Award 3 pts for thesis clarity, 4 pts for evidence, 3 pts for analysis.'"
        />
      </div>
      <div>
        <label className="form-label">Minimum word count</label>
        <input
          type="number"
          value={value?.minWords ?? 100}
          onChange={(e) => onChange({ ...value, minWords: Number(e.target.value) })}
          className="form-input"
        />
      </div>
    </div>
  );
}

function PracticalEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const criteria = value?.criteria ?? [];

  return (
    <div className="space-y-3">
      <label className="form-label">Assessment criteria (with point values)</label>
      {criteria.map((c: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={c.name}
            onChange={(e) => {
              const next = criteria.map((cr: any, idx: number) =>
                idx === i ? { ...cr, name: e.target.value } : cr
              );
              onChange({ ...value, criteria: next });
            }}
            className="form-input flex-1"
            placeholder={`Criterion ${i + 1}`}
          />
          <input
            type="number"
            value={c.points}
            onChange={(e) => {
              const next = criteria.map((cr: any, idx: number) =>
                idx === i ? { ...cr, points: Number(e.target.value) } : cr
              );
              onChange({ ...value, criteria: next });
            }}
            className="form-input w-24"
            placeholder="pts"
          />
          {criteria.length > 1 && (
            <button
              type="button"
              onClick={() => onChange({ ...value, criteria: criteria.filter((_: any, idx: number) => idx !== i) })}
              className="p-1.5 text-gray-400 hover:text-danger-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...value, criteria: [...criteria, { name: '', points: 5 }] })}
        className="btn-secondary"
      >
        <Plus className="h-4 w-4" />
        Add criterion
      </button>
    </div>
  );
}
