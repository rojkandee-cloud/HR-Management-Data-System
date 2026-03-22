
import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, AlertTriangle, CheckCircle, Volume2, VolumeX, Sparkles, MessageSquare, Mic, Database, Cpu, HardDrive, BarChart3 } from 'lucide-react';
import { FirestoreDoc } from '../types';

interface AiAssistantProps {
  documents: FirestoreDoc[];
  isOnline: boolean;
}

interface AuditIssue {
  id: string;
  name: string;
  issue: string;
  suggestion: string;
  severity: 'high' | 'medium' | 'low';
}

interface StorageStats {
  totalBytes: number;
  totalMB: string;
  documentCount: number;
  imageCount: number;
  memoryUsageMB?: string; // Browser memory
  percentageUsed: number; // Based on 1GB Free Tier Estimate
  status: 'Healthy' | 'Warning' | 'Critical';
}

const FIRESTORE_FREE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GiB

export const AiAssistant: React.FC<AiAssistantProps> = ({ documents, isOnline }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mute, setMute] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [message, setMessage] = useState<string>("สวัสดีครับ ผมคือ AI ผู้ช่วยตรวจสอบข้อมูลของคุณ");
  
  // Audio Permission State (Browser Autoplay Policy)
  const [audioPermission, setAudioPermission] = useState(false);
  
  // Ref to store utterance to prevent Garbage Collection issues in Chrome
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Helper to find Thai Voice
  const getThaiVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // Prioritize Google Thai, then any th-TH, then any voice with 'Thai' in name
    return voices.find(v => v.name === 'Google Thai' || v.lang === 'th-TH') || 
           voices.find(v => v.lang.includes('th')) || null;
  };

  // Ensure voices are loaded (Chrome compatibility)
  useEffect(() => {
    const handleVoicesChanged = () => {
       window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    // Initial fetch
    handleVoicesChanged();
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Voice Synthesis Setup
  const speak = (text: string) => {
    if (mute || !window.speechSynthesis) return;
    
    // Cancel previous speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH'; // Set to Thai
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Explicitly set voice if found
    const thaiVoice = getThaiVoice();
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      setIsSpeaking(false);
    };

    // Store ref to prevent GC
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // 1. Initial Permission Request & Welcome
  useEffect(() => {
    // If permission granted and haven't welcomed, do it.
    if (audioPermission && !hasWelcomed) {
      const timer = setTimeout(() => {
        const welcomeMsg = "ยินดีต้อนรับเข้าสู่ระบบ FireView ครับ ระบบพร้อมทำงานแล้ว";
        setMessage(welcomeMsg);
        speak(welcomeMsg); 
        setHasWelcomed(true);
      }, 800); // Slightly longer delay to ensure first audio finishes
      return () => clearTimeout(timer);
    }
  }, [audioPermission, hasWelcomed, mute]);

  const grantAudioPermission = () => {
    // Trigger an audible speak to unlock audio context and confirm to user
    // Bypass normal speak function momentarily to force volume 1 regardless of mute state logic
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("ระบบเสียงเปิดใช้งานแล้ว");
    u.lang = 'th-TH';
    u.volume = 1;
    
    const thaiVoice = getThaiVoice();
    if (thaiVoice) u.voice = thaiVoice;

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    
    setAudioPermission(true);
  };

  // Helper: Calculate Data Size
  const calculateStorageUsage = (docs: FirestoreDoc[]): StorageStats => {
    let totalBytes = 0;
    let imageCount = 0;

    docs.forEach(doc => {
      // Crude estimation: stringify the JSON
      const docString = JSON.stringify(doc);
      totalBytes += new TextEncoder().encode(docString).length;

      // Check specifically for Base64 images to count them
      Object.values(doc).forEach(value => {
        if (typeof value === 'string' && value.startsWith('data:image')) {
          imageCount++;
        }
      });
    });

    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const percentage = (totalBytes / FIRESTORE_FREE_LIMIT_BYTES) * 100;
    
    // Browser Memory (Chrome specific)
    let memoryUsageMB = undefined;
    if ((performance as any).memory) {
      const usedJSHeapSize = (performance as any).memory.usedJSHeapSize;
      memoryUsageMB = (usedJSHeapSize / (1024 * 1024)).toFixed(1);
    }

    return {
      totalBytes,
      totalMB,
      documentCount: docs.length,
      imageCount,
      memoryUsageMB,
      percentageUsed: percentage,
      status: percentage > 80 ? 'Critical' : percentage > 50 ? 'Warning' : 'Healthy'
    };
  };

  // 2. Audit Logic
  const performAudit = () => {
    const newIssues: AuditIssue[] = [];
    const currentYear = new Date().getFullYear();
    const newStats = calculateStorageUsage(documents);
    setStats(newStats);

    documents.forEach(doc => {
      // Check 1: ID Card
      if (!doc.idCardNumber || doc.idCardNumber.length < 13) {
        newIssues.push({
          id: doc.id,
          name: doc.fullName || 'ไม่ระบุชื่อ',
          issue: 'เลขบัตรประชาชนไม่ครบถ้วน',
          suggestion: 'กรุณาตรวจสอบและกรอกเลขบัตรประชาชนให้ครบ 13 หลัก',
          severity: 'high'
        });
      }

      // Check 2: Age (Child Labor Law)
      if (doc.birthDateISO) {
        const birthYear = new Date(doc.birthDateISO).getFullYear();
        const age = currentYear - birthYear;
        if (age < 18) {
          newIssues.push({
            id: doc.id,
            name: doc.fullName,
            issue: `อายุ ${age} ปี (ต่ำกว่าเกณฑ์แรงงาน)`,
            suggestion: 'พนักงานมีอายุต่ำกว่า 18 ปี โปรดตรวจสอบกฎหมายแรงงานหรือขอเอกสารยินยอมจากผู้ปกครอง',
            severity: 'medium'
          });
        }
      } else {
         newIssues.push({
            id: doc.id,
            name: doc.fullName,
            issue: 'ไม่ระบุวันเกิด',
            suggestion: 'กรุณาระบุวันเกิดเพื่อคำนวณอายุงานและสิทธิประโยชน์',
            severity: 'medium'
         });
      }

      // Check 3: Missing Photos
      if (!doc.employeeImage) {
        newIssues.push({
          id: doc.id,
          name: doc.fullName,
          issue: 'ไม่มีรูปถ่ายพนักงาน',
          suggestion: 'ควรอัปโหลดรูปถ่ายเพื่อใช้ในการทำบัตรพนักงานและการยืนยันตัวตน',
          severity: 'low'
        });
      }
    });

    setIssues(newIssues);

    // AI Response logic
    if (newStats.percentageUsed > 80) {
      const msg = `แจ้งเตือน! พื้นที่เก็บข้อมูลใกล้เต็ม ใช้ไป ${newStats.totalMB} MB (${newStats.percentageUsed.toFixed(2)}%)`;
      setMessage(msg);
      speak(msg);
    } else if (newIssues.length > 0) {
      const highSev = newIssues.filter(i => i.severity === 'high').length;
      const msg = `ตรวจพบข้อผิดพลาด ${newIssues.length} รายการ และใช้พื้นที่ไป ${newStats.totalMB} MB ครับ`;
      setMessage(msg);
      speak(msg);
    } else {
      const msg = `ข้อมูลเรียบร้อยดีครับ ใช้พื้นที่ไป ${newStats.totalMB} MB จากโควต้าฟรี 1GB`;
      setMessage(msg);
      speak(msg);
    }
  };

  // Run audit when documents change, debounced
  useEffect(() => {
    if (documents.length > 0 && audioPermission) {
      const timer = setTimeout(() => {
        performAudit();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [documents, audioPermission]);

  return (
    <>
      {/* Permission Request Toast (Relative to top area now, but fixed ensures visibility) */}
      {!audioPermission && (
        <div className="fixed top-24 right-4 z-[100] animate-bounce-slow">
           <div className="bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 flex flex-col items-center gap-3 max-w-[200px]">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-800">อนุญาตใช้เสียง</h4>
                <p className="text-xs text-slate-500 leading-tight mt-1">เพื่อให้ AI พูดคุยกับคุณได้</p>
              </div>
              <button 
                onClick={grantAudioPermission}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                เปิดใช้งาน (Enable)
              </button>
           </div>
           {/* Triangle pointer pointing UP to the header button */}
           <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-l border-t border-indigo-200 rotate-45"></div>
        </div>
      )}

      {/* Main Container - Integrated in Header (Relative) */}
      <div className="relative z-50 flex items-center gap-2">
        
        {/* Chat Bubble (Dropdown Style) */}
        {audioPermission && (isOpen || isSpeaking) && (
          <div className="absolute top-12 right-0 w-64 bg-white p-4 rounded-2xl shadow-xl border border-indigo-100 z-[60] animate-fade-in-down origin-top-right">
             <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-indigo-100 rotate-45"></div>
             <div className="flex items-start gap-3">
               <div className={`p-2 rounded-full ${isSpeaking ? 'bg-indigo-100 animate-pulse' : 'bg-slate-100'}`}>
                 <Bot className="w-5 h-5 text-indigo-600" />
               </div>
               <div>
                 <p className="text-xs text-slate-700 leading-relaxed font-medium">
                   {message}
                 </p>
                 {issues.length > 0 && !isOpen && (
                    <button 
                      onClick={() => setIsOpen(true)}
                      className="text-[10px] text-indigo-600 font-bold mt-2 hover:underline flex items-center gap-1"
                    >
                      ดูรายละเอียด <MessageSquare className="w-3 h-3" />
                    </button>
                 )}
               </div>
             </div>
          </div>
        )}

        {/* Mute Toggle */}
        {audioPermission && (
             <button 
               onClick={() => setMute(!mute)}
               className="p-2 bg-white/50 hover:bg-white text-slate-500 rounded-lg shadow-sm border border-slate-200 transition-all"
               title={mute ? "Unmute Voice" : "Mute Voice"}
             >
               {mute ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
             </button>
        )}

        {/* Main Trigger Button (Header Style) */}
        <button 
        onClick={() => {
            if (!audioPermission) {
            grantAudioPermission();
            }
            setIsOpen(!isOpen);
            if (!isOpen) performAudit();
        }}
        className={`p-2 rounded-lg shadow-sm text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center relative border border-white/20 ${
            !audioPermission ? 'bg-slate-400' :
            (issues.length > 0 || (stats?.percentageUsed || 0) > 80) ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
        }`}
        title="AI Audit Assistant"
        >
        {!audioPermission ? <VolumeX className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        {audioPermission && (issues.length > 0) && (
            <span className="absolute -top-1 -right-1 bg-red-500 border-2 border-white text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {issues.length}
            </span>
        )}
        </button>
      </div>

      {/* Expanded Panel (Dropdown Modal from Header) */}
      {isOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-900/10 backdrop-blur-[1px]" onClick={() => setIsOpen(false)}>
           <div 
             className="absolute top-20 right-4 md:right-8 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in origin-top-right"
             onClick={(e) => e.stopPropagation()}
           >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                     <Sparkles className="w-5 h-5 text-yellow-300" />
                   </div>
                   <div>
                     <h3 className="font-bold text-base">AI Assistant Audit</h3>
                     <p className="text-xs text-indigo-100">ผู้ช่วยตรวจสอบข้อมูล & ระบบ</p>
                   </div>
                 </div>
                 <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto bg-slate-50 flex-1 space-y-4">
                 {!isOnline && (
                   <div className="p-3 bg-orange-100 border border-orange-200 text-orange-800 rounded-lg text-xs flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4" /> ระบบออฟไลน์: AI อาจทำงานได้ไม่เต็มประสิทธิภาพ
                   </div>
                 )}

                 {/* System Stats Card */}
                 {stats && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                         <Database className="w-4 h-4" /> ตรวจสอบพื้นที่ (Storage Health)
                       </h4>
                       
                       <div className="space-y-2">
                          {/* Storage Bar */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                               <span className="text-slate-600 font-semibold">Loaded Data Size</span>
                               <span className="font-mono text-slate-800">{stats.totalMB} MB</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                               <div 
                                 className={`h-full transition-all duration-500 ${
                                    stats.percentageUsed > 80 ? 'bg-red-500' : 
                                    stats.percentageUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                 }`} 
                                 style={{ width: `${Math.max(stats.percentageUsed, 1)}%` }}
                               ></div>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 text-right">
                              เทียบกับ Firestore Free Tier (1GB) ~ {stats.percentageUsed.toFixed(4)}%
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                             <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
                                <Cpu className="w-4 h-4 text-indigo-500 mb-1" />
                                <span className="text-[10px] text-slate-400">App Memory</span>
                                <span className="text-xs font-bold text-slate-700">{stats.memoryUsageMB || 'N/A'} MB</span>
                             </div>
                             <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
                                <HardDrive className="w-4 h-4 text-indigo-500 mb-1" />
                                <span className="text-[10px] text-slate-400">Items Loaded</span>
                                <span className="text-xs font-bold text-slate-700">{stats.documentCount} Docs</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* Issues List */}
                 {issues.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                     <CheckCircle className="w-12 h-12 mb-3 text-green-500 opacity-80" />
                     <h4 className="text-sm font-bold text-slate-700">เยี่ยมมาก!</h4>
                     <p className="text-xs">ไม่พบข้อผิดพลาดในข้อมูล</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        รายการที่ต้องตรวจสอบ ({issues.length})
                      </h4>
                      {issues.map((issue, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border bg-white shadow-sm flex gap-3 ${
                          issue.severity === 'high' ? 'border-red-200 border-l-4 border-l-red-500' : 
                          issue.severity === 'medium' ? 'border-amber-200 border-l-4 border-l-amber-500' :
                          'border-blue-200 border-l-4 border-l-blue-500'
                        }`}>
                          <div className="mt-0.5">
                             {issue.severity === 'high' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                             {issue.severity === 'medium' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                             {issue.severity === 'low' && <AlertTriangle className="w-5 h-5 text-blue-500" />}
                          </div>
                          <div>
                            <div className="flex justify-between items-start">
                               <h5 className="font-bold text-sm text-slate-800">{issue.name}</h5>
                               <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                 issue.severity === 'high' ? 'bg-red-100 text-red-600' :
                                 issue.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                                 'bg-blue-100 text-blue-600'
                               }`}>
                                 {issue.severity}
                               </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-600 mt-1">{issue.issue}</p>
                            <div className="mt-2 text-xs bg-slate-50 p-2 rounded text-slate-500 italic">
                               💡 {issue.suggestion}
                            </div>
                          </div>
                        </div>
                      ))}
                   </div>
                 )}
              </div>

              {/* Footer Actions */}
              <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center">
                 <span className="text-[10px] text-slate-400">System Monitor Active</span>
                 <button 
                   onClick={performAudit}
                   className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                 >
                   <BarChart3 className="w-3 h-3" /> ตรวจสอบอีกครั้ง
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};
