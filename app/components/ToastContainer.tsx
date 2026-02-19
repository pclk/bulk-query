'use client';

interface Toast {
  id: string;
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-8 right-8 z-[1000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-surface-light px-6 py-4 rounded-lg border-l-4 border-l-accent shadow-[0_4px_12px_rgba(0,0,0,0.3)] animate-slide-in min-w-[300px]"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
