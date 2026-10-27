import React from "react";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = "",
}) => {
  return (
    <section
      className={`w-full flex flex-col items-center px-2 sm:px-4 py-20 ${className}`}
    >
      <div className="flex flex-col items-center w-full max-w-[90%] gap-8 sm:gap-12">
        <div className="w-full max-w-6xl flex flex-col items-center gap-6 sm:gap-8">
          {children}
        </div>
      </div>
    </section>
  );
};
