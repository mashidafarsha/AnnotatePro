import React, { useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

interface MathNodeProps {
  annotation: any;
  size: { width: number; height: number };
  responsiveScale: number;
  onPointerDown: any;
  onMouseEnter: any;
  onMouseLeave: any;
  onDragStart?: any;
  onDragEnd?: any;
  listening?: boolean;
}

export const MathNode: React.FC<MathNodeProps> = ({
  annotation,
  size,
  responsiveScale,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  listening
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
