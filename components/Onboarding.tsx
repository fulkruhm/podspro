
import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to PODS",
      description: "PODS (Predictive Order & Demand Solutions) transforms your grocery supply chain from reactive to proactive using advanced Gemini AI.",
      icon: "🚀"
    },
    {
      title: "Multi-Store Management",
      description: "Manage thousands of SKUs across multiple regions, stores, and departments with our new hierarchical filtering system.",
      icon: "🏙️"
    },
    {
      title: "Inventory Engine",
      description: "Our Dynamic Order Point System monitors stock levels in real-time and recommends optimal reorder points based on daily demand and lead times.",
      icon: "📦"
    },
    {
      title: "Logistics Engine",
      description: "Predict freight trends and optimize routes to Chicago, Atlanta, and Columbus hubs to save on operational costs.",
      icon: "🚛"
    },
    {
      title: "AI Advisor",
      description: "Talk to our AI Advisor for custom analysis, 'what-if' scenarios, and deep dives into your regional operational data.",
      icon: "🤖"
    }
  ];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 md:p-12 text-center">
          <div className="text-6xl mb-6">{steps[step].icon}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{steps[step].title}</h2>
          <p className="text-slate-600 leading-relaxed mb-8">
            {steps[step].description}
          </p>
          
          <div className="flex justify-center space-x-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`}
              />
            ))}
          </div>

          <button 
            onClick={next}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            {step === steps.length - 1 ? "Get Started" : "Continue"}
          </button>
          
          {step < steps.length - 1 && (
            <button 
              onClick={onComplete}
              className="mt-4 text-sm text-slate-400 font-medium hover:text-slate-600"
            >
              Skip Intro
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
