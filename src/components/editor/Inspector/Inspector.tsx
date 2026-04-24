import React, { useState } from 'react';
import { Type, FunctionSquare, Pen, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '../../../store/EditorContext';
import { cn } from '../../../utils/canvasUtils';
import { COLORS } from '../../../constants/editorConstants';

interface InspectorProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ isMobile, isOpen, onClose }) => {
  const {
    color, setColor, strokeWidth, setStrokeWidth,
    annotations, toggleVisibility, selectedAnnotationId, setSelectedAnnotationId,
    setActiveTool
  } = useEditor();

  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');

  return (
    <AnimatePresence>
      {isOpen || !isMobile ? (
        <>
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] lg:hidden"
            />
          )}

          <motion.aside
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed z-[10000] bg-white/40 backdrop-blur-3xl flex flex-col shadow-[0_-20px_80px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out overflow-hidden",
              "bottom-0 left-0 right-0 h-[75vh] rounded-t-[40px] border-t border-white/40", // Mobile
              "lg:top-14 lg:bottom-0 lg:right-0 lg:left-auto lg:w-[320px] lg:h-auto lg:rounded-none lg:border-l lg:border-white/40 lg:shadow-none" // Desktop
            )}
          >
            {/* iOS Grabber */}
            <div className="lg:hidden flex justify-center mt-3">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-8 py-6">
              <h4 className="text-lg font-black tracking-tight text-slate-950 uppercase">Inspector</h4>
              <button onClick={onClose} className="lg:hidden p-2 rounded-full bg-slate-950/10 text-slate-950">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-8 border-b border-slate-100/50">
              {['properties', 'layers'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "pb-4 text-sm font-black uppercase tracking-[0.15em] relative mr-10",
                    activeTab === tab ? "text-[#007AFF]" : "text-slate-950/60"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-underline-pro" className="absolute bottom-0 left-0 right-0 h-1 bg-[#007AFF] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Content Panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32 space-y-12">
              {activeTab === 'properties' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <section className="space-y-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-950">Active Palette</p>
                    <div className="flex flex-wrap gap-4">
                      {COLORS.map(c => (
                        <motion.button
                          key={c.value}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setColor(c.value)}
                          className={cn(
                            "w-10 h-10 rounded-2xl border-[4px] transition-all",
                            color === c.value ? "border-white ring-4 ring-[#007AFF] shadow-xl scale-110" : "border-transparent shadow-sm"
                          )}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex justify-between items-end">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-950">Line Weight</p>
                      <span className="text-2xl font-black text-[#007AFF] tracking-tighter leading-none">{strokeWidth}px</span>
                    </div>
                    <input
                      type="range" min="1" max="30" step="1"
                      value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#007AFF]"
                    />
                  </section>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {annotations.length === 0 ? (
                    <div className="py-24 text-center opacity-30 font-black uppercase text-[10px] tracking-widest">No Active Layers</div>
                  ) : (
                    [...annotations].reverse().map(anno => (
                      <div
                        key={anno.id}
                        onClick={() => { setActiveTool('select'); setSelectedAnnotationId(anno.id); }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-[28px] cursor-pointer transition-all border-2 shadow-sm",
                          selectedAnnotationId === anno.id ? "bg-white border-[#007AFF] shadow-xl scale-[1.02]" : "bg-white/50 border-transparent hover:border-slate-100"
                        )}
                      >
                        <div className={cn("p-2.5 rounded-2xl", selectedAnnotationId === anno.id ? "bg-[#007AFF] text-white" : "bg-slate-100 text-slate-400")}>
                          {anno.type === 'text' ? <Type size={18} /> : anno.type === 'math' ? <FunctionSquare size={18} /> : <Pen size={18} />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900 truncate flex-1">{anno.type}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleVisibility(anno.id); }}>
                          {anno.visible !== false ? <Eye size={18} className="text-slate-400" /> : <EyeOff size={18} className="text-slate-400" />}
                        </button>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};
