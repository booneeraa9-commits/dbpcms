/**
 * Student create/edit form.
 * Comprehensive — captures all personal, family, and academic info.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, Loader2, ArrowLeft, User, Phone, MapPin, School, Users,
} from 'lucide-react';
import { useCreateStudent, useUpdateStudent, useStudent } from '@/hooks/useStudents';
import { usePrograms } from '@/hooks/useAcademics';
import toast from 'react-hot-toast';

const ethPhone = z
  .string()
  .regex(/^(\+251|0)?9\d{8}$/, 'Invalid Ethiopian phone (e.g. +251911234567 or 0911234567)')
  .optional()
  .or(z.literal(''));

const formSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().min(1, 'Required').max(100),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().min(1, 'Required'),
  nationalId: z.string().max(50).optional().or(z.literal('')),
  phone: ethPhone,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),

  guardianName: z.string().max(200).optional().or(z.literal('')),
  guardianPhone: ethPhone,
  emergencyContactName: z.string().max(200).optional().or(z.literal('')),
  emergencyContactPhone: ethPhone,

  previousSchool: z.string().max(200).optional().or(z.literal('')),
  previousGrade: z.string().max(50).optional().or(z.literal('')),

  programId: z.string().uuid('Select a program'),
  admissionDate: z.string().min(1, 'Required'),
  initialLevel: z.coerce.number().int().min(1).max(5).default(1),
});

type FormData = z.infer<typeof formSchema>;

export default function StudentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingStudent } = useStudent(isEdit ? id : undefined);
  const { data: programsData } = usePrograms({ pageSize: 100 });
  const create = useCreateStudent();
  const update = useUpdateStudent();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existing
      ? {
          firstName: existing.firstName,
          middleName: existing.middleName ?? '',
          lastName: existing.lastName,
          gender: existing.gender,
          birthDate: existing.birthDate.slice(0, 10),
          nationalId: existing.nationalId ?? '',
          phone: existing.phone ?? '',
          email: existing.email ?? '',
          address: existing.address ?? '',
          guardianName: existing.guardianName ?? '',
          guardianPhone: existing.guardianPhone ?? '',
          emergencyContactName: existing.emergencyContactName ?? '',
          emergencyContactPhone: existing.emergencyContactPhone ?? '',
          previousSchool: existing.previousSchool ?? '',
          previousGrade: existing.previousGrade ?? '',
          programId: existing.programId,
          admissionDate: existing.admissionDate.slice(0, 10),
          initialLevel: existing.currentRegistration?.level ?? 1,
        }
      : {
          firstName: '', middleName: '', lastName: '', gender: 'MALE',
          birthDate: '', nationalId: '', phone: '', email: '', address: '',
          guardianName: '', guardianPhone: '', emergencyContactName: '', emergencyContactPhone: '',
          previousSchool: '', previousGrade: '',
          programId: '', admissionDate: new Date().toISOString().slice(0, 10), initialLevel: 1,
        },
  });

  const selectedProgramId = watch('programId');
  const selectedProgram = programsData?.items.find((p) => p.id === selectedProgramId);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, ...data });
        toast.success('Student updated');
        navigate(`/app/students/${id}`);
      } else {
        const student = await create.mutateAsync(data);
        toast.success(`Student created! ID: ${student.studentIdNumber}`);
        navigate(`/app/students/${student.id}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isEdit && loadingStudent) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading student…
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Student' : 'New Student'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isEdit ? `Editing ${existing?.firstName} ${existing?.lastName} (${existing?.studentIdNumber})` : 'Register a new student'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Info */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-primary-600" />
              Personal Information
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">First name *</label>
              <input {...register('firstName')} className="form-input" />
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="form-label">Middle name</label>
              <input {...register('middleName')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Last name *</label>
              <input {...register('lastName')} className="form-input" />
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="form-label">Gender *</label>
              <select {...register('gender')} className="form-input">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Date of birth *</label>
              <input type="date" {...register('birthDate')} className="form-input" />
              {errors.birthDate && <p className="form-error">{errors.birthDate.message}</p>}
            </div>
            <div>
              <label className="form-label">National ID / Fayda</label>
              <input {...register('nationalId')} className="form-input" placeholder="optional" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary-600" />
              Contact
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <input {...register('phone')} className="form-input" placeholder="+251911234567" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" {...register('email')} className="form-input" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="form-label flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Address
              </label>
              <textarea {...register('address')} rows={2} className="form-input" />
            </div>
          </div>
        </div>

        {/* Family / Emergency */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Guardian & Emergency Contact
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Guardian name</label>
              <input {...register('guardianName')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Guardian phone</label>
              <input {...register('guardianPhone')} className="form-input" placeholder="+251911234567" />
              {errors.guardianPhone && <p className="form-error">{errors.guardianPhone.message}</p>}
            </div>
            <div>
              <label className="form-label">Emergency contact name</label>
              <input {...register('emergencyContactName')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Emergency contact phone</label>
              <input {...register('emergencyContactPhone')} className="form-input" />
              {errors.emergencyContactPhone && <p className="form-error">{errors.emergencyContactPhone.message}</p>}
            </div>
          </div>
        </div>

        {/* Previous School */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <School className="h-5 w-5 text-primary-600" />
              Previous Education
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Previous school</label>
              <input {...register('previousSchool')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Previous grade / result</label>
              <input {...register('previousGrade')} className="form-input" placeholder="e.g. Grade 10, Pass" />
            </div>
          </div>
        </div>

        {/* Academic Placement */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <School className="h-5 w-5 text-primary-600" />
              Academic Placement
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Program *</label>
              <select {...register('programId')} className="form-input">
                <option value="">Select program…</option>
                {programsData?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.departmentName} → {p.name} ({p.code})
                  </option>
                ))}
              </select>
              {errors.programId && <p className="form-error">{errors.programId.message}</p>}
              {programsData?.items.length === 0 && (
                <p className="text-xs text-warning-700 mt-1">
                  No programs exist yet. Create one in <a href="/app/programs" className="underline">Programs</a> first.
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Initial level *</label>
              <select {...register('initialLevel')} className="form-input">
                {selectedProgram?.levels?.length
                  ? selectedProgram.levels.map((l) => <option key={l} value={l}>Level {l}</option>)
                  : [1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)
                }
              </select>
              {errors.initialLevel && <p className="form-error">{errors.initialLevel.message}</p>}
            </div>
            <div>
              <label className="form-label">Admission date *</label>
              <input type="date" {...register('admissionDate')} className="form-input" />
              {errors.admissionDate && <p className="form-error">{errors.admissionDate.message}</p>}
              <p className="text-xs text-gray-500 mt-1">Year is used to generate the student ID number</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 sticky bottom-0 bg-white py-3 -mx-4 px-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">
            {(create.isPending || update.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  );
}
