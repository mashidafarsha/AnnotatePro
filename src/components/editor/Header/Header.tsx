import React from 'react';
import { Pen, RotateCcw, RotateCw, Upload, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEditor } from '../../../store/EditorContext';
import { cn } from '../../../utils/canvasUtils';

interface HeaderProps {
  onUploadClick: () => void;
  onExportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploadClick, onExportClick }) => {
  const { undo, redo, canUndo, canRedo } = useEditor();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 flex justify-between items-center w-full px-4 sm:px-8 h-14">
      <div className="flex items-center gap-3 group cursor-pointer scale-90 sm:scale-100 origin-left">
        <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
          <Pen size={18} className="text-white" strokeWidth={3} />
        </div>
        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent italic">
          Annotate<span className="text-[#007AFF] not-italic">Pro</span>
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 mr-1 sm:mr-2">
          <motion.button
            whileTap={canUndo ? { scale: 0.9 } : {}}
            onClick={undo}
            disabled={!canUndo}
            className={cn(
              "p-2 rounded-xl transition-all",
              canUndo ? "text-slate-600 hover:bg-black/5" : "text-slate-400 opacity-50 cursor-not-allowed"
            )}
          >
            <RotateCcw size={18} strokeWidth={2.5} />
          </motion.button>
          <motion.button
            whileTap={canRedo ? { scale: 0.9 } : {}}
            onClick={redo}
            disabled={!canRedo}
            className={cn(
              "p-2 rounded-xl transition-all",
              canRedo ? "text-slate-600 hover:bg-black/5" : "text-slate-400 opacity-50 cursor-not-allowed"
            )}
          >
            <RotateCw size={18} strokeWidth={2.5} />
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onUploadClick}
          className="p-2 sm:px-4 sm:py-2 rounded-2xl text-slate-600 hover:bg-black/5 transition-colors text-xs font-bold flex items-center gap-2"
        >
          <Upload size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Upload</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onExportClick}
          className="px-4 py-2 sm:px-5 rounded-xl bg-[#007AFF] text-white hover:bg-[#0071E3] transition-colors text-xs font-bold shadow-lg shadow-blue-500/10 flex items-center gap-2"
        >
          <Download size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Export</span>
        </motion.button>
      </div>
    </header>
  );
};
