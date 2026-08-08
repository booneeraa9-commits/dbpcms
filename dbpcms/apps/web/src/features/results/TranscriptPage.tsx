/**
 * Transcript Page
 * Shows a student's full academic record: all results grouped by semester,
 * summary stats (GPA, pass rate, total courses), and a print-friendly header.
 *
 * URL: /app/results/transcript/:studentId
 * Can be accessed from a student detail page or from the students list.
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Loader2, Award, CheckCircle2, XCircle, Printer, Download,
  TrendingUp, BookOpen, GraduationCap, User, Hash, Building2,
} from 'lucide-react';
import { useTranscript } from '@/hooks/useResults';
import { useStudents } from '@/hooks/useStudents';
import toast from 'react-hot-toast';

export default function TranscriptPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // If no studentId, show a student picker
  const { data, isLoading, isError } = useTranscript(studentId);
  const { data: studentsData } = useStudents({ pageSize: 200 });

  if (!studentId) {
    return <StudentPicker students={studentsData?.items ?? []} search={search} setSearch={setSearch} />;
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading transcript…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="card p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No transcript data</h2>
          <p className="text-sm text-gray-500 mt-1">This student has no results yet, or you don't have access.</p>
        </div>
      </div>
    );
  }

  const { student, results, summary } = data;

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog…');
  };

  // Group results by semester
  const bySemester: Record<string, any[]> = (results || []).reduce((acc: Record<string, any[]>, r: any) => {
    const key = r.semesterName || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Academic Transcript</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Official academic record
            </p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn-secondary">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {/* Transcript card */}
      <div className="card p-8 print:shadow-none print:border-2">
        {/* Print header */}
        <div className="text-center pb-6 border-b-2 border-primary-600">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GraduationCap className="h-8 w-8 text-primary-600" />
            <h2 className="text-2xl font-bold text-primary-600">Donna Barbar Polytechnic College</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">OFFICIAL ACADEMIC TRANSCRIPT</p>
        </div>

        {/* Student info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
          <Info icon={User} label="Student Name" value={`${student.firstName} ${student.lastName}`} />
          <Info icon={Hash} label="Student ID" value={student.studentIdNumber} mono />
          <Info icon={BookOpen} label="Program" value={student.programName || '—'} />
          <Info icon={Building2} label="Department" value={student.departmentName || '—'} />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4">
          <Stat icon={BookOpen} label="Courses" value={summary.totalCourses} />
          <Stat icon={TrendingUp} label="Average" value={`${summary.average}%`} highlight />
          <Stat icon={Award} label="GPA" value={summary.gpa} highlight />
          <Stat icon={CheckCircle2} label="Passed" value={summary.passed} color="success" />
          <Stat icon={XCircle} label="Failed" value={summary.failed} color="danger" />
        </div>

        {/* Results by semester */}
        {Object.keys(bySemester).length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No results on file for this student yet.</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {Object.entries(bySemester).map(([semester, semResults]) => {
              const semPcts = semResults.map((r: any) => r.percentage);
              const semAvg = semPcts.length > 0 ? semPcts.reduce((a: number, b: number) => a + b, 0) / semPcts.length : 0;
              const semPassed = semResults.filter((r: any) => r.isPass).length;
              return (
                <div key={semester}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{semester}</h3>
                    <div className="text-xs text-gray-500">
                      {semResults.length} course{semResults.length === 1 ? '' : 's'} · {semAvg.toFixed(1)}% avg · {semPassed} pass
                    </div>
                  </div>
                  <div className="table-wrapper border border-gray-200 dark:border-gray-700 rounded-md">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Course</th>
                          <th>Type</th>
                          <th>Marks</th>
                          <th>%</th>
                          <th>Grade</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semResults.map((r: any) => (
                          <tr key={r.id}>
                            <td className="font-mono text-xs">{r.courseCode}</td>
                            <td>{r.courseName}</td>
                            <td className="text-xs">{r.assessmentType}</td>
                            <td>{r.marksObtained} / {r.marksTotal}</td>
                            <td className={r.isPass ? 'text-success-700 dark:text-success-400 font-semibold' : 'text-danger-700 dark:text-danger-400 font-semibold'}>
                              {r.percentage}%
                            </td>
                            <td className={`font-bold ${
                              r.grade === 'A' ? 'text-success-600' :
                              r.grade === 'F' ? 'text-danger-600' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {r.grade}
                            </td>
                            <td>
                              {r.isPass ? (
                                <span className="text-success-600 flex items-center gap-1 text-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                                </span>
                              ) : (
                                <span className="text-danger-600 flex items-center gap-1 text-sm">
                                  <XCircle className="h-3.5 w-3.5" /> Fail
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-center">
          <p>Issued on {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
          <p className="mt-1">Donna Barbar Polytechnic College · DBPCMS v1.0</p>
          <p className="mt-1 italic">This is a system-generated document. For verification, contact the Registrar's Office.</p>
        </div>
      </div>
    </div>
  );
}

function StudentPicker({
  students,
  search,
  setSearch,
}: {
  students: any[];
  search: string;
  setSearch: (s: string) => void;
}) {
  const navigate = useNavigate();
  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.studentIdNumber.toLowerCase().includes(q);
  });
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">View Transcript</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Select a student to view their academic record</p>
        </div>
      </div>
      <div className="card p-4">
        <input
          type="search"
          placeholder="Search students by name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          autoFocus
        />
      </div>
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No students found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => navigate(`/app/results/transcript/${s.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {s.firstName} {s.lastName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{s.studentIdNumber} · {s.programName || '—'}</div>
                  </div>
                  <Award className="h-4 w-4 text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-gray-500 uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color, highlight }: { icon: any; label: string; value: any; color?: string; highlight?: boolean }) {
  const colorClasses: Record<string, string> = {
    success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
    danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400',
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
  };
  const cls = color ? colorClasses[color] : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  return (
    <div className={`p-3 rounded-md ${cls}`}>
      <div className="flex items-center gap-1 text-xs uppercase tracking-wider opacity-80">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? '' : ''}`}>{value}</div>
    </div>
  );
}
