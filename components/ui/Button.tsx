'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'small';
}

export default function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'rounded-lg font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  const variants = {
    primary: 'bg-accent text-white hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)]',
    secondary: 'bg-surface-light text-gray-200 hover:bg-surface-lighter hover:shadow-[0_4px_12px_rgba(255,255,255,0.1)]',
    danger: 'bg-red-500 text-white hover:shadow-[0_4px_12px_rgba(231,76,60,0.4)]',
  };

  const sizes = {
    default: 'px-6 py-3 text-base',
    small: 'px-4 py-2 text-sm',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
