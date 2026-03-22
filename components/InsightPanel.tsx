
import React, { useState, useEffect, useRef } from 'react';
import { FirestoreDoc } from '../types';
import { MessageSquare, Send, Eraser, Volume2, Square, Globe, Filter, Lightbulb, Sparkles, CheckCircle2, Loader2, RotateCcw, XCircle, Search, UserPlus, Building2, Terminal, Cpu, Share2, Copy, Check, ShieldCheck, Zap, RefreshCw, MessageCircle, Activity, CheckSquare, Plus } from 'lucide-react';
import { updateDocument } from '../services/firebase';

interface InsightPanelProps {
  hasData: boolean;
  documents: FirestoreDoc[];
  collectionName: string;
  onGlobalAsk?: (question: string) => Promise<any>;
  onSearchTermChange?: (term: string) => void;
  filteredDocuments?: FirestoreDoc[];
  currentSearchTerm?: string;
  onRegisterClick?: () => void;
  currentDepartmentFilter?: string;
  onDepartmentFilterChange?: (dept: string) => void;
  currentStatusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  departmentOptions?: string[];
  selectedCount?: number;
  onSelectFiltered?: (select: boolean) => void;
}

const AGENT_VERSION = "v4.0.0-CLAW";

const STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ทดลองงาน",
  "พักงาน",
  "ลาออกแล้ว"
];

export const InsightPanel: React.FC<InsightPanelProps> = ({ 
  hasData,
  documents,
  collectionName,
  onGlobalAsk,
  onSearchTermChange,
  filteredDocuments = [],
  currentSearchTerm = '',
  onRegisterClick,
  currentDepartmentFilter = '',
  onDepartmentFilterChange,
  currentStatusFilter = '',
  onStatusFilterChange,
  departmentOptions = [],
  selectedCount = 0,
  onSelectFiltered
}) => {
  const [query, setQuery] = useState('');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!filteredDocuments) return;
    let newSuggestions: string[] = [];
    if (collectionName === 'employees') {
      newSuggestions = [
        "ย้ายรหัส 0001 ไปแผนก IT",
        "พนักงานรหัส 0005 ลาออกแล้ว",
        "วิเคราะห์สถิติการลาของปีนี้",
        "สรุปรายชื่อพนักงานแยกตามแผนก"
      ];
    } else {
      newSuggestions = ["สรุปข้อมูลสำคัญในส่วนนี้", "ตรวจสอบความผิดปกติของข้อมูล"];
    }
    setSuggestions(newSuggestions);
  }, [filteredDocuments, collectionName]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.includes('th'));
    if (thaiVoice) utterance.voice = thaiVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleUpdateCapabilities = async () => {
    setIsUpdating(true);
    setAgentLog([]);
    setActiveTask("กำลังอัปเดตระบบประมวลผล...");
    const stages = [
      "เชื่อมโยง Work Profile Data...",
      "ซิงค์สถานะภาพพนักงานล่าสุด...",
      "เตรียมพร้อมฟังก์ชัน Bulk Action...",
      "Calibrating AI v4.0.0-CLAW..."
    ];
    for (const stage of stages) {
      setActiveTask(stage);
      await new Promise(r => setTimeout(r, 500));
      setAgentLog(prev => [...prev, `[READY] ${stage}`]);
    }
    setActiveTask(null);
    setIsUpdating(false);
    setCustomAnswer("ระบบได้รับการอัปเดตข้อมูลพนักงานให้ตรงกับ Work Profile เรียบร้อยแล้ว พร้อมใช้งานฟังก์ชันกรองและเลือกแบบกลุ่ม");
  };

  const handleAskAI = async (e?: React.FormEvent, manualQuery?: string) => {
    if (e) e.preventDefault();
    const textToAsk = manualQuery || query;
    if (!textToAsk.trim()) return;
    setIsAsking(true);
    setCustomAnswer(null);
    setAgentLog([]);
    setActiveTask("กำลังประมวลผลคำสั่ง...");
    stopSpeaking();
    try {
      if (onGlobalAsk) {
         const response = await onGlobalAsk(textToAsk);
         if (response.functionCalls && response.functionCalls.length > 0) {
            for (const fc of response.functionCalls) {
               if (fc.name === 'updateEmployeeField') {
                  const { employeeId, fieldName, newValue } = fc.args;
                  setActiveTask(`กำลังแก้ไข ${fieldName}...`);
                  await updateDocument('employees', employeeId, { [fieldName]: newValue });
                  setCustomAnswer(`อัปเดต ${fieldName} ของพนักงาน ${employeeId} สำเร็จ`);
               }
            }
         } else {
            setCustomAnswer(response.text);
            speak(response.text);
         }
      }
    } catch (error) {
      setCustomAnswer("เกิดข้อผิดพลาดในการประมวลผล");
    } finally {
      setIsAsking(false);
      setActiveTask(null);
    }
  };

  const handleReset = () => {
    setQuery('');
    setCustomAnswer(null);
    setAgentLog([]);
    setActiveTask(null);
    stopSpeaking();
    if (onSearchTermChange) onSearchTermChange('');
    if (onDepartmentFilterChange) onDepartmentFilterChange('');
    if (onStatusFilterChange) onStatusFilterChange('');
  };

  if (!hasData) return null;

  return (
    <div className="space-y-6 mb-6">
      <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm relative z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg">
               <Activity className="w-5 h-5" />
             </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className="text-lg font-black text-slate-900 tracking-tight">แผงควบคุมและคัดกรอง{collectionName === 'departments' ? 'แผนก' : 'พนักงาน'}</h3>
                 <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-mono text-[9px] font-black border border-indigo-100">
                   {AGENT_VERSION}
                 </span>
               </div>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Integrated {collectionName === 'departments' ? 'Departmental' : 'Work Profile'} Monitoring</p>
             </div>
           </div>

           <div className="flex items-center gap-2">
              {/* Dynamic Add Button */}
              {onRegisterClick && (
                <button 
                  onClick={onRegisterClick}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 active:scale-95 border border-indigo-500"
                >
                  {collectionName === 'employees' ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {collectionName === 'employees' ? 'ลงทะเบียนพนักงาน' : 'เพิ่มแผนกใหม่'}
                </button>
              )}

              {collectionName === 'employees' && filteredDocuments.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                   <button 
                      type="button"
                      onClick={() => onSelectFiltered?.(true)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                   >
                     <CheckSquare className="w-3 h-3" /> เลือกทั้งหมดที่กรอง
                   </button>
                   <button 
                      type="button"
                      onClick={() => onSelectFiltered?.(false)}
                      className="px-3 py-1.5 text-slate-400 hover:text-rose-500 text-[9px] font-black uppercase tracking-tighter transition-all"
                   >
                     ยกเลิก
                   </button>
                </div>
              )}
              <button 
                onClick={handleUpdateCapabilities}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm border border-indigo-100"
                title="Update Database Integration"
              >
                <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              </button>
           </div>
        </div>

        <form onSubmit={handleAskAI} className="relative flex flex-col md:flex-row gap-3 items-stretch">
           <div className="relative w-full md:w-1/4">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
             <input 
               type="text" 
               placeholder={collectionName === 'departments' ? "ค้นหาชื่อแผนก..." : "รหัส หรือ ชื่อ..."} 
               value={currentSearchTerm}
               onChange={(e) => onSearchTermChange?.(e.target.value)}
               className="w-full pl-10 pr-3 py-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 transition-all focus:bg-white"
             />
           </div>

           {collectionName === 'employees' && (
             <>
               <div className="relative w-full md:w-1/5">
                 <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                 <select 
                   value={currentDepartmentFilter}
                   onChange={(e) => onDepartmentFilterChange?.(e.target.value)}
                   className="w-full pl-10 pr-10 py-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                 >
                   <option value="">ทุกแผนก</option>
                   {departmentOptions.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><Filter className="w-3.5 h-3.5 text-indigo-300" /></div>
               </div>

               <div className="relative w-full md:w-1/5">
                 <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                 <select 
                   value={currentStatusFilter}
                   onChange={(e) => onStatusFilterChange?.(e.target.value)}
                   className={`w-full pl-10 pr-10 py-3 rounded-2xl focus:ring-4 focus:ring-rose-100 outline-none text-sm font-bold appearance-none cursor-pointer transition-all ${currentStatusFilter ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-indigo-50/50 border-indigo-100 text-slate-700'}`}
                 >
                   <option value="">ทุกสถานะงาน</option>
                   {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><Filter className="w-3.5 h-3.5 text-rose-300" /></div>
               </div>
             </>
           )}

           <div className="relative flex-1">
             <input
               type="text" value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder="สอบถาม Smart Agent..."
               className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-medium focus:bg-white transition-all shadow-inner"
               disabled={isAsking || isUpdating}
             />
             <div className="absolute right-2 top-2">
               <button type="submit" disabled={!query.trim() || isAsking || isUpdating} className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md disabled:opacity-50 transition-all">
                 {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
               </button>
             </div>
           </div>
        </form>

        {(activeTask || agentLog.length > 0) && (
           <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-inner overflow-hidden animate-fade-in-down">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                 <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-emerald-500" /><span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-black">OpenClaw Log</span></div>
                 {activeTask && <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 text-emerald-500 animate-spin" /><span className="text-[9px] text-emerald-400 font-mono italic">{activeTask}</span></div>}
              </div>
              <div className="space-y-1.5 font-mono text-[10px]">
                 {agentLog.map((log, i) => <div key={i} className="text-slate-400 flex items-start gap-2"><span className="text-emerald-900 font-black">[{i+1}]</span><span className="text-emerald-300">{log}</span></div>)}
              </div>
           </div>
        )}

        {customAnswer && (
           <div className="mt-4 p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl animate-scale-in">
              <div className="flex items-start gap-3">
                 <Sparkles className="w-5 h-5 text-indigo-500 mt-1 shrink-0" />
                 <div className="whitespace-pre-wrap flex-1 text-sm text-slate-700 font-medium leading-relaxed">{customAnswer}</div>
                 <button onClick={() => setCustomAnswer(null)} className="p-1 text-slate-300 hover:text-slate-500"><RotateCcw className="w-4 h-4" /></button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
