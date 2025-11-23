import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const borders = {
    success: "border-emerald-100 bg-emerald-50",
    error: "border-red-100 bg-red-50",
    info: "border-blue-100 bg-blue-50"
  };

  return (
    <div className={`flex items-start p-4 mb-3 rounded-lg border shadow-lg max-w-sm w-full animate-[slideIn_0.3s_ease-out] ${borders[toast.type]}`}>
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 mr-2">
        <p className="text-sm font-medium text-slate-800">{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;