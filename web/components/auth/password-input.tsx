"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Input } from "@/components/ui/input";

export const PasswordInput = (
  props: Omit<React.ComponentProps<typeof Input>, "type">
) => {
  const [visible, setVisible] = useState(false);

  const toggleVisible = useCallback(() => setVisible((value) => !value), []);

  return (
    <div className="relative">
      <Input
        {...props}
        className="pr-10"
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-0 right-0 h-full px-3 text-muted-foreground"
        onClick={toggleVisible}
        type="button"
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </div>
  );
};
