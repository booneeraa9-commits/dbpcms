import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <Logo size="lg" />
      <h1 className="mt-8 text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-xl text-gray-600">Page not found</p>
      <p className="mt-2 text-sm text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/app/dashboard" className="btn-primary mt-6">
        <Home className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
