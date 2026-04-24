import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  points: Point[]; // normalized (0-1)
  color: string;
  width: number;
  tool: 'pen' | 'highlighter';
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  x: number; // normalized (0-1)
  y: number; // normalized (0-1)
  color: string;
  fontSize: number;
}

export interface MathAnnotation extends BaseAnnotation {
  type: 'math';
  latex: string;
  imageSrc: string; // base64 png
  x: number; // normalized (0-1)
  y: number; // normalized (0-1)
  width: number; // original pixel width for aspect ratio
  height: number; // original pixel height
}

export type Annotation = StrokeAnnotation | TextAnnotation | MathAnnotation;

interface EditorContextType {
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
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#2563eb'); // blue-600
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [backgroundImage, setBackgroundImage] = useState<string | null>('/blueprint.png');

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  const [historyState, setHistoryState] = useState<{ history: Annotation[], redoStack: Annotation[] }>({
    history: [],
    redoStack: [],
  });

  const annotations = historyState.history;

  const clearAnnotations = useCallback(() => {
    setHistoryState({ history: [], redoStack: [] });
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setHistoryState((prev) => ({
      history: [...prev.history, annotation],
      redoStack: [],
    }));
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setHistoryState((prev) => ({
      history: prev.history.map(a =>
        a.id === id ? { ...a, ...updates } as Annotation : a
      ),
      redoStack: [],
    }));
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setHistoryState((prev) => ({
      history: prev.history.filter(a => a.id !== id),
      redoStack: [],
    }));
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setHistoryState((prev) => ({
      history: prev.history.map(a =>
        a.id === id ? { ...a, visible: a.visible === false ? true : false } : a
      ),
      redoStack: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.history.length === 0) return prev;
      const newHistory = [...prev.history];
      const popped = newHistory.pop();
      if (!popped) return prev;

      return {
        history: newHistory,
        redoStack: [...prev.redoStack, popped]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.redoStack.length === 0) return prev;
      const newRedo = [...prev.redoStack];
      const popped = newRedo.pop();
      if (!popped) return prev;

      return {
        history: [...prev.history, popped],
        redoStack: newRedo
      };
    });
  }, []);

  // Global hotkeys for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y') {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <EditorContext.Provider
      value={{
        activeTool, setActiveTool, color, setColor, strokeWidth, setStrokeWidth,
        backgroundImage, setBackgroundImage, clearAnnotations,
        selectedAnnotationId, setSelectedAnnotationId,
        annotations, addAnnotation, updateAnnotation, removeAnnotation, toggleVisibility, undo, redo,
        canUndo: historyState.history.length > 0,
        canRedo: historyState.redoStack.length > 0
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
