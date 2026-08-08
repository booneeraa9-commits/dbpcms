/**
 * Question Picker — manually select questions from the question bank.
 *
 * Shows a searchable, filterable list of ACTIVE questions for the exam's course.
 * User can multi-select and confirm to add them to the exam.
 */

import { useState } from 'react';
import { Search, Filter, X, Plus, Check, FileQuestion, Loader2 } from 'lucide-react';
import { useQuestions, type Question, type Difficulty } from '@/hooks/useQuestions';
import { useAddQuestions } from '@/hooks/useExams';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  MATCHING: 'Matching',
  SHORT_ANSWER: 'Short Answer',
  ESSAY: 'Essay',
  PRACTICAL: 'Practical',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-success-50 text-success-700',
  MEDIUM: 'bg-warning-50 text-warning-700',
  HARD: 'bg-danger-50 text-danger-700',
  EXPERT: 'bg-gray-900 text-white',
};

interface QuestionPickerProps {
  examId: string;
  courseId: string;
  excludeIds: string[]; // Questions already in the exam
  onClose: () => void;
  onAdded?: () => void;
}

export function QuestionPicker({ examId, courseId, excludeIds, onClose, onAdded }: QuestionPickerProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuestions({
    courseId,
    status: 'ACTIVE',
    search: search || undefined,
    type: (typeFilter || undefined) as any,
    difficulty: (difficultyFilter || undefined) as any,
    pageSize: 50,
  });
  const addQuestions = useAddQuestions();

  // Filter out already-added
  const available = data?.items.filter((q) => !excludeIds.includes(q.id)) ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map((q) => q.id)));
    }
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      toast.error('Please select at least one question');
      return;
    }
    try {
      await addQuestions.mutateAsync({
        id: examId,
        questions: Array.from(selected).map((qid) => {
          const q = available.find((x) => x.id === qid)!;
          return { questionId: qid, marks: q.marks };
        }),
      });
      toast.success(`Added ${selected.size} question${selected.size === 1 ? '' : 's'} to exam`);
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Questions Manually</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {available.length} available · {selected.size} selected
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search by keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-input">
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value as any)} className="form-input">
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading questions…
            </div>
          ) : available.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileQuestion className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No more available questions for this course.</p>
              <p className="text-xs mt-1">Create more ACTIVE questions in the question bank first.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-primary-600 hover:underline"
                >
                  {selected.size === available.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-1">
                {available.map((q) => {
                  const isSelected = selected.has(q.id);
                  return (
                    <label
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(q.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="badge-gray text-xs">{TYPE_LABELS[q.type] ?? q.type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                            {q.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{q.marks} pts</span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{q.content.text}</p>
                        {q.keywords.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">{q.keywords.join(', ')}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || addQuestions.isPending}
            className="btn-primary"
          >
            {addQuestions.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add {selected.size > 0 ? `${selected.size} ` : ''}Question{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
