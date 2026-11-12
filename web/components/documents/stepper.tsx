"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type FC,
  type ReactNode,
  type SetStateAction,
} from "react";
import { BsCheck } from "react-icons/bs";
import { MdNavigateNext } from "react-icons/md";

import { Button } from "@/components/ui/button";

const EASE = [0.4, 0, 0.2, 1] as const;

interface Step {
  title: string;
  description: string;
  nextButtonText?: string;
}

type OnNext = (() => Promise<boolean>) | null;

interface StepperContextValue {
  canGoToNextStep: boolean;
  setCanGoToNextStep: (value: boolean) => void;
  onNext: OnNext;
  setOnNext: Dispatch<SetStateAction<OnNext>>;
  middleContent: ReactNode;
  setMiddleContent: (content: ReactNode) => void;
}

const StepperContext = createContext<StepperContextValue | undefined>(
  undefined
);

export const useStepper = () => {
  const context = useContext(StepperContext);
  if (!context) {
    throw new Error("useStepper must be used within StepperProvider");
  }
  return context;
};

export const StepperProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [canGoToNextStep, setCanGoToNextStep] = useState(true);
  const [onNext, setOnNext] = useState<OnNext>(null);
  const [middleContent, setMiddleContent] = useState<ReactNode>(null);

  const value = useMemo<StepperContextValue>(
    () => ({
      canGoToNextStep,
      setCanGoToNextStep,
      onNext,
      setOnNext,
      middleContent,
      setMiddleContent,
    }),
    [canGoToNextStep, onNext, middleContent]
  );

  return (
    <StepperContext.Provider value={value}>{children}</StepperContext.Provider>
  );
};

interface StepperProps {
  steps: Step[];
  current: number;
  setCurrent: (step: number) => void;
  children: ReactNode;
}

function StepIndicator({
  step,
  index,
  current,
  isLast,
}: {
  step: Step;
  index: number;
  current: number;
  isLast: boolean;
}) {
  const isCompleted = index < current;
  const isActive = index === current;

  return (
    <div
      className={`flex items-center border-b border-border pb-4 ${
        isLast ? "" : "flex-1"
      }`}
    >
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
          isCompleted || isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <AnimatePresence initial={false}>
          {isCompleted ? (
            <motion.span
              key="check"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.22, ease: EASE }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <BsCheck size={24} />
            </motion.span>
          ) : (
            <motion.span
              key="num"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.22, ease: EASE }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {index + 1}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {!isCompleted && (
          <motion.span
            key="label"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.2, ease: EASE }}
            className={`ml-2 whitespace-nowrap ${
              isActive
                ? "block text-foreground"
                : "hidden text-muted-foreground sm:block"
            }`}
          >
            {step.title}
          </motion.span>
        )}
      </AnimatePresence>

      {!isLast && (
        <div className="relative mx-2 flex-1 border-t border-border">
          <motion.div
            initial={false}
            animate={{ scaleX: isCompleted ? 1 : 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{ transformOrigin: "left", willChange: "transform" }}
            className="absolute -top-px right-0 left-0 h-px bg-primary"
          />
        </div>
      )}
    </div>
  );
}

export const StepperLayout: FC<StepperProps> = ({
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
    if (!canGoToNextStep) {
      return;
    }
    setIsLoading(true);
    const fn = onNext;
    setOnNext(null);
    try {
      const ok = typeof fn === "function" ? await fn() : true;
      if (ok) {
        setCurrent(Math.min(current + 1, steps.length - 1));
      } else {
        setCanGoToNextStep(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFinal = current === steps.length - 1;

  let nextLabel: string;
  if (isLoading) {
    nextLabel = "Processing..";
  } else if (isFinal) {
    nextLabel = "Issue";
  } else {
    nextLabel = steps[current].nextButtonText ?? "Next";
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex w-full shrink-0 items-center justify-between">
        {steps.map((step, i) => (
          <StepIndicator
            key={step.title}
            step={step}
            index={i}
            current={current}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>

      <div className="shrink-0 py-6">
        <h3 className="text-left text-lg md:text-xl">{steps[current].title}</h3>
        <p className="text-muted-foreground">{steps[current].description}</p>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex min-h-full flex-col items-center justify-center py-2"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 shrink-0 border-t border-border bg-background/95 px-4 pt-4 pb-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrent(Math.max(current - 1, 0))}
            disabled={current === 0 || isLoading}
          >
            <MdNavigateNext size={24} className="rotate-180" />
          </Button>
          {middleContent}
          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading || !canGoToNextStep}
            className="flex items-center gap-2"
          >
            {nextLabel}
            {isFinal || <MdNavigateNext size={24} />}
          </Button>
        </div>
      </div>
    </div>
  );
};
