import React, { useRef, useEffect } from 'react';
import { cn } from '../../../utils/canvasUtils';

interface TextInputProps {
  x: number;
  y: number;
  value: string;
  strokeWidth: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({ x, y, value, strokeWidth, onChange, onSubmit }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isMobile = window.innerWidth < 768;

  return (
    <div
      className={cn(
        "z-[1000] pointer-events-auto",
        isMobile
          ? "fixed inset-x-0 top-1/4 mx-auto w-[85%] bg-white/90 backdrop-blur-2xl p-6 rounded-[32px] shadow-xl border border-white/40"
          : "absolute bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/50"
      )}
      style={isMobile ? {} : { top: `${y}px`, left: `${x}px`, transform: 'translate(-12px, -12px)' }}
    >
      <input
        ref={inputRef}
        autoFocus
        className="bg-transparent border-none outline-none font-bold text-[#1e293b] placeholder:text-slate-300 w-full"
        style={{ fontSize: isMobile ? 14 : (strokeWidth * 3 + 12), fontFamily: 'Geist' }}
        placeholder="Type..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSubmit}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
      />
    </div>
  );
};
