import React, { useState, useRef, useLayoutEffect } from 'react';
import { MousePointer2, Pen, Highlighter, Eraser, Type, FunctionSquare, Download, Eye, EyeOff, X, Upload, Settings2, RotateCcw, RotateCw } from 'lucide-react';
import { useEditor, type Tool } from '../store/EditorContext';
import { CanvasLayer } from './CanvasLayer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as htmlToImage from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EditorLayout: React.FC = () => {
  const {
    activeTool, setActiveTool, color, setColor, strokeWidth, setStrokeWidth,
    annotations, toggleVisibility, selectedAnnotationId, setSelectedAnnotationId,
    backgroundImage, setBackgroundImage,
    undo, redo, canUndo, canRedo
  } = useEditor();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');

  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const documentContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select' },
    { id: 'pen' as Tool, icon: Pen, label: 'Pen' },
    { id: 'highlighter' as Tool, icon: Highlighter, label: 'Highlighter' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
    { id: 'text' as Tool, icon: Type, label: 'Text' },
    { id: 'math' as Tool, icon: FunctionSquare, label: 'Math' },
  ];

  const colors = [
    { value: '#007AFF', label: 'Electric Blue' },
    { value: '#34C759', label: 'Green' },
    { value: '#FF9500', label: 'Orange' },
    { value: '#FF3B30', label: 'Red' },
    { value: '#000000', label: 'Black' },
  ];

  const handleExport = async () => {
    if (!documentContainerRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(documentContainerRef.current, {
        quality: 1.0,
        pixelRatio: 3,
      });
      const link = document.createElement('a');
      link.download = 'annotated-pro.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackgroundImage(url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#F2F2F7] font-sans text-slate-900 antialiased overflow-hidden h-screen flex flex-col"
    >
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {/* Dynamic Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 flex justify-between items-center w-full px-4 sm:px-8 h-14">
        <div className="flex items-center gap-3 group cursor-pointer scale-90 sm:scale-100 origin-left">
          <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
            <Pen size={18} className="text-white" strokeWidth={3} />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent italic">Annotate<span className="text-[#007AFF] not-italic">Pro</span></span>
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
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:px-4 sm:py-2 rounded-2xl text-slate-600 hover:bg-black/5 transition-colors text-xs font-bold flex items-center gap-2"
          >
            <Upload size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Upload</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleExport}
            className="px-4 py-2 sm:px-5 rounded-xl bg-[#007AFF] text-white hover:bg-[#0071E3] transition-colors text-xs font-bold shadow-lg shadow-blue-500/10 flex items-center gap-2"
          >
            <Download size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Export</span>
          </motion.button>
        </div>
      </header>

      {/* Global Scroll Container - Native Touch Support */}
      <main
        className="flex-1 min-h-screen mt-14 canvas-bg flex flex-col items-center py-20 lg:py-12 select-none"
        style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          height: '100%'
        }}
      >
        {/* Document Wrapper - Balanced Alignment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          ref={documentContainerRef}
          className={cn(
            "w-full px-4 lg:px-0 lg:max-w-[816px] flex-shrink-0 mb-40 lg:mb-16 mx-auto select-none",
            isInspectorOpen && isMobile && "pointer-events-none opacity-50 transition-opacity"
          )}
        >
          <div
            ref={innerContainerRef}
            className={cn(
              "w-full bg-white rounded-[32px] lg:rounded-[12px] overflow-hidden relative transition-all duration-500",
              "shadow-[0_20px_50px_rgba(0,0,0,0.1)] lg:shadow-[0_30px_90px_rgba(0,0,0,0.12)]",
              "lg:border lg:border-slate-200/60 lg:max-h-[80vh] lg:h-auto",
              "aspect-[1/1.414] min-h-[600px]"
            )}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              {backgroundImage ? (
                <img src={backgroundImage} alt="Background" className="w-full h-full object-contain pointer-events-none relative z-[1] transition-opacity duration-500" />
              ) : (
                <div className="document-content p-6 sm:p-16 w-full h-full bg-white transition-opacity duration-500">
                  <div className="border-b-[4px] border-slate-900 pb-8 mb-12 flex justify-between items-end">
                    <div className="space-y-1">
                      <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tighter leading-none italic uppercase">RESIDENTIAL FLOOR PLAN</h1>
                      <p className="text-xs sm:text-sm text-[#007AFF] font-black tracking-[0.4em] uppercase opacity-90">Architectural Series • v4.0</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-16">
                    <div className="space-y-6">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Project Metadata</h3>
                      <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-semibold">
                        Detailed schematics for the North Wing expansion, focusing on open-concept flow and structural load-bearing optimization.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[#F2F2F7]/50 backdrop-blur-md p-6 rounded-[32px] border border-white/50 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Scale</p>
                        <p className="text-2xl font-black text-slate-900">1:50</p>
                      </div>
                      <div className="bg-[#F2F2F7]/50 backdrop-blur-md p-6 rounded-[32px] border border-white/50 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sheet</p>
                        <p className="text-2xl font-black text-[#007AFF]">A-102</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative rounded-[48px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.12)] border-8 border-white mb-16 bg-white group">
                    <img
                      src="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?q=80&w=1972&auto=format&fit=crop"
                      alt="Architectural Floor Plan"
                      className="w-full max-w-full h-auto object-contain mx-auto opacity-90 transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
            <CanvasLayer containerRef={innerContainerRef} />
          </div>
        </motion.div>
      </main>

      {/* Universal Premium Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] w-fit max-w-[95%] pointer-events-none">
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.4 }}
          className="bg-white/20 backdrop-blur-md rounded-full border border-white/40 px-5 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 shadow-[0_24px_60px_rgba(0,0,0,0.08)] pointer-events-auto transition-all duration-300 ease-in-out hover:shadow-[0_32px_80px_rgba(0,0,0,0.15)]"
        >
          {tools.map((t) => (
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
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={cn(
              "p-1 rounded-full transition-all flex items-center justify-center relative flex-shrink-0",
              isInspectorOpen ? "text-[#007AFF]" : "text-slate-500"
            )}
          >
            <Settings2 size={isMobile ? 18 : 22} strokeWidth={2.5} />
          </motion.button>
        </motion.nav>
      </div>

      {/* Responsive Inspector (Bottom Sheet for Mobile, Sidebar for Desktop) */}
      <AnimatePresence>
        {isInspectorOpen || !isMobile ? (
          <>
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsInspectorOpen(false)}
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
                <button onClick={() => setIsInspectorOpen(false)} className="lg:hidden p-2 rounded-full bg-slate-950/10 text-slate-950">
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
                    {activeTab === tab && <motion.div layoutId="tab-underline-pro" className="absolute bottom-0 left-0 right-0 h-1 bg-[#007AFF] rounded-full" />}
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
                        {colors.map(c => (
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
    </motion.div>
  );
};

export default EditorLayout;
