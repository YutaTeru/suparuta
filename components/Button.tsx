import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({ children, variant = 'primary', isLoading = false, className = '', disabled, ...props }: ButtonProps) {
  return <button {...props} type={props.type ?? 'button'} disabled={disabled || isLoading} aria-busy={isLoading || undefined}
    className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variant === 'primary' ? 'bg-spartan-red text-white hover:bg-[#b92033]' : 'border border-zinc-700 bg-spartan-gray text-white hover:bg-zinc-800'} ${className}`}>
    {isLoading ? '読み込み中…' : children}
  </button>;
}
