
import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Share2, Sparkles, Loader2, Bot, Info, ShieldCheck, Zap, Copy, Check, MessageCircle } from 'lucide-react';
import { askAiForLineSharing } from '../services/geminiService';
import { fetchAllSpecifiedCollections } from '../services/firebase';
import { FirestoreDoc } from '../types';

interface LineAiBridgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LineAiBridgeDialog: React.FC<LineAiBridgeDialogProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResponse(null);
    }
  }, [isOpen]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const colNames = ['employees', 'departments', 'history', 'work_profiles', 'work_permissions'];
      const allData = await fetchAllSpecifiedCollections(colNames);
      const aiResponse = await askAiForLineSharing(allData, query);
      setResponse(aiResponse);
    } catch (error) {
      setResponse("เกิดข้อผิดพลาดในการรวบรวมข้อมูลเพื่อวิเคราะห์");
    } finally {
      setLoading(false);
    }
  };

  const shareToLine = () => {
    if (!response) return;
    const shareText = `🚀 *FireView AI Intelligence Update*\n\n${response}\n\n_รายงานโดย: OpenClaw AI Bridge_`;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank');
  };

  const copyToClipboard = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert("ไม่สามารถคัดลอกได้");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col h-[85vh] animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white rounded-t-[32px]">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-black text-xl tracking-tight">LINE AI Intelligence Bridge</h3>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">OpenClaw AI x LINE Communication</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50">
          
          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-black text-indigo-900 uppercase">สอบถามข้อมูลเพื่อส่งรายงาน LINE</h4>
            </div>
            
            <form onSubmit={handleAskAI} className="space-y-4">
              <div className="relative">
                <textarea 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="เช่น 'สรุปสถิติพนักงานลาป่วยเดือนนี้' หรือ 'วิเคราะห์สัดส่วนพนักงานตามวุฒิการศึกษาแยกแผนก'"
                  className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 min-h-[120px] resize-none"
                  disabled={loading}
                />
                <button 
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                <Info className="w-3.5 h-3.5" />
                <span>AI จะประมวลผลข้อมูลจากทุกแฟ้มประวัติเพื่อสร้างข้อความที่พร้อมแชร์</span>
              </div>
            </form>
          </div>

          {response && (
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xl animate-scale-in relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
                <Share2 className="w-48 h-48 text-emerald-900" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">LINE Optimized Output</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className={`p-2 rounded-lg border transition-all ${copySuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600'}`}
                      title="Copy to Clipboard"
                    >
                      {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-5 rounded-2xl border border-slate-100 italic">
                  {response}
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-3">
                  <button 
                    onClick={shareToLine}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <MessageCircle className="w-5 h-5" />
                    ส่งรายงานเข้า LINE ทันที
                  </button>
                  <button 
                    onClick={() => setResponse(null)}
                    className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    เริ่มใหม่
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="p-5 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center px-8 rounded-b-[32px] gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">End-to-End Encrypted Analysis</span>
          </div>
          <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">OpenClaw Engine v4.0.0-PRO</p>
        </div>
      </div>
    </div>
  );
};
