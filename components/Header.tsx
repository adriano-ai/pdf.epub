import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <BookOpen className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PDF<span className="text-emerald-600">.ai</span></h1>
            <p className="text-xs text-slate-500 hidden sm:block">Editor de Texto Inteligente</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            <Sparkles className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-xs font-medium text-emerald-700">Powered by Gemini 2.5</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;