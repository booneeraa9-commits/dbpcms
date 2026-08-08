/**
 * Bulk Student Import.
 *
 * Flow:
 * 1. User downloads a CSV template
 * 2. User fills it in (or generates sample data)
 * 3. User uploads the CSV
 * 4. We parse, validate, and show a preview
 * 5. User confirms → we import
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, FileText, Loader2, Check, X, AlertCircle, Sparkles } from 'lucide-react';
import { useBulkImportStudents } from '@/hooks/useStudents';
import { usePrograms } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

interface ParsedRow {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  previousSchool?: string;
  previousGrade?: string;
  programId: string;
  admissionDate: string;
  initialLevel: number;
}

const SAMPLE_ROWS: ParsedRow[] = [
  { firstName: 'Abel', middleName: 'Kebede', lastName: 'Tesfaye', gender: 'MALE', birthDate: '2005-03-12', phone: '+251911234567', email: 'abel@example.com', programId: '__PROG_ID__', admissionDate: '2025-09-01', initialLevel: 1, previousSchool: 'Addis Ababa Secondary School', previousGrade: 'Pass' },
  { firstName: 'Hanna', lastName: 'Worku', gender: 'FEMALE', birthDate: '2004-08-25', phone: '+251922345678', email: 'hanna@example.com', programId: '__PROG_ID__', admissionDate: '2025-09-01', initialLevel: 1, guardianName: 'Mr Worku', guardianPhone: '+251911222333', previousSchool: 'Dire Dawa High School', previousGrade: 'Pass' },
  { firstName: 'Yonas', middleName: 'Alemu', lastName: 'Bekele', gender: 'MALE', birthDate: '2003-11-04', phone: '+251933456789', programId: '__PROG_ID__', admissionDate: '2025-09-01', initialLevel: 2, previousSchool: 'Bahir Dar TVET', previousGrade: 'Distinction' },
];

export default function StudentImportPage() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: programsData } = usePrograms({ pageSize: 100 });
  const bulkImport = useBulkImportStudents();

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!hasPermission(PERMISSIONS.STUDENT_IMPORT)) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-danger-500 mb-2" />
        <p>You don't have permission to import students.</p>
      </div>
    );
  }

  const downloadTemplate = () => {
    const programId = programsData?.items[0]?.id ?? '__PROG_ID__';
    const rows = SAMPLE_ROWS.map((r) => ({ ...r, programId }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => csvEscape(String(r[h as keyof ParsedRow] ?? ''))).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const fillSample = () => {
    const programId = programsData?.items[0]?.id;
    if (!programId) {
      toast.error('Please create at least one program first');
      return;
    }
    setParsed(SAMPLE_ROWS.map((r) => ({ ...r, programId })));
    setFile(null);
    setParseError(null);
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParseError(null);
    try {
      const text = await f.text();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setParseError('CSV must have a header row and at least one data row');
        setParsed(null);
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
        // Validate required fields
        if (!row.firstName || !row.lastName || !row.gender || !row.birthDate || !row.programId || !row.admissionDate) {
          throw new Error(`Row ${i + 1}: missing required field (firstName, lastName, gender, birthDate, programId, admissionDate)`);
        }
        rows.push({
          firstName: row.firstName,
          middleName: row.middleName || undefined,
          lastName: row.lastName,
          gender: (row.gender as ParsedRow['gender']) || 'MALE',
          birthDate: row.birthDate,
          nationalId: row.nationalId || undefined,
          phone: row.phone || undefined,
          email: row.email || undefined,
          address: row.address || undefined,
          guardianName: row.guardianName || undefined,
          guardianPhone: row.guardianPhone || undefined,
          previousSchool: row.previousSchool || undefined,
          previousGrade: row.previousGrade || undefined,
          programId: row.programId,
          admissionDate: row.admissionDate,
          initialLevel: Number(row.initialLevel) || 1,
        });
      }
      setParsed(rows);
    } catch (err) {
      setParseError((err as Error).message);
      setParsed(null);
    }
  };

  const submit = async () => {
    if (!parsed || parsed.length === 0) return;
    try {
      const result = await bulkImport.mutateAsync(parsed as unknown as Record<string, unknown>[]);
      toast.success(`Imported ${result.created} students${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`);
      navigate('/app/students');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import Students</h1>
        <p className="mt-1 text-sm text-gray-600">Upload a CSV file to register many students at once</p>
      </div>

      {/* Steps */}
      <div className="card p-5 space-y-4">
        <Step n={1} title="Download template or generate sample data">
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="btn-secondary">
              <Download className="h-4 w-4" />
              Download CSV template
            </button>
            <button onClick={fillSample} className="btn-secondary" disabled={!programsData?.items.length}>
              <Sparkles className="h-4 w-4" />
              Use sample data ({SAMPLE_ROWS.length} students)
            </button>
          </div>
        </Step>

        <Step n={2} title="Upload your CSV file">
          <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-primary-400 hover:bg-primary-50">
            <Upload className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {file ? file.name : 'Click to upload, or drop a CSV here'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {parseError && (
            <div className="mt-2 rounded-md bg-danger-50 p-2 text-sm text-danger-700 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{parseError}
            </div>
          )}
        </Step>

        {parsed && (
          <Step n={3} title={`Preview (${parsed.length} student${parsed.length === 1 ? '' : 's'})`}>
            <div className="border border-gray-200 rounded-md max-h-72 overflow-y-auto">
              <table className="table text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th>ID Number</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Program</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((p, i) => (
                    <tr key={i}>
                      <td className="font-mono text-gray-400">auto-generated</td>
                      <td>{p.firstName} {p.middleName ?? ''} {p.lastName}</td>
                      <td>{p.gender}</td>
                      <td>{p.phone ?? '—'}</td>
                      <td className="font-mono text-[10px]">{p.programId.slice(0, 8)}…</td>
                      <td>L{p.initialLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setParsed(null); setFile(null); }} className="btn-secondary">
                <X className="h-4 w-4" />
                Clear
              </button>
              <button onClick={submit} disabled={bulkImport.isPending} className="btn-primary">
                {bulkImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Import {parsed.length} student{parsed.length === 1 ? '' : 's'}
              </button>
            </div>
          </Step>
        )}
      </div>

      <div className="card p-4 text-xs text-gray-600">
        <strong>Required CSV columns:</strong> firstName, lastName, gender (MALE/FEMALE/OTHER), birthDate (YYYY-MM-DD), programId (UUID), admissionDate (YYYY-MM-DD), initialLevel (1-5)
        <br />
        <strong>Optional columns:</strong> middleName, nationalId, phone, email, address, guardianName, guardianPhone, previousSchool, previousGrade
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { current += c; }
    } else {
      if (c === ',') { result.push(current); current = ''; }
      else if (c === '"') { inQuotes = true; }
      else { current += c; }
    }
  }
  result.push(current);
  return result;
}
