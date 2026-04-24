import React, { useRef, useEffect } from 'react';
import { cn } from '../../../utils/canvasUtils';

interface MathInputProps {
  x: number;
  y: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const MathInput: React.FC<MathInputProps> = ({ x, y, value, onChange, onSubmit, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isMobile = window.innerWidth < 768;

  return (
    <div
      className={cn(
        "bg-white/90 backdrop-blur-3xl rounded-[32px] shadow-xl border border-white/50 flex flex-col gap-4 z-[1000] pointer-events-auto",
        isMobile ? "fixed inset-x-0 top-1/4 mx-auto w-[85%] p-6" : "absolute p-6"
      )}
      style={isMobile ? {} : { top: `${y + 10}px`, left: `${x}px`, transform: 'translateX(-50%)' }}
    >
      <input
        ref={inputRef}
        autoFocus
        className="w-full bg-slate-100/40 border border-slate-200/50 outline-none px-5 py-4 rounded-2xl font-mono text-sm"
        placeholder="e.g. E = mc^2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
      />
      <div className="flex justify-end gap-3">
        <button className="text-xs font-black uppercase tracking-widest px-4 py-2" onClick={onCancel}>Cancel</button>
        <button className="text-xs font-black uppercase tracking-widest px-6 py-2 bg-[#1e293b] text-white rounded-xl" onClick={onSubmit}>Apply</button>
      </div>
    </div>
  );
};
