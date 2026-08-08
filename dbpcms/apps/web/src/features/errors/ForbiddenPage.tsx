import { Link } from 'react-router-dom';
import { Home, Shield } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <Logo size="lg" />
      <Shield className="mt-8 h-16 w-16 text-danger-500" />
      <h1 className="mt-4 text-4xl font-bold text-gray-900">403</h1>
      <p className="mt-2 text-xl text-gray-600">Access Denied</p>
      <p className="mt-2 text-sm text-gray-500 text-center max-w-md">
        You don't have permission to view this page. If you believe this is a mistake, contact your administrator.
      </p>
      <Link to="/app/dashboard" className="btn-primary mt-6">
        <Home className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
