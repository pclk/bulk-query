import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-xl p-6 mb-6 border border-surface-light ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
