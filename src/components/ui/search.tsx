import { useState, useRef } from "react";
import { Search } from "lucide-react";

export default function HoverSearch() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapperRef}
      className={`
        relative flex items-center
        transition-all duration-300 ease-in-out
        bg-gray-100 border rounded-full shadow-sm
        ${open ? "w-64" : "w-10"}
        h-10
      `}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!wrapperRef.current?.contains(document.activeElement)) {
          setOpen(false);
        }
      }}
    >
      {/* Icon */}
      <Search
        size={16}
        className="absolute left-3 text-black"
      />

      {/* Input */}
      <input
        type="text"
        placeholder="Tìm kiếm..."
        className={`
          outline-none bg-transparent text-sm text-black
          pl-9 pr-4 w-full
          transition-opacity duration-200
          ${open ? "opacity-100" : "opacity-0"}
        `}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
    </div>
  );
}