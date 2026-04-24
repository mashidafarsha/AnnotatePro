import { MousePointer2, Pen, Highlighter, Eraser, Type, FunctionSquare } from 'lucide-react';
import type { Tool } from '../store/EditorContext';

export const TOOLS = [
  { id: 'select' as Tool, icon: MousePointer2, label: 'Select' },
  { id: 'pen' as Tool, icon: Pen, label: 'Pen' },
  { id: 'highlighter' as Tool, icon: Highlighter, label: 'Highlighter' },
  { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
  { id: 'text' as Tool, icon: Type, label: 'Text' },
  { id: 'math' as Tool, icon: FunctionSquare, label: 'Math' },
];

export const COLORS = [
  { value: '#007AFF', label: 'Electric Blue' },
  { value: '#34C759', label: 'Green' },
  { value: '#FF9500', label: 'Orange' },
  { value: '#FF3B30', label: 'Red' },
  { value: '#000000', label: 'Black' },
];
