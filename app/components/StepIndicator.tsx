'use client';

interface Step {
  num: number;
  label: string;
}

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const STEPS: Step[] = [
  { num: 1, label: 'Define Task' },
  { num: 2, label: 'Input Text' },
  { num: 3, label: 'Chunk & Adjust' },
  { num: 4, label: 'Process & Export' },
];

export default function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex justify-center gap-4 mb-12 p-6 bg-surface rounded-xl">
      {STEPS.map((step) => {
        const isActive = currentStep === step.num;
        const isCompleted = completedSteps.includes(step.num);

        return (
          <div
            key={step.num}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg cursor-pointer transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-br from-accent to-accent-purple scale-105'
                : isCompleted
                  ? 'bg-[#2a4a2a]'
                  : 'bg-surface-light'
            }`}
            onClick={() => onStepClick(step.num)}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                isActive ? 'bg-white/20' : 'bg-white/10'
              }`}
            >
              {step.num}
            </div>
            <div className="text-sm font-medium">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
