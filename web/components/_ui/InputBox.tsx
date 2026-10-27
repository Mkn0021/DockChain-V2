import React from "react";

interface InputBoxProps extends React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> {
  label?: string;
  className?: string;
  variant?: "input" | "textarea";
  rows?: number;
}

const InputBox: React.FC<InputBoxProps> = ({
  label,
  className = "",
  variant = "input",
  rows,
  ...props
}) => {
  const baseClasses = `w-full h-full placeholder-text-secondary border-2 border-border 
    focus:border-primary outline-none transition-colors duration-200 rounded-xl px-6 py-4 ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1 text-sm font-medium">{label}</label>
      )}

      {variant === "textarea" ? (
        <textarea
          className={`${baseClasses} resize-vertical`}
          rows={rows}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={baseClasses}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  );
};

export default InputBox;
