import React, { useState } from 'react';
import { X, Save, Braces } from 'lucide-react';

interface AddDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  collectionName: string;
}

export const AddDocumentDialog: React.FC<AddDocumentDialogProps> = ({ isOpen, onClose, onSave, collectionName }) => {
  const [jsonInput, setJsonInput] = useState('{\n  "name": "New Item",\n  "status": "active",\n  "createdAt": "2024-01-01"\n}');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);
    try {
      const parsedData = JSON.parse(jsonInput);
      setIsSaving(true);
      await onSave(parsedData);
      setIsSaving(false);
      onClose();
    } catch (e: any) {
      setIsSaving(false);
      if (e instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your syntax.");
      } else {
        setError(e.message || "Failed to save document.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Braces className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Add Document</h3>
              <p className="text-xs text-slate-500">To collection: <span className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{collectionName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          <label className="block text-sm font-medium text-slate-700 mb-2">JSON Data</label>
          <div className="relative">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 font-mono text-sm bg-purple-900 border border-purple-700 text-white placeholder-purple-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none leading-relaxed"
              spellCheck={false}
              placeholder="{ ... }"
            />
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-2">
              <span className="font-bold shrink-0">Error:</span> 
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm hover:shadow flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};