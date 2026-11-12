"use client";

import { cn } from "cn";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const EASE = [0.4, 0, 0.2, 1] as const;

interface CarouselState {
  index: number;
  visible: number;
  count: number;
  maxIndex: number;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  canPrev: boolean;
  canNext: boolean;
}

export function useCarousel(count: number): CarouselState {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisible(1);
      } else if (width < 1024) {
        setVisible(2);
      } else {
        setVisible(3);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, count - visible);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const next = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, maxIndex));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback(
    (i: number) => {
      setIndex(Math.max(0, Math.min(i, maxIndex)));
    },
    [maxIndex]
  );

  return useMemo<CarouselState>(
    () => ({
      index,
      visible,
      count,
      maxIndex,
      next,
      prev,
      goTo,
      canPrev: index > 0,
      canNext: index < maxIndex,
    }),
    [index, visible, count, maxIndex, next, prev, goTo]
  );
}

interface CarouselViewportProps {
  carousel: CarouselState;
  children: ReactNode;
  className?: string;
}

export function CarouselViewport({
  carousel,
  children,
  className,
}: CarouselViewportProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex"
        animate={{
          x: `-${carousel.index * (100 / carousel.visible)}%`,
        }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{ willChange: "transform" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
