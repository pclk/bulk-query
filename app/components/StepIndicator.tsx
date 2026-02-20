'use client';

import { Check } from 'lucide-react';

interface Step {
  num: number;
  label: string;
}

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  subStep?: '3a' | '3b' | null;
  onSubStepClick?: (sub: '3a' | '3b') => void;
  hideStep4?: boolean;
}

const ALL_STEPS: Step[] = [
  { num: 1, label: 'Input' },
  { num: 2, label: 'Chunk' },
  { num: 3, label: 'Task' },
  { num: 4, label: 'Process' },
];

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  subStep,
  onSubStepClick,
  hideStep4,
}: StepIndicatorProps) {
  const steps = hideStep4 ? ALL_STEPS.filter((s) => s.num !== 4) : ALL_STEPS;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = currentStep === step.num;
        const isCompleted = completedSteps.includes(step.num);

        return (
          <div key={step.num} className="flex items-center">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-surface-light/50 text-gray-500 border border-transparent hover:text-gray-300'
              }`}
              onClick={() => onStepClick(step.num)}
            >
              {isCompleted && !isActive ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                  {step.num}
                </span>
              )}
              {step.label}
            </button>

            {/* Sub-step toggle inline for step 3 */}
            {step.num === 3 && isActive && onSubStepClick && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    subStep === '3a'
                      ? 'bg-accent/15 text-accent'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onClick={() => onSubStepClick('3a')}
                >
                  Task
                </button>
                <button
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    subStep === '3b'
                      ? 'bg-accent/15 text-accent'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onClick={() => onSubStepClick('3b')}
                >
                  Copy
                </button>
              </div>
            )}

            {i < steps.length - 1 && (
              <div className={`w-4 h-px mx-1 ${isCompleted ? 'bg-emerald-500/40' : 'bg-surface-lighter'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
