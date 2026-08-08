import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  );
}
