"use client";

import { createContext, useContext, useState, ReactNode, FC } from "react";
import { BsCheck } from "react-icons/bs";
import { MdNavigateNext } from "react-icons/md";

import { Button } from "@/components/_ui/Button";

interface Step {
  title: string;
  description: string;
  nextButtonText?: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
  setCurrent: (step: number) => void;
  children: ReactNode;
}

type onNextType = (() => Promise<boolean>) | null;

interface StepperContextType {
  canGoToNextStep: boolean;
  setCanGoToNextStep: (value: boolean) => void;
  onNext: onNextType;
  setOnNext: (fn: () => onNextType) => void;
  middleContent: ReactNode;
  setMiddleContent: (content: ReactNode) => void;
}

const StepperContext = createContext<StepperContextType | undefined>(undefined);

export const useStepper = () => {
  const context = useContext(StepperContext);
  if (!context)
    throw new Error("useStepper must be used within StepperProvider");
  return context;
};

export const StepperProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [canGoToNextStep, setCanGoToNextStep] = useState(true);
  const [onNext, setOnNext] = useState<onNextType>(null);
  const [middleContent, setMiddleContent] = useState<ReactNode>(null);

  return (
    <StepperContext.Provider
      value={{
        canGoToNextStep,
        setCanGoToNextStep,
        onNext,
        setOnNext,
        middleContent,
        setMiddleContent,
      }}
    >
      {children}
    </StepperContext.Provider>
  );
};

const StepperLayout: FC<StepperProps> = ({
  steps,
  current,
  setCurrent,
  children,
}) => {
  const {
    canGoToNextStep,
    setCanGoToNextStep,
    onNext,
    setOnNext,
    middleContent,
  } = useStepper();
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!canGoToNextStep) return;
    setIsLoading(true);

    try {
      const isResponseOk = onNext ? await onNext() : true;

      if (isResponseOk) {
        setCurrent(Math.min(current + 1, steps.length - 1));
      } else {
        setCanGoToNextStep(false);
      }
    } finally {
      setIsLoading(false);
      setOnNext(() => null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between w-full">
        {steps.map((step, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          const isLast = i === steps.length - 1;

          return (
            <div
              key={i}
              className={`flex items-center pb-4 border-b border-border rounded-none ${isLast ? "" : "flex-1"}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${isCompleted || isActive ? "bg-primary text-white" : "bg-gray-200 text-text-secondary"}`}
              >
                {isCompleted ? <BsCheck size={24} /> : i + 1}
              </div>
              {!isCompleted && (
                <span
                  className={`ml-2 ${isActive ? "text-text-primary block" : "text-text-secondary hidden sm:block"} whitespace-nowrap`}
                >
                  {step.title}
                </span>
              )}
              {!isLast && (
                <div
                  className={`flex-1 border-t mx-2 ${isCompleted ? "border-primary" : "border-border"}`}
                ></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Header & Description */}
      <div className="py-6">
        <h3 className="text-left m-0 p-0">{steps[current].title}</h3>
        <p className="text-text-secondary">{steps[current].description}</p>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-72 rounded-none">
        {children}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          onClick={() => setCurrent(Math.max(current - 1, 0))}
          disabled={current === 0}
        >
          <MdNavigateNext size={24} className="rotate-180" />
        </Button>
        {middleContent}
        <Button
          onClick={handleNext}
          disabled={
            isLoading || current === steps.length - 1 || !canGoToNextStep
          }
          className="flex items-center gap-2"
        >
          {isLoading ? "Processing.." : steps[current].nextButtonText}{" "}
          <MdNavigateNext size={24} />
        </Button>
      </div>
    </div>
  );
};

export default StepperLayout;
