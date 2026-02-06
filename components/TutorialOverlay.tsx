import React, { useState } from 'react';

export interface TutorialStep {
  title: string;
  description: string;
  icon: string;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  colorClass?: string;
  labels: {
    skip: string;
    next: string;
    start: string;
  };
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ steps, onComplete, colorClass = 'indigo', labels }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto transition-opacity" />

      {/* Card */}
      <div className="relative pointer-events-auto bg-white dark:bg-slate-900 w-full max-w-md m-4 mb-8 sm:mb-auto rounded-3xl p-6 shadow-2xl animate-fade-in-up border border-white/20 dark:border-white/10 transition-colors duration-500">
        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-${colorClass}-500 rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-slate-800 shadow-lg`}>
          <i className={`${step.icon} text-2xl text-white`}></i>
        </div>

        <div className="mt-8 text-center">
          <h3 className={`text-2xl font-black text-slate-800 dark:text-white mb-2`}>{step.title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">{step.description}</p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentStep ? `bg-${colorClass}-500 w-6` : 'bg-slate-200 dark:bg-slate-800'}`}
            ></div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 text-slate-400 dark:text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {labels.skip}
          </button>
          <button
            onClick={handleNext}
            className={`flex-[2] py-3 bg-${colorClass}-600 text-white font-bold rounded-xl shadow-lg shadow-${colorClass}-200 dark:shadow-none hover:bg-${colorClass}-700 active:scale-95 transition-all`}
          >
            {currentStep === steps.length - 1 ? labels.start : labels.next}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;