import React from 'react';
import { Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEditor } from '../../../store/EditorContext';
import { cn } from '../../../utils/canvasUtils';
import { TOOLS } from '../../../constants/editorConstants';

interface ToolbarProps {
  isMobile: boolean;
  isInspectorOpen: boolean;
  onInspectorToggle: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ isMobile, isInspectorOpen, onInspectorToggle }) => {
  const { activeTool, setActiveTool } = useEditor();

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] w-fit max-w-[95%] pointer-events-none">
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.4 }}
        className="bg-white/20 backdrop-blur-md rounded-full border border-white/40 px-5 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 shadow-[0_24px_60px_rgba(0,0,0,0.08)] pointer-events-auto transition-all duration-300 ease-in-out hover:shadow-[0_32px_80px_rgba(0,0,0,0.15)]"
      >
        {TOOLS.map((t) => (
          <motion.button
            key={t.id}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => setActiveTool(t.id)}
            className={cn(
              "p-1 rounded-full transition-all duration-300 ease-in-out relative flex items-center justify-center flex-shrink-0",
              activeTool === t.id ? "text-white" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <t.icon size={isMobile ? 18 : 22} strokeWidth={2.5} className="relative z-10" />
            {activeTool === t.id && (
              <motion.div
                layoutId="apple-bubble-final"
                className="absolute -inset-2.5 sm:-inset-3 bg-[#007AFF] rounded-full shadow-[0_8px_25px_rgba(0,122,255,0.5)]"
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              />
            )}
          </motion.button>
        ))}

        <div className="w-[1px] h-8 bg-slate-200/50 flex-shrink-0 mx-1 lg:hidden" />

        <motion.button
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.85 }}
          onClick={onInspectorToggle}
          className={cn(
            "p-1 rounded-full transition-all flex items-center justify-center relative flex-shrink-0",
            isInspectorOpen ? "text-[#007AFF]" : "text-slate-500"
          )}
        >
          <Settings2 size={isMobile ? 18 : 22} strokeWidth={2.5} />
        </motion.button>
      </motion.nav>
    </div>
  );
};
