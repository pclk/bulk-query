'use client';

export interface Toast {
  id: string;
  message: string;
  debug?: string;
}

interface ToastContainerProps {
  toasts: Toast[];
}

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-8 right-8 z-[1000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-6 py-4 rounded-lg border-l-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)] animate-slide-in min-w-[300px] max-w-[500px] ${
            toast.debug
              ? 'bg-red-950/90 border-l-red-500'
              : 'bg-surface-light border-l-accent'
          }`}
        >
          <div>{toast.message}</div>
          {isDevMode && toast.debug && (
            <pre className="mt-2 text-xs text-red-300/80 font-mono whitespace-pre-wrap break-all border-t border-red-500/20 pt-2">
              {toast.debug}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
