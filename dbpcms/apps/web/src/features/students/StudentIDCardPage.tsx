/**
 * Student ID Card — printable layout.
 * Front + back of a standard ID card.
 * Uses CSS @media print to format nicely on paper.
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { useStudent } from '@/hooks/useStudents';

export default function StudentIDCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { data: student, isLoading } = useStudent(id);

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…</div>;
  }
  if (!student) return <div className="p-12 text-center text-gray-500">Student not found.</div>;

  const handlePrint = () => window.print();

  const fullName = `${student.firstName} ${student.middleName ?? ''} ${student.lastName}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button onClick={handlePrint} className="btn-primary">
          <Printer className="h-4 w-4" />
          Print ID Card
        </button>
      </div>

      <div ref={printRef} className="flex flex-col items-center gap-6 print:gap-0">
        {/* FRONT */}
        <div className="id-card w-[340px] h-[540px] bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-xl overflow-hidden shadow-xl flex flex-col print:shadow-none">
          <div className="bg-white/10 px-4 py-2 text-center border-b border-white/20">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Donna Barbar Polytechnic College</div>
            <div className="text-sm font-bold">Student ID Card</div>
          </div>
          <div className="flex-1 px-4 py-4 flex flex-col">
            <div className="h-28 w-28 rounded-full bg-white/20 mx-auto flex items-center justify-center text-3xl font-bold border-2 border-white/40">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div className="text-center mt-3">
              <div className="font-bold text-base leading-tight">{fullName}</div>
              <div className="text-xs opacity-90 mt-0.5 font-mono">{student.studentIdNumber}</div>
            </div>
            <div className="mt-3 space-y-1 text-xs flex-1">
              <Row label="Program" value={student.programCode ?? ''} />
              <Row label="Level" value={student.currentRegistration ? String(student.currentRegistration.level) : '—'} />
              <Row label="Gender" value={student.gender.toLowerCase()} />
              <Row label="Admitted" value={new Date(student.admissionDate).getFullYear().toString()} />
            </div>
            <div className="text-[9px] opacity-70 text-center mt-2">If found, please return to the college</div>
          </div>
        </div>

        {/* BACK */}
        <div className="id-card w-[340px] h-[540px] bg-white border-2 border-primary-600 rounded-xl overflow-hidden shadow-xl flex flex-col print:shadow-none">
          <div className="bg-primary-600 text-white px-4 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Back Side</div>
            <div className="text-xs font-semibold">Donna Barbar Polytechnic College</div>
          </div>
          <div className="flex-1 px-4 py-4 flex flex-col items-center">
            {student.qrCodeUrl && (
              <img src={student.qrCodeUrl} alt="QR" className="h-32 w-32 border-2 border-gray-200 rounded" />
            )}
            <div className="text-center mt-2 text-[10px] text-gray-500">Scan to verify student</div>

            <div className="mt-4 w-full space-y-1 text-xs">
              <Row dark label="Guardian" value={student.guardianName ?? '—'} />
              {student.guardianPhone && <Row dark label="Guardian Phone" value={student.guardianPhone} />}
              <Row dark label="Emergency" value={student.emergencyContactName ?? '—'} />
              {student.emergencyContactPhone && <Row dark label="Emergency Phone" value={student.emergencyContactPhone} />}
            </div>

            <div className="mt-auto text-center text-[9px] text-gray-500">
              <div>Issued by Donna Barbar Polytechnic College</div>
              <div className="mt-0.5">Valid while registered · Property of DBPC</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .id-card, .id-card * { visibility: visible; }
          .id-card { position: absolute; left: 0; top: 0; margin: 0 !important; }
          @page { size: 85.6mm 53.98mm; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`flex justify-between ${dark ? 'text-gray-700' : 'text-white'}`}>
      <span className="opacity-80">{label}</span>
      <span className="font-medium truncate ml-2">{value}</span>
    </div>
  );
}
