import React from "react";

import Logo from "./Logo";

interface NavbarProps {
  className?: string;
  children?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ className, children }) => {
  return (
    <header
      className={`m-0 text-center flex justify-between items-center w-full px-6 py-8 
        md:px-12 lg:px-20 shadow-none h-28 relative ${className}`}
    >
      <Logo />
      <div className="hidden md:flex gap-4">{children}</div>
    </header>
  );
};
