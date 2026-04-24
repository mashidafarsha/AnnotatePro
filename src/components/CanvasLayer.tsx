import React, { useRef, useLayoutEffect, useState } from 'react';
import { Stage, Layer, Path, Text, Image as KonvaImage } from 'react-konva';
import { useEditor, type Point } from '../store/EditorContext';
import { getStroke } from 'perfect-freehand';
import type { KonvaEventObject } from 'konva/lib/Node';
import katex from 'katex';
import * as htmlToImage from 'html-to-image';
import useImage from 'use-image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CanvasLayerProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

const MathNode = ({ 
  annotation, size, responsiveScale, onPointerDown, onMouseEnter, onMouseLeave, onDragStart, onDragEnd, listening 
}: { 
  annotation: any; size: {width: number, height: number}; responsiveScale: number;
  onPointerDown: any; onMouseEnter: any; onMouseLeave: any; onDragStart?: any; onDragEnd?: any; listening?: boolean;
}) => {
  const [img] = useImage(annotation.imageSrc);
  const nodeRef = useRef<any>(null);

  return (
    <KonvaImage
      ref={nodeRef}
      image={img}
      x={annotation.x * size.width}
      y={annotation.y * size.height}
      width={annotation.width}
      height={annotation.height}
      scaleX={responsiveScale}
      scaleY={responsiveScale}
      visible={annotation.visible !== false}
      listening={listening}
      draggable={annotation.draggable}
      shadowColor={annotation.shadowProps?.shadowColor || '#2563eb'}
      shadowBlur={annotation.shadowProps?.shadowBlur || 0}
      shadowOpacity={annotation.shadowProps?.shadowOpacity || 0}
      shadowOffsetX={0}
      shadowOffsetY={4}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={(e) => {
        nodeRef.current?.to({ scaleX: responsiveScale * 1.05, scaleY: responsiveScale * 1.05, duration: 0.2 });
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        nodeRef.current?.to({ scaleX: responsiveScale, scaleY: responsiveScale, duration: 0.2 });
        onDragEnd?.(e);
      }}
    />
  );
};

export const CanvasLayer: React.FC<CanvasLayerProps> = ({ containerRef }) => {
  const {
    activeTool, color, strokeWidth, annotations, addAnnotation, updateAnnotation, removeAnnotation,
    selectedAnnotationId, setSelectedAnnotationId
  } = useEditor();
  
  const [size, setSize] = useState({ width: 0, height: 0 });
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const layerRef = useRef<any>(null);
  const drawingPathRef = useRef<any>(null);

  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [mathInput, setMathInput] = useState<{ x: number, y: number } | null>(null);
  const [mathValue, setMathValue] = useState('');

  const responsiveScale = React.useMemo(() => {
    return window.innerWidth < 768 ? 0.7 : 1;
  }, [size.width]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      isDrawing.current = true;
      currentPoints.current = [[pos.x, pos.y]];
      updateDrawingPath();
    }
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawing.current) return;
    e.evt.preventDefault();
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    currentPoints.current.push([pos.x, pos.y]);
    updateDrawingPath();
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentPoints.current.length > 0 && size.width > 0 && size.height > 0) {
      const normalizedPoints: Point[] = currentPoints.current.map(([x, y]) => [
        x / size.width,
        y / size.height,
      ]);

      addAnnotation({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: 'stroke',
        points: normalizedPoints,
        color,
        width: strokeWidth,
        tool: activeTool as 'pen' | 'highlighter',
      });
    }

    currentPoints.current = [];
    if (drawingPathRef.current) drawingPathRef.current.data('');
    layerRef.current?.batchDraw();
  };

  const updateDrawingPath = () => {
    if (!drawingPathRef.current || !layerRef.current) return;
    const strokeOutline = getStroke(currentPoints.current, {
      size: strokeWidth * 2,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });

    const pathData = getSvgPathFromStroke(strokeOutline);
    drawingPathRef.current.data(pathData);
    drawingPathRef.current.fill(color);
    drawingPathRef.current.opacity(activeTool === 'highlighter' ? 0.4 : 1);
    layerRef.current.batchDraw();
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (activeTool === 'select') {
      setSelectedAnnotationId(null);
    } else if (activeTool === 'text') {
      setTimeout(() => {
        if (!textInput) {
          setTextInput({ x: pos.x, y: pos.y });
          setTextValue('');
        }
      }, 100);
    } else if (activeTool === 'math') {
      setTimeout(() => {
        if (!mathInput) {
          setMathInput({ x: pos.x, y: pos.y });
          setMathValue('');
        }
      }, 100);
    }
  };

  const handleAnnotationClick = (e: any, id: string) => {
    if (activeTool === 'eraser') {
      e.cancelBubble = true;
      removeAnnotation(id);
    } else if (activeTool === 'select') {
      e.cancelBubble = true;
      setSelectedAnnotationId(id);
      
      const node = e.target;
      node.to({
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 0.1,
        onFinish: () => { node.to({ scaleX: 1, scaleY: 1, duration: 0.15 }); }
      });
    }
  };

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    e.target.moveToTop();
    e.target.to({ shadowBlur: 15, shadowOpacity: 0.3, duration: 0.2 });
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    node.to({
      shadowBlur: selectedAnnotationId === id ? 8 : 0,
      shadowOpacity: selectedAnnotationId === id ? 0.8 : 0,
      duration: 0.2
    });
    updateAnnotation(id, {
      x: node.x() / size.width,
      y: node.y() / size.height,
    });
  };

  const handleTextSubmit = () => {
    if (textInput && textValue.trim() !== '') {
      addAnnotation({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: 'text',
        text: textValue,
        x: textInput.x / size.width,
        y: textInput.y / size.height,
        color,
        fontSize: strokeWidth * 3 + 12,
      });
    }
    setTextInput(null);
  };

  const handleMathSubmit = async () => {
    if (!mathInput || !mathValue.trim()) {
      setMathInput(null);
      return;
    }

    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', top: '0px', left: '0px', zIndex: '-9999',
      display: 'inline-block', color, fontSize: `${strokeWidth * 5 + 16}px`,
      padding: '12px', fontFamily: 'Geist'
    });
    document.body.appendChild(el);

    try {
      katex.render(mathValue, el, { throwOnError: false });
      await new Promise(r => setTimeout(r, 150));
      
      const dataUrl = await htmlToImage.toPng(el, {
        backgroundColor: 'transparent',
        pixelRatio: 2.5,
        fontEmbedCSS: '',
      });

      if (!dataUrl) throw new Error("Image data URL is empty");
      const rect = el.getBoundingClientRect();

      addAnnotation({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: 'math',
        latex: mathValue,
        imageSrc: dataUrl,
        x: mathInput.x / size.width,
        y: mathInput.y / size.height,
        width: rect.width,
        height: rect.height,
      });
    } catch (err) {
      console.error("Math rendering failed:", err);
    } finally {
      document.body.removeChild(el);
      setMathInput(null);
    }
  };

  const canInteractWithAnnotations = activeTool === 'select' || activeTool === 'eraser';

  return (
    <div className="absolute inset-0 z-10 pointer-events-auto">
      <Stage
        width={size.width}
        height={size.height}
        className="w-full h-full origin-top-left"
        style={{ touchAction: (activeTool === 'pen' || activeTool === 'highlighter') ? 'none' : 'pan-y !important' as any }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer ref={layerRef}>
          {annotations.map((anno) => {
            const isSelected = selectedAnnotationId === anno.id;
            const shadowProps = isSelected ? { shadowColor: '#2563eb', shadowBlur: 12, shadowOpacity: 0.6 } : {};
            const isVisible = anno.visible !== false;

            if (anno.type === 'stroke') {
              const renderPoints = anno.points.map(([nx, ny]) => [nx * size.width, ny * size.height] as Point);
              const strokeOutline = getStroke(renderPoints, {
                size: anno.width * 2, thinning: 0.5, smoothing: 0.5, streamline: 0.5,
              });

              return (
                <Path
                  key={anno.id}
                  {...shadowProps}
                  visible={isVisible}
                  listening={canInteractWithAnnotations}
                  data={getSvgPathFromStroke(strokeOutline)}
                  fill={anno.color}
                  opacity={anno.tool === 'highlighter' ? 0.35 : 1}
                  onClick={(e) => handleAnnotationClick(e, anno.id)}
                  onTap={(e) => handleAnnotationClick(e, anno.id)}
                  onPointerDown={(e) => {
                    if (activeTool === 'eraser') { e.cancelBubble = true; removeAnnotation(anno.id); }
                    else if (activeTool === 'select') { e.cancelBubble = true; setSelectedAnnotationId(anno.id); }
                  }}
                  onMouseEnter={() => {
                    if (activeTool === 'eraser') document.body.style.cursor = 'crosshair';
                    else if (activeTool === 'select') document.body.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => { document.body.style.cursor = 'default'; }}
                />
              );
            } else if (anno.type === 'text') {
              return (
                <Text
                  key={anno.id}
                  {...shadowProps}
                  visible={isVisible}
                  listening={canInteractWithAnnotations}
                  x={anno.x * size.width}
                  y={anno.y * size.height}
                  text={anno.text}
                  fill={anno.color}
                  fontSize={anno.fontSize * responsiveScale}
                  fontFamily="Geist"
                  fontStyle="600"
                  draggable={activeTool === 'select'}
                  onDragStart={handleDragStart}
                  onDragEnd={(e) => handleDragEnd(e, anno.id)}
                  onClick={(e) => handleAnnotationClick(e, anno.id)}
                  onTap={(e) => handleAnnotationClick(e, anno.id)}
                  onPointerDown={(e) => {
                    if (activeTool === 'eraser') { e.cancelBubble = true; removeAnnotation(anno.id); }
                    else if (activeTool === 'select') { e.cancelBubble = true; setSelectedAnnotationId(anno.id); }
                  }}
                  onMouseEnter={() => {
                    if (activeTool === 'eraser') document.body.style.cursor = 'crosshair';
                    else if (activeTool === 'select') document.body.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => { document.body.style.cursor = 'default'; }}
                />
              );
            } else if (anno.type === 'math') {
              return (
                <MathNode 
                  key={anno.id}
                  annotation={{ ...anno, ...shadowProps, draggable: activeTool === 'select' }}
                  size={size}
                  responsiveScale={responsiveScale}
                  listening={canInteractWithAnnotations}
                  onDragStart={handleDragStart}
                  onDragEnd={(e: any) => handleDragEnd(e, anno.id)}
                  onPointerDown={(e: any) => {
                    if (activeTool === 'eraser') { e.cancelBubble = true; removeAnnotation(anno.id); }
                    else if (activeTool === 'select') { e.cancelBubble = true; setSelectedAnnotationId(anno.id); }
                  }}
                  onMouseEnter={() => {
                    if (activeTool === 'eraser') document.body.style.cursor = 'crosshair';
                    else if (activeTool === 'select') document.body.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => { document.body.style.cursor = 'default'; }}
                />
              );
            }
            return null;
          })}
          <Path ref={drawingPathRef} data="" fill={color} opacity={activeTool === 'highlighter' ? 0.4 : 1} />
        </Layer>
      </Stage>

      {/* Input Overlays */}
      {textInput && (
        <div 
          className={cn(
            "z-[100] pointer-events-auto",
            window.innerWidth < 768 
              ? "fixed inset-x-0 top-1/4 mx-auto w-[85%] bg-white/90 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/40" 
              : "absolute bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl border border-white/50"
          )}
          style={window.innerWidth < 768 ? {} : { top: textInput.y, left: textInput.x, transform: 'translate(-12px, -12px)' }}
        >
          <div className="flex flex-col gap-1.5">
            {window.innerWidth < 768 && <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Add Annotation</label>}
            <input
              autoFocus
              className="bg-transparent border-none outline-none font-bold text-[#1e293b] placeholder:text-slate-300 w-full"
              style={{ fontSize: window.innerWidth < 768 ? 14 : (strokeWidth * 3 + 12), fontFamily: 'Geist' }}
              placeholder="Type..."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            />
          </div>
        </div>
      )}

      {mathInput && (
        <div 
          className={cn(
            "bg-white/90 backdrop-blur-3xl rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.18)] border border-white/50 flex flex-col gap-4 z-[100] pointer-events-auto",
            window.innerWidth < 768 ? "fixed inset-x-0 top-1/4 mx-auto w-[85%] p-6 scale-90" : "absolute p-6"
          )}
          style={window.innerWidth < 768 ? {} : { top: mathInput.y + 10, left: mathInput.x, transform: 'translateX(-50%)' }}
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#007AFF] opacity-80">Equation Input</label>
            <input
              autoFocus
              className="w-full bg-slate-100/40 border border-slate-200/50 outline-none px-5 py-4 rounded-2xl font-mono text-sm text-[#1e293b] placeholder:text-slate-300"
              placeholder="e.g. E = mc^2"
              value={mathValue}
              onChange={(e) => setMathValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMathSubmit()}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              className="text-xs font-black uppercase tracking-widest px-5 py-3 text-slate-400 hover:text-slate-600 transition-colors" 
              onClick={() => setMathInput(null)}
            >
              Cancel
            </button>
            <button 
              className="text-xs font-black uppercase tracking-widest px-6 py-3 bg-[#1e293b] text-white rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95" 
              onClick={handleMathSubmit}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
