/**
 * Student detail page.
 * Shows full profile + history + actions (edit, register, view ID card).
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Edit, QrCode, UserPlus, Loader2, Mail, Phone, MapPin, Calendar,
  School, Users, AlertCircle, CreditCard, History, FileText,
} from 'lucide-react';
import { useStudent, useRegisterStudent } from '@/hooks/useStudents';
import { useAcademicYears } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-success',
  GRADUATED: 'badge-info',
  SUSPENDED: 'badge-warning',
  WITHDRAWN: 'badge-gray',
  TRANSFERRED: 'badge-gray',
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: student, isLoading } = useStudent(id);
  const { data: years } = useAcademicYears();
  const register = useRegisterStudent();
  const [showRegister, setShowRegister] = useState(false);
  const [regYearId, setRegYearId] = useState('');
  const [regLevel, setRegLevel] = useState(1);
  const [regSection, setRegSection] = useState('');

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…</div>;
  }
  if (!student) {
    return <div className="p-12 text-center text-gray-500">Student not found.</div>;
  }

  const canEdit = hasPermission(PERMISSIONS.STUDENT_UPDATE);
  const initials = `${student.firstName[0]}${student.lastName[0]}`;

  const handleRegister = async () => {
    if (!regYearId) {
      toast.error('Select an academic year');
      return;
    }
    try {
      await register.mutateAsync({
        studentId: student.id,
        academicYearId: regYearId,
        level: regLevel,
        section: regSection || undefined,
      });
      toast.success('Registered for new academic year');
      setShowRegister(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {student.firstName} {student.middleName ? student.middleName + ' ' : ''}{student.lastName}
          </h1>
          <p className="mt-1 text-sm text-gray-600 font-mono">{student.studentIdNumber}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/app/results/transcript/${student.id}`} className="btn-secondary">
            <FileText className="h-4 w-4" />
            Transcript
          </Link>
          <Link to={`/app/students/${student.id}/id-card`} className="btn-secondary">
            <CreditCard className="h-4 w-4" />
            ID Card
          </Link>
          {canEdit && (
            <Link to={`/app/students/${student.id}/edit`} className="btn-primary">
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card">
          <div className="card-body text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-3xl">
              {initials}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-sm text-gray-600 font-mono">{student.studentIdNumber}</p>
            <div className="mt-3">
              <span className={STATUS_BADGE[student.status]}>{student.status}</span>
            </div>

            {student.qrCodeUrl && (
              <div className="mt-4 flex justify-center">
                <img src={student.qrCodeUrl} alt="QR Code" className="h-28 w-28 border border-gray-200 rounded" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Scan to verify student</p>
          </div>
        </div>

        {/* Personal + Academic */}
        <div className="card lg:col-span-2">
          <div className="card-body space-y-4">
            <Section title="Personal">
              <Field label="Gender" value={student.gender.toLowerCase()} />
              <Field label="Age" value={`${student.age} years`} />
              <Field label="Date of birth" value={new Date(student.birthDate).toLocaleDateString()} />
              {student.nationalId && <Field label="National ID" value={student.nationalId} />}
            </Section>

            <Section title="Contact">
              {student.phone && <Field icon={Phone} label="Phone" value={student.phone} />}
              {student.email && <Field icon={Mail} label="Email" value={student.email} />}
              {student.address && <Field icon={MapPin} label="Address" value={student.address} />}
            </Section>

            {(student.guardianName || student.emergencyContactName) && (
              <Section title="Guardian / Emergency">
                {student.guardianName && <Field label="Guardian" value={`${student.guardianName} ${student.guardianPhone ? '· ' + student.guardianPhone : ''}`} />}
                {student.emergencyContactName && <Field label="Emergency" value={`${student.emergencyContactName} ${student.emergencyContactPhone ? '· ' + student.emergencyContactPhone : ''}`} />}
              </Section>
            )}

            <Section title="Academic">
              <Field label="Program" value={`${student.programCode} · ${student.programName}`} />
              {student.departmentName && <Field label="Department" value={student.departmentName} />}
              <Field label="Admitted" value={new Date(student.admissionDate).toLocaleDateString()} />
            </Section>

            {student.currentRegistration && (
              <div className="rounded-md bg-primary-50 border border-primary-200 p-3 flex gap-2">
                <Calendar className="h-5 w-5 text-primary-600 flex-shrink-0" />
                <div className="text-sm text-primary-900">
                  <strong>Currently registered:</strong> Level {student.currentRegistration.level}
                  {student.currentRegistration.section && ` (Section ${student.currentRegistration.section})`}
                  {' '}for <strong>{student.currentRegistration.academicYearName}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History / Actions */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="h-5 w-5 text-primary-600" />
            Registration History
          </h2>
          {canEdit && (
            <button onClick={() => setShowRegister((s) => !s)} className="btn-secondary">
              <UserPlus className="h-4 w-4" />
              Register for another year
            </button>
          )}
        </div>
        <div className="card-body">
          {showRegister && (
            <div className="mb-4 p-4 rounded-md border border-primary-200 bg-primary-50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={regYearId} onChange={(e) => setRegYearId(e.target.value)} className="form-input">
                  <option value="">Select academic year…</option>
                  {years?.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
                <select value={regLevel} onChange={(e) => setRegLevel(Number(e.target.value))} className="form-input">
                  {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
                </select>
                <input value={regSection} onChange={(e) => setRegSection(e.target.value)} placeholder="Section (optional)" className="form-input" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowRegister(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleRegister} disabled={register.isPending} className="btn-primary">
                  {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Total registrations: <strong>{student._count?.registrations ?? 0}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Registration history per year will be displayed in a table once multiple registrations exist.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="text-sm text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
