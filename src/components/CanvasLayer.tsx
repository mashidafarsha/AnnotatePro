import React, { useRef, useLayoutEffect, useState } from 'react';
import { Stage, Layer, Path, Text, Image as KonvaImage } from 'react-konva';
import { useEditor, type Point, type StrokeAnnotation } from '../store/EditorContext';
import { getStroke } from 'perfect-freehand';
import type { KonvaEventObject } from 'konva/lib/Node';
import katex from 'katex';
import * as htmlToImage from 'html-to-image';
import useImage from 'use-image';

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
  annotation, size, scaleFactor, onPointerDown, onMouseEnter, onMouseLeave, onDragStart, onDragEnd, listening
}: {
  annotation: any; size: { width: number, height: number }; scaleFactor: number;
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
      width={annotation.width * scaleFactor}
      height={annotation.height * scaleFactor}
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
        nodeRef.current?.to({ scaleX: 1.05, scaleY: 1.05, duration: 0.2 });
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        nodeRef.current?.to({ scaleX: 1, scaleY: 1, duration: 0.2 });
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
  const [isMobile, setIsMobile] = useState(false);

  const scaleFactor = React.useMemo(() => {
    return size.width > 0 ? size.width / 816 : 1;
  }, [size.width]);

  useLayoutEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);

  const layerRef = useRef<any>(null);
  const drawingPathRef = useRef<any>(null);

  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  const [mathInput, setMathInput] = useState<{ x: number, y: number } | null>(null);
  const [mathValue, setMathValue] = useState('');

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // Initial size calculation for production stability
    setSize({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

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
    console.log('Stage Pointer Down - Drawing State:', isDrawing.current);
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      isDrawing.current = true;
      currentPoints.current = [[pos.x, pos.y]];
      updateDrawingPath();
    }
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

      const strokeAnno: StrokeAnnotation = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: 'stroke',
        points: normalizedPoints,
        color,
        width: strokeWidth,
        tool: activeTool as 'pen' | 'highlighter',
      };
      addAnnotation(strokeAnno);
    }

    currentPoints.current = [];
    if (drawingPathRef.current) {
      drawingPathRef.current.data('');
    }
    layerRef.current?.batchDraw();
  };

  const updateDrawingPath = () => {
    if (!drawingPathRef.current || !layerRef.current) return;
    const strokeOutline = getStroke(currentPoints.current, {
      size: strokeWidth * 2 * scaleFactor,
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
        onFinish: () => {
          node.to({ scaleX: 1, scaleY: 1, duration: 0.15 });
        }
      });
    }
  };

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    e.target.moveToTop();
    e.target.to({
      shadowBlur: 15,
      shadowOpacity: 0.3,
      duration: 0.2
    });
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
    el.style.position = 'absolute';
    el.style.top = '0px';
    el.style.left = '0px';
    el.style.zIndex = '-9999';
    el.style.display = 'inline-block';
    el.style.color = color;
    el.style.fontSize = `${strokeWidth * 5 + 16}px`;
    el.style.padding = '12px';
    el.style.fontFamily = 'Geist';
    document.body.appendChild(el);

    try {
      katex.render(mathValue, el, { throwOnError: false });
      await new Promise(r => setTimeout(r, 150)); // Increased timeout to ensure KaTeX renders fully

      let dataUrl = '';
      try {
        dataUrl = await htmlToImage.toPng(el, {
          backgroundColor: 'transparent',
          pixelRatio: 2.5,
          fontEmbedCSS: '', // Prevent fetching external fonts that may 404
        });
      } catch (imgErr) {
        console.warn("Primary image conversion failed, attempting fallback:", imgErr);
        dataUrl = await htmlToImage.toPng(el, {
          backgroundColor: 'transparent',
          pixelRatio: 2.5,
          fontEmbedCSS: '',
          filter: (node: any) => node.tagName !== 'LINK' && node.tagName !== 'STYLE'
        });
      }

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
        width={isMobile ? window.innerWidth : size.width}
        height={size.height}
        className="w-full h-full origin-top-left"
        style={{
          touchAction: (activeTool === 'pen' || activeTool === 'highlighter') ? 'none' : 'pan-y !important' as any
        }}
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
              const renderPoints = anno.points.map(([nx, ny]) => [
                nx * size.width,
                ny * size.height,
              ] as Point);

              const strokeOutline = getStroke(renderPoints, {
                size: anno.width * 2 * scaleFactor,
                thinning: 0.5,
                smoothing: 0.5,
                streamline: 0.5,
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
                    if (activeTool === 'eraser') {
                      e.cancelBubble = true;
                      removeAnnotation(anno.id);
                    } else if (activeTool === 'select') {
                      e.cancelBubble = true;
                      setSelectedAnnotationId(anno.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (activeTool === 'eraser') document.body.style.cursor = 'crosshair';
                    else if (activeTool === 'select') document.body.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => {
                    document.body.style.cursor = 'default';
                  }}
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
                  fontSize={anno.fontSize * scaleFactor}
                  fontFamily="Geist"
                  fontStyle="600"
                  draggable={activeTool === 'select'}
                  onDragStart={handleDragStart}
                  onDragEnd={(e) => handleDragEnd(e, anno.id)}
                  onClick={(e) => handleAnnotationClick(e, anno.id)}
                  onTap={(e) => handleAnnotationClick(e, anno.id)}
                  onPointerDown={(e) => {
                    if (activeTool === 'eraser') {
                      e.cancelBubble = true;
                      removeAnnotation(anno.id);
                    } else if (activeTool === 'select') {
                      e.cancelBubble = true;
                      setSelectedAnnotationId(anno.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (activeTool === 'eraser') document.body.style.cursor = 'crosshair';
                    else if (activeTool === 'select') document.body.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => {
                    document.body.style.cursor = 'default';
                  }}
                />
              );
            } else if (anno.type === 'math') {
              return (
                <MathNode
                  key={anno.id}
                  annotation={{ ...anno, ...shadowProps, draggable: activeTool === 'select' }}
                  size={size}
                  scaleFactor={scaleFactor}
                  listening={canInteractWithAnnotations}
                  onDragStart={handleDragStart}
                  onDragEnd={(e: any) => handleDragEnd(e, anno.id)}
                  onPointerDown={(e: any) => {
                    if (activeTool === 'eraser') {
                      e.cancelBubble = true;
                      removeAnnotation(anno.id);
                    } else if (activeTool === 'select') {
                      e.cancelBubble = true;
                      setSelectedAnnotationId(anno.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (activeTool === 'eraser') document.body.style.cursor = 'crosshair';
                    else if (activeTool === 'select') document.body.style.cursor = 'pointer';
                  }}
                  onMouseLeave={() => {
                    document.body.style.cursor = 'default';
                  }}
                />
              );
            }
            return null;
          })}

          <Path
            ref={drawingPathRef}
            data=""
            fill={color}
            opacity={activeTool === 'highlighter' ? 0.4 : 1}
          />
        </Layer>
      </Stage>

      {/* Overlays */}
      {textInput && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{ top: textInput.y, left: textInput.x, transform: 'translate(-8px, -8px)' }}
        >
          <textarea
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextSubmit}
            className="bg-white/95 backdrop-blur-xl border-2 border-blue-500 shadow-[0_20px_50px_rgba(37,99,235,0.2)] outline-none resize-none overflow-hidden rounded-2xl p-4 min-h-[3em] min-w-[200px] font-bold text-slate-800"
            style={{
              color: color,
              fontSize: `${strokeWidth * 3 + 12}px`,
              fontFamily: 'Geist',
            }}
            placeholder="Type something..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
          />
        </div>
      )}

      {mathInput && (
        <div
          className="absolute bg-white/80 backdrop-blur-3xl p-5 rounded-[24px] shadow-[0_32px_80px_rgba(0,0,0,0.15)] border border-white/50 flex flex-col gap-4 z-50 pointer-events-auto"
          style={{ top: mathInput.y + 10, left: mathInput.x }}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Math Editor</span>
            <input
              autoFocus
              value={mathValue}
              onChange={(e) => setMathValue(e.target.value)}
              placeholder="\int_0^\infty e^{-x^2} dx"
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-base outline-none focus:border-blue-500 font-mono text-slate-800 bg-slate-50/50 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleMathSubmit();
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="text-xs font-bold px-4 py-2 text-slate-500 hover:text-slate-800 transition-colors"
              onClick={() => setMathInput(null)}
            >
              Cancel
            </button>
            <button
              className="text-xs font-bold px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              onClick={handleMathSubmit}
            >
              Render Equation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
