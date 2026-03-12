'use client';

interface Step {
  num: number;
  label: string;
  sublabel?: string;
}

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  subStep?: '3a' | '3b' | null;
  onSubStepClick?: (sub: '3a' | '3b') => void;
}

const STEPS: Step[] = [
  { num: 1, label: 'Input Text' },
  { num: 2, label: 'Chunk & Adjust' },
  { num: 3, label: 'Task / Copy' },
  { num: 4, label: 'Process & Export' },
];

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  subStep,
  onSubStepClick,
}: StepIndicatorProps) {
  return (
    <div className="mb-12">
      <div className="flex justify-center gap-4 p-6 bg-surface rounded-xl">
        {STEPS.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = completedSteps.includes(step.num);
          const isOptional = step.num >= 3;

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
              <div>
                <div className="text-sm font-medium">{step.label}</div>
                {isOptional && (
                  <div className="text-[10px] text-gray-400 opacity-70">optional</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-step tabs for step 3 */}
      {currentStep === 3 && onSubStepClick && (
        <div className="flex justify-center gap-2 mt-3">
          <button
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              subStep === '3a'
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-surface-light text-gray-400 border border-transparent hover:text-gray-200'
            }`}
            onClick={() => onSubStepClick('3a')}
          >
            3a. Define Task
          </button>
          <button
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              subStep === '3b'
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-surface-light text-gray-400 border border-transparent hover:text-gray-200'
            }`}
            onClick={() => onSubStepClick('3b')}
          >
            3b. Sequential Copy
          </button>
        </div>
      )}
    </div>
  );
}
