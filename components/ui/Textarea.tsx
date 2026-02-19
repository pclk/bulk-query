'use client';

import { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full p-4 bg-surface border-2 border-surface-light rounded-lg text-gray-200 font-mono text-[0.95rem] leading-relaxed resize-y transition-colors duration-200 focus:outline-none focus:border-accent ${className}`}
      {...props}
    />
  );
}
