import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  className?: string;
  textClassName?: string;
}

export function Avatar({ name, className, textClassName }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?';

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-semibold text-white',
        className
      )}
      aria-hidden="true"
    >
      <span className={cn(textClassName)}>{initials}</span>
    </div>
  );
}
