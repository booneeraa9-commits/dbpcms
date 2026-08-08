import { GraduationCap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'h-6 w-6', text: 'text-base' },
    md: { icon: 'h-8 w-8', text: 'text-lg' },
    lg: { icon: 'h-12 w-12', text: 'text-2xl' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
        <GraduationCap className={s.icon} />
      </div>
      {showText && (
        <div>
          <div className={`font-bold text-gray-900 ${s.text}`}>DBPCMS</div>
          <div className="text-[10px] text-gray-500 leading-tight">Donna Barbar Polytechnic</div>
        </div>
      )}
    </div>
  );
}
