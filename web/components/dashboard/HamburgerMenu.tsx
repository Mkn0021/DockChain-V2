import { FaBars } from "react-icons/fa";

interface HamburgerMenuProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function HamburgerMenu({
  sidebarOpen,
  setSidebarOpen,
}: HamburgerMenuProps) {
  return (
    <button
      className="lg:hidden mr-2"
      onClick={() => setSidebarOpen(!sidebarOpen)}
    >
      <FaBars className="w-8 h-8 rounded-none" />
    </button>
  );
}
