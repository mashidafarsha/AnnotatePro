import { EditorProvider } from './store/EditorContext';
import EditorLayout from './components/EditorLayout';

function App() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}

export default App;
