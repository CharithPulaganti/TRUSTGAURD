import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export function Button({ children, variant = 'primary', loading = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  return <button {...props} className={`button button-${variant} ${className}`} disabled={props.disabled || loading}>
    {loading && <LoaderCircle className="spin" size={16} />}{children}
  </button>;
}
export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`surface ${className}`}>{children}</section>;
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-wrap" aria-label="Loading"><div className="skeleton-line skeleton-title" />{Array.from({ length: rows }).map((_, index) => <div className="skeleton-line" key={index} />)}</div>;
}