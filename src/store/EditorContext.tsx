import { create } from 'zustand';

export type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text' | 'math';
export type Point = [number, number];
export type AnnotationType = 'stroke' | 'text' | 'math';

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  visible?: boolean;
}

export interface StrokeAnnotation extends BaseAnnotation {
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter';
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface MathAnnotation extends BaseAnnotation {
  type: 'math';
  latex: string;
  imageSrc: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Annotation = StrokeAnnotation | TextAnnotation | MathAnnotation;

interface EditorState {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
  clearAnnotations: () => void;
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;
  annotations: Annotation[];
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  toggleVisibility: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: Annotation[];
  redoStack: Annotation[];
}

export const useEditor = create<EditorState>((set) => ({
  activeTool: 'pen',
  setActiveTool: (tool) => set({ activeTool: tool }),
  color: '#2563eb',
  setColor: (color) => set({ color }),
  strokeWidth: 2.5,
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  backgroundImage: '/blueprint.png',
  setBackgroundImage: (backgroundImage) => set({ backgroundImage }),

  selectedAnnotationId: null,
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),

  annotations: [],
  history: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  clearAnnotations: () => set({ annotations: [], history: [], redoStack: [], canUndo: false, canRedo: false }),

  addAnnotation: (annotation) => set((state) => {
    const next = [...state.annotations, annotation];
    return {
      annotations: next,
      history: next,
      redoStack: [],
      canUndo: next.length > 0,
      canRedo: false
    };
  }),

  updateAnnotation: (id, updates) => set((state) => {
    const next = state.annotations.map(a => a.id === id ? { ...a, ...updates } as Annotation : a);
    return {
      annotations: next,
      history: next,
      redoStack: [],
      canUndo: next.length > 0,
      canRedo: false
    };
  }),

  removeAnnotation: (id) => set((state) => {
    const next = state.annotations.filter(a => a.id !== id);
    return {
      annotations: next,
      history: next,
      redoStack: [],
      canUndo: next.length > 0,
      canRedo: false
    };
  }),

  toggleVisibility: (id) => set((state) => {
    const next = state.annotations.map(a => a.id === id ? { ...a, visible: a.visible === false } : a);
    return {
      annotations: next,
      history: next,
      redoStack: [],
      canUndo: next.length > 0,
      canRedo: false
    };
  }),

  undo: () => set((state) => {
    if (state.annotations.length === 0) return state;
    const newAnnotations = [...state.annotations];
    const popped = newAnnotations.pop();
    if (!popped) return state;
    const nextRedo = [...state.redoStack, popped];
    return {
      annotations: newAnnotations,
      history: newAnnotations,
      redoStack: nextRedo,
      canUndo: newAnnotations.length > 0,
      canRedo: nextRedo.length > 0
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const newRedo = [...state.redoStack];
    const popped = newRedo.pop();
    if (!popped) return state;
    const nextAnnos = [...state.annotations, popped];
    return {
      annotations: nextAnnos,
      history: nextAnnos,
      redoStack: newRedo,
      canUndo: nextAnnos.length > 0,
      canRedo: newRedo.length > 0
    };
  }),
}));

// Provide a dummy EditorProvider to avoid breaking existing imports
export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
