import React, { useState, useRef, useLayoutEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { CanvasLayer } from './CanvasLayer';
import * as htmlToImage from 'html-to-image';
import { motion } from 'framer-motion';
import { cn } from '../utils/canvasUtils';
import { Header } from './editor/Header/Header';
import { Toolbar } from './editor/Toolbar/Toolbar';
import { Inspector } from './editor/Inspector/Inspector';

const EditorLayout: React.FC = () => {
  const {
    backgroundImage, setBackgroundImage,
  } = useEditor();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
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

      <Header
        onUploadClick={() => fileInputRef.current?.click()}
        onExportClick={handleExport}
      />

      {/* Global Scroll Container */}
      <main
        className="flex-1 min-h-screen mt-14 canvas-bg flex flex-col items-center py-20 lg:py-12 select-none"
        style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%' }}
      >
        {/* Document Wrapper */}
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
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
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

      <Toolbar
        isMobile={isMobile}
        isInspectorOpen={isInspectorOpen}
        onInspectorToggle={() => setIsInspectorOpen(!isInspectorOpen)}
      />

      <Inspector
        isMobile={isMobile}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </motion.div>
  );
};

export default EditorLayout;
