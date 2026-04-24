import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Stage, Layer, Path, Text } from 'react-konva';
import { useEditor, type Point } from '../store/EditorContext';
import { getStroke } from 'perfect-freehand';
import type { KonvaEventObject } from 'konva/lib/Node';
import katex from 'katex';
import * as htmlToImage from 'html-to-image';
import { getSvgPathFromStroke } from '../utils/canvasUtils';
import { MathNode } from './editor/Canvas/MathNode';
import { TextInput } from './editor/Canvas/TextInput';
import { MathInput } from './editor/Canvas/MathInput';

interface CanvasLayerProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const CanvasLayer: React.FC<CanvasLayerProps> = ({ containerRef }) => {
  const {
    activeTool, color, strokeWidth, annotations, addAnnotation, updateAnnotation, removeAnnotation,
    selectedAnnotationId, setSelectedAnnotationId
  } = useEditor();

  const [size, setSize] = useState({ width: 0, height: 0 });
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const drawingPathRef = useRef<any>(null);

  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [mathInput, setMathInput] = useState<{ x: number, y: number } | null>(null);
  const [mathValue, setMathValue] = useState('');

  const responsiveScale = React.useMemo(() => {
    return window.innerWidth < 768 ? 0.7 : 1;
  }, [size.width]);

  useEffect(() => {
    if (activeTool !== 'text') setTextInput(null);
    if (activeTool !== 'math') setMathInput(null);
  }, [activeTool]);

  // Size Correction Polling
  useEffect(() => {
    const timer = setInterval(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width !== size.width || rect.height !== size.height) {
          setSize({ width: rect.width, height: rect.height });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [size, containerRef]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerRef]);

  const getCursor = () => {
    switch (activeTool) {
      case 'pen':
      case 'highlighter':
        return 'crosshair';
      case 'eraser':
        return 'cell';
      case 'text':
      case 'math':
        return 'text';
      case 'select':
        return 'move';
      default:
        return 'default';
    }
  };

  const getRelativePointerPosition = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    return stage.getPointerPosition();
  };

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      e.evt.preventDefault();
      isDrawing.current = true;
      currentPoints.current = [[pos.x, pos.y]];
      updateDrawingPath();
    }
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawing.current) return;
    if (e.evt.cancelable) e.evt.preventDefault();

    const pos = getRelativePointerPosition();
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
      size: strokeWidth * 2, thinning: 0.5, smoothing: 0.5, streamline: 0.5,
    });

    const pathData = getSvgPathFromStroke(strokeOutline);
    drawingPathRef.current.data(pathData);
    drawingPathRef.current.fill(color);
    drawingPathRef.current.opacity(activeTool === 'highlighter' ? 0.4 : 1);
    layerRef.current.batchDraw();
  };

  const handleStageClick = () => {
    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'select') {
      setSelectedAnnotationId(null);
    } else if (activeTool === 'text') {
      if (!textInput) {
        setTextInput({ x: pos.x, y: pos.y });
        setTextValue('');
      }
    } else if (activeTool === 'math') {
      if (!mathInput) {
        setMathInput({ x: pos.x, y: pos.y });
        setMathValue('');
      }
    }
  };

  const handleAnnotationClick = (e: any, id: string) => {
    if (activeTool === 'eraser') {
      e.cancelBubble = true;
      removeAnnotation(id);
    } else if (activeTool === 'select') {
      e.cancelBubble = true;
      setSelectedAnnotationId(id);
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
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
      const dataUrl = await htmlToImage.toPng(el, { backgroundColor: 'transparent', pixelRatio: 2.5 });
      if (!dataUrl) throw new Error("Image data URL is empty");
      const rect = el.getBoundingClientRect();

      addAnnotation({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: 'math', latex: mathValue, imageSrc: dataUrl,
        x: mathInput.x / size.width, y: mathInput.y / size.height,
        width: rect.width, height: rect.height,
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
    <div
      className="absolute inset-0 z-[9999] pointer-events-auto"
      style={{ touchAction: 'none', cursor: getCursor() }}
    >
      <Stage
        ref={stageRef} width={size.width} height={size.height}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp} onClick={handleStageClick} onTap={handleStageClick}
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
                  key={anno.id} {...shadowProps} visible={isVisible}
                  listening={canInteractWithAnnotations} data={getSvgPathFromStroke(strokeOutline)}
                  fill={anno.color} opacity={anno.tool === 'highlighter' ? 0.35 : 1}
                  onClick={(e) => handleAnnotationClick(e, anno.id)} onTap={(e) => handleAnnotationClick(e, anno.id)}
                  onPointerDown={(e) => {
                    if (activeTool === 'eraser') { e.cancelBubble = true; removeAnnotation(anno.id); }
                    else if (activeTool === 'select') { e.cancelBubble = true; setSelectedAnnotationId(anno.id); }
                  }}
                />
              );
            } else if (anno.type === 'text') {
              return (
                <Text
                  key={anno.id} {...shadowProps} visible={isVisible}
                  listening={canInteractWithAnnotations} x={anno.x * size.width} y={anno.y * size.height}
                  text={anno.text} fill={anno.color} fontSize={anno.fontSize}
                  fontFamily="Geist" fontStyle="600" draggable={activeTool === 'select'}
                  onDragStart={(e) => e.target.moveToTop()} onDragEnd={(e) => handleDragEnd(e, anno.id)}
                  onClick={(e) => handleAnnotationClick(e, anno.id)} onTap={(e) => handleAnnotationClick(e, anno.id)}
                  onPointerDown={(e) => {
                    if (activeTool === 'eraser') { e.cancelBubble = true; removeAnnotation(anno.id); }
                    else if (activeTool === 'select') { e.cancelBubble = true; setSelectedAnnotationId(anno.id); }
                  }}
                />
              );
            } else if (anno.type === 'math') {
              return (
                <MathNode
                  key={anno.id} annotation={{ ...anno, ...shadowProps, draggable: activeTool === 'select' }}
                  size={size} responsiveScale={responsiveScale} listening={canInteractWithAnnotations}
                  onDragStart={(e: any) => e.target.moveToTop()} onDragEnd={(e: any) => handleDragEnd(e, anno.id)}
                  onPointerDown={(e: any) => {
                    if (activeTool === 'eraser') { e.cancelBubble = true; removeAnnotation(anno.id); }
                    else if (activeTool === 'select') { e.cancelBubble = true; setSelectedAnnotationId(anno.id); }
                  }}
                  onMouseEnter={() => { }} onMouseLeave={() => { }}
                />
              );
            }
            return null;
          })}
          <Path ref={drawingPathRef} data="" fill={color} opacity={activeTool === 'highlighter' ? 0.4 : 1} />
        </Layer>
      </Stage>

      {textInput && (
        <TextInput
          x={textInput.x} y={textInput.y} value={textValue}
          strokeWidth={strokeWidth} onChange={setTextValue} onSubmit={handleTextSubmit}
        />
      )}

      {mathInput && (
        <MathInput
          x={mathInput.x} y={mathInput.y} value={mathValue}
          onChange={setMathValue} onSubmit={handleMathSubmit} onCancel={() => setMathInput(null)}
        />
      )}
    </div>
  );
};
