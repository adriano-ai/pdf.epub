import React, { useState, useRef, useCallback } from 'react';
import { FileText, Download, Wand2, Eraser, Settings, Book, FileType } from 'lucide-react';
import Header from './components/Header';
import Button from './components/Button';
import Toast from './components/Toast';
import { AIActionType, ToastMessage } from './types';
import { processTextWithAI } from './services/geminiService';
import { generatePDF, generateEPUB } from './utils/generators';

function App() {
  const [text, setText] = useState<string>('');
  const [title, setTitle] = useState<string>('Meu Documento');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setWordCount(newText.trim() === '' ? 0 : newText.trim().split(/\s+/).length);
  };

  const handleAIAction = async (action: AIActionType) => {
    if (!text.trim()) {
      addToast("Digite algum texto primeiro!", "info");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processTextWithAI(text, action);
      setText(result);
      addToast("Texto processado com sucesso!", "success");
    } catch (error) {
      addToast("Erro ao processar texto. Tente novamente.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPDF = () => {
    if (!text.trim()) {
      addToast("Nada para exportar!", "error");
      return;
    }
    try {
      generatePDF(text, title);
      addToast("PDF gerado com sucesso!", "success");
    } catch (e) {
      addToast("Erro ao gerar PDF", "error");
    }
  };

  const handleExportEPUB = async () => {
    if (!text.trim()) {
      addToast("Nada para exportar!", "error");
      return;
    }
    try {
      await generateEPUB(text, title);
      addToast("EPUB gerado com sucesso!", "success");
    } catch (e) {
      addToast("Erro ao gerar EPUB", "error");
    }
  };

  const clearText = () => {
    if (window.confirm("Tem certeza que deseja limpar todo o texto?")) {
      setText('');
      setWordCount(0);
      setTitle('Meu Documento');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Title Input */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label htmlFor="doc-title" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Título do Documento
          </label>
          <input 
            type="text" 
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-slate-800 border-none p-0 focus:ring-0 placeholder-slate-300"
            placeholder="Digite o título aqui..."
          />
        </div>

        {/* Action Toolbar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center justify-between sticky top-20 z-40 transition-shadow duration-300">
          <div className="flex flex-wrap gap-2">
            <div className="group relative">
               <Button 
                variant="primary" 
                icon={<Wand2 className="w-4 h-4" />}
                onClick={() => handleAIAction(AIActionType.IMPROVE)}
                isLoading={isProcessing}
                className="w-full sm:w-auto"
              >
                Melhorar Texto
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => handleAIAction(AIActionType.CORRECT)}
              disabled={isProcessing}
              className="hidden sm:inline-flex"
            >
              Corrigir Gramática
            </Button>
            
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <Button 
              variant="outline" 
              onClick={() => handleAIAction(AIActionType.SUMMARIZE)}
              disabled={isProcessing}
              title="Resumir"
            >
              Resumir
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
             <Button 
              variant="secondary" 
              icon={<FileType className="w-4 h-4" />}
              onClick={handleExportPDF}
              title="Exportar PDF"
            >
              PDF
            </Button>
             <Button 
              variant="secondary" 
              icon={<Book className="w-4 h-4" />}
              onClick={handleExportEPUB}
              title="Exportar EPUB"
            >
              EPUB
            </Button>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-grow relative bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <span className="text-xs font-medium text-slate-500">Editor</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">{wordCount} palavras</span>
              <button 
                onClick={clearText} 
                className="text-slate-400 hover:text-red-500 transition-colors" 
                title="Limpar tudo"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Cole ou digite seu texto aqui..."
            className="flex-grow w-full p-6 resize-none focus:outline-none text-slate-700 text-lg leading-relaxed rounded-b-xl"
            spellCheck={false}
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                <p className="text-sm font-medium text-emerald-800 animate-pulse">A IA está trabalhando...</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile-only secondary actions */}
        <div className="sm:hidden grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => handleAIAction(AIActionType.CORRECT)}
            disabled={isProcessing}
            className="w-full justify-center"
          >
            Corrigir
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleAIAction(AIActionType.EXPAND)}
            disabled={isProcessing}
            className="w-full justify-center"
          >
            Expandir
          </Button>
        </div>

      </main>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
        <div className="pointer-events-auto">
          {toasts.map(toast => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
      
    </div>
  );
}

export default App;