import { useState, useRef } from 'react';
import { Search } from 'lucide-react';

type HoverSearchProps = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export default function HoverSearch({
  placeholder = 'Tìm kiếm...',
  value,
  onChange,
}: HoverSearchProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapperRef}
      className={`
        relative flex items-center
        transition-all duration-300 ease-in-out
        bg-white border rounded-full shadow-sm
        ${open ? 'w-64' : 'w-10'}
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
      <Search size={16} className="absolute left-3 text-black" />

      {/* Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`
          outline-none bg-transparent text-sm text-black
          pl-9 pr-4 w-full
          transition-opacity duration-200
          ${open ? 'opacity-100' : 'opacity-0'}
        `}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
    </div>
  );
}
