
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  requiredPin?: string; // Optional prop for security PIN
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = React.memo(({ 
  isOpen, 
  title, 
  message, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel,
  isProcessing,
  requiredPin
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      // Auto focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleConfirmClick = () => {
    if (requiredPin) {
      if (pin === requiredPin) {
        onConfirm();
      } else {
        setError(true);
        setPin(''); // Clear input on error
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmClick();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm border border-white/20 overflow-hidden animate-scale-in">
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${requiredPin ? 'bg-indigo-600 text-white' : 'bg-red-100 text-red-600'}`}>
            {requiredPin ? (
               <Lock className="w-8 h-8" />
            ) : (
               <AlertTriangle className="w-8 h-8" />
            )}
          </div>
          
          <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-sm font-bold text-slate-400 leading-relaxed mb-8">
            {message}
          </p>

          {requiredPin && (
            <div className="w-full mb-8">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 text-center">
                Master Security PIN
              </label>
              <input
                ref={inputRef}
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(false); }}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className={`w-full text-center p-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 font-mono text-3xl tracking-[0.5em] transition-all ${
                  error 
                  ? 'border-red-300 ring-red-100 text-red-600 placeholder-red-200' 
                  : 'border-slate-100 focus:ring-indigo-100 text-indigo-900'
                }`}
                autoFocus
                autoComplete="off"
                inputMode="numeric"
              />
              {error && (
                <p className="text-xs text-red-500 font-black uppercase mt-3 animate-shake">
                  รหัส PIN ไม่ถูกต้อง
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleConfirmClick}
              disabled={isProcessing || (!!requiredPin && pin.length === 0)}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-20 uppercase tracking-widest text-xs active:scale-95"
            >
              {isProcessing ? 'Processing...' : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">FireView Security Access Control</p>
        </div>
      </div>
    </div>
  );
});
