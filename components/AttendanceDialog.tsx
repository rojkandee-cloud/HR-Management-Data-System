
import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, UserCheck, AlertTriangle, Fingerprint, Save, Search, User, History, Calendar, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Ban, Lock, LogOut, Sparkles, Unlock } from 'lucide-react';
import { fetchCollectionData, addDocumentToCollection, fetchAllSpecifiedCollections } from '../services/firebase';
import { FirestoreDoc, HolidayData, AttendanceRecord } from '../types';

interface AttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  currentUser?: FirestoreDoc | null;
  onLogout?: () => void;
  onAdminUnlock?: () => void;
}

export const AttendanceDialog: React.FC<AttendanceDialogProps> = ({ 
  isOpen, 
  onClose, 
  isAdmin = false, 
  currentUser = null,
  onLogout,
  onAdminUnlock
}) => {
  const [employees, setEmployees] = useState<FirestoreDoc[]>([]);
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [action, setAction] = useState<'เข้าทำงาน' | 'ออกงาน' | 'เริ่ม_OT' | 'เลิก_OT'>('เข้าทำงาน');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    let timer: any;
    if (isOpen) {
      timer = setInterval(() => setCurrentTime(new Date()), 1000);
      loadInitialData();
      setLastSuccess(null);
      
      if (!isAdmin && currentUser) {
        setSelectedEmployeeId(currentUser.employeeId || currentUser.id);
      }
    }
    return () => clearInterval(timer);
  }, [isOpen, isAdmin, currentUser]);

  const playCuteVoice = (actionType: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    
    let message = "บันทึกข้อมูลเรียบร้อยแล้วค่ะ";
    if (actionType === 'เข้าทำงาน') {
      message = "ยินดีต้อนรับเข้าทำงานค่ะ ขอให้คุณสนุกกับการทำงานนะคะ";
    } else if (actionType === 'ออกงาน') {
      message = "เลิกงานแล้ว พักผ่อนให้เต็มที่นะคะ เจอกันใหม่พรุ่งนี้ค่ะ";
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'th-TH';
    
    // Adjust for a "Cute Child" effect
    utterance.pitch = 1.8; // High pitch
    utterance.rate = 1.05; // Natural but lively speed
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.includes('th'));
    if (thaiVoice) utterance.voice = thaiVoice;

    window.speechSynthesis.speak(utterance);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSpecifiedCollections(['employees', 'work_timing', 'attendance']);
      setEmployees(data['employees'] || []);
      setHolidays((data['work_timing'] || []) as unknown as HolidayData[]);
      setLogs((data['attendance'] || []) as unknown as AttendanceRecord[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId || e.employeeId === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const isWorkingDay = useMemo(() => {
    const todayISO = currentTime.toISOString().split('T')[0];
    const isSunday = currentTime.getDay() === 0;
    const isHoliday = holidays.some(h => h.date === todayISO && (h.type === 'HD2' || h.type === 'HD3'));
    return !isSunday && !isHoliday;
  }, [currentTime, holidays]);

  const availableActions = useMemo(() => {
    if (!selectedEmployeeId) return [];

    const hour = currentTime.getHours();
    const min = currentTime.getMinutes();
    const totalMins = hour * 60 + min;
    const todayISO = currentTime.toISOString().split('T')[0];
    
    // กรองประวัติของพนักงานคนนี้ในวันนี้ (ป้องกันการลงซ้ำ)
    const todayLogs = logs.filter(l => 
        (l.employeeId === selectedEmployeeId || l.employeeId === selectedEmployee?.employeeId) && 
        l.date === todayISO
    );

    const hasIn = todayLogs.some(l => l.action === 'เข้าทำงาน');
    const hasOut = todayLogs.some(l => l.action === 'ออกงาน');
    const hasOtStart = todayLogs.some(l => l.action === 'เริ่ม_OT');
    const hasOtEnd = todayLogs.some(l => l.action === 'เลิก_OT');

    const isRound1 = totalMins >= 360 && totalMins <= 540;   
    const isRound2 = totalMins >= 750 && totalMins <= 825;   
    const isRound3 = totalMins >= 1065 && totalMins <= 1125; 

    const isCheckInWindow = isRound1 || isRound2 || isRound3;
    const isOTTime = !isWorkingDay || (hour >= 17 || hour < 6);
    
    const actions: ('เข้าทำงาน' | 'ออกงาน' | 'เริ่ม_OT' | 'เลิก_OT')[] = [];

    // เงื่อนไข: เข้าทำงาน (ต้องยังไม่เคยลงวันนี้)
    if (isWorkingDay && isCheckInWindow && !hasIn) {
      actions.push('เข้าทำงาน');
    }
    
    // เงื่อนไข: ออกงาน (ต้องเคยเข้าแล้ว และยังไม่เคยออกวันนี้)
    if (isWorkingDay && hasIn && !hasOut) {
      actions.push('ออกงาน');
    }
    
    // เงื่อนไข: OT (ต้องยังไม่เคยลงซ้ำประเภทเดิมวันนี้)
    if (isOTTime) {
      const prioritizeShiftStart = isWorkingDay && isRound3 && !hasIn;
      if (!prioritizeShiftStart) {
        if (!hasOtStart) actions.push('เริ่ม_OT');
        else if (hasOtStart && !hasOtEnd) actions.push('เลิก_OT');
      } else {
        if (!hasIn) actions.push('เข้าทำงาน');
      }
    }
    return actions;
  }, [selectedEmployeeId, currentTime, logs, isWorkingDay, selectedEmployee]);

  useEffect(() => {
    if (availableActions.length > 0) {
      if (!availableActions.includes(action)) {
        setAction(availableActions[0]);
      }
    }
  }, [availableActions, action]);

  const handleSubmit = async () => {
    if (!selectedEmployeeId || submitting) return;

    setSubmitting(true);
    try {
      const hours = currentTime.getHours();
      const mins = currentTime.getMinutes();
      const totalMins = hours * 60 + mins;
      let workStatus: AttendanceRecord['workStatus'] = 'นอกเวลาปกติ (รออนุมัติ)';
      
      if (isWorkingDay && (action === 'เข้าทำงาน' || action === 'ออกงาน')) {
        if ((totalMins >= 360 && totalMins <= 540) || (totalMins >= 750 && totalMins <= 825) || (totalMins >= 1065 && totalMins <= 1125) || (hours >= 16 && hours <= 18)) {
          workStatus = 'ทำงานปกติ';
        }
      }

      let remarks = '-';
      if (action === 'เข้าทำงาน') {
        if (hours === 8 && mins > 5) remarks = 'เข้าสาย (รอบ 1)';
        if (hours === 13 && mins > 0) remarks = 'เข้าสาย (รอบ 2)';
        if (hours === 18 && mins > 0) remarks = 'เข้าสาย (รอบ 3)';
      } else if (action === 'ออกงาน' && hours < 16) {
        remarks = 'ออกก่อนเวลา';
      }

      const payload: AttendanceRecord = {
        logCode: Math.floor(100000 + Math.random() * 900000).toString().replace(/(\d{2})(\d{4})/, '$1-$2'),
        employeeId: selectedEmployee?.employeeId || selectedEmployeeId,
        employeeName: selectedEmployee?.fullName || '',
        action,
        timestamp: currentTime.toISOString(),
        workStatus,
        remarks,
        date: currentTime.toISOString().split('T')[0],
        id: '' 
      };

      await addDocumentToCollection('attendance', payload);
      
      // Play Greeting Audio
      playCuteVoice(action);
      
      setLastSuccess(`บันทึก "${action}" เรียบร้อย`);
      await loadInitialData();
      if (isAdmin) setSelectedEmployeeId('');
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col h-[90vh] animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50 rounded-t-[40px]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <Fingerprint className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">ระบบยืนยันตัวตนและลงเวลา</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isAdmin ? 'ADMIN CONTROL MODE' : 'EMPLOYEE SELF-SERVICE'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {!isAdmin && (
               <>
                 <button 
                   onClick={onAdminUnlock}
                   className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                 >
                   <Unlock className="w-4 h-4" /> Admin Unlock
                 </button>
                 <button 
                   onClick={handleManualLogout}
                   className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                 >
                   <LogOut className="w-4 h-4" /> ออกจากระบบ
                 </button>
               </>
             )}
             <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
               <X className="w-8 h-8" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
           <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col gap-6 bg-white overflow-y-auto">
              
              <div className={`p-8 rounded-[32px] text-white text-center shadow-xl relative overflow-hidden transition-colors duration-500 ${isWorkingDay ? 'bg-slate-900' : 'bg-rose-900'}`}>
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-20 h-20" /></div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-2">Current System Time</p>
                 <h2 className="text-5xl font-mono font-black tracking-tighter">
                   {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                 </h2>
                 <div className="mt-4 flex items-center justify-center gap-3">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className="text-sm font-bold opacity-80">{currentTime.toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. ข้อมูลพนักงาน (Verified Identity)</label>
                    
                    {isAdmin ? (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <select 
                          value={selectedEmployeeId}
                          onChange={(e) => setSelectedEmployeeId(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-700 appearance-none cursor-pointer transition-all"
                        >
                          <option value="">-- เลือกพนักงานเพื่อลงเวลา --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.employeeId || emp.id}>{emp.fullName}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-5 bg-indigo-50 border-2 border-indigo-200 rounded-[28px] shadow-inner relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck className="w-12 h-12 text-indigo-900" /></div>
                         <div className="flex items-center gap-5">
                            <div className="relative">
                               <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-white shrink-0">
                                  {currentUser?.employeeImage ? <img src={currentUser.employeeImage} className="w-full h-full object-cover" /> : <User className="w-8 h-8 m-4 text-slate-100" />}
                               </div>
                               <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg border-2 border-white shadow-md">
                                  <Lock className="w-3 h-3" />
                               </div>
                            </div>
                            <div className="overflow-hidden">
                               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Authenticated Identity</p>
                               <h4 className="text-xl font-black text-indigo-900 leading-tight truncate">{currentUser?.fullName}</h4>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] font-mono font-black text-indigo-500 tracking-widest">{currentUser?.employeeId}</span>
                                  <span className="w-1 h-1 rounded-full bg-indigo-200"></span>
                                  <span className="text-[9px] font-black text-indigo-400 uppercase">{currentUser?.department}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Success Compact Card */}
                 {lastSuccess && (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-3xl animate-scale-in flex flex-col items-center text-center gap-3 shadow-lg shadow-emerald-100/50 max-w-[320px] mx-auto border-dashed">
                       <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-emerald-900 uppercase tracking-tight leading-none">{lastSuccess}</p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-1">ขอบคุณค่ะ! ข้อมูลของท่านถูกบันทึกแล้ว</p>
                       </div>
                       {!isAdmin && (
                         <button 
                           onClick={handleManualLogout}
                           className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-md hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                         >
                           <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ (Logout)
                         </button>
                       )}
                    </div>
                 )}

                 {!lastSuccess && selectedEmployee && (
                   <div className="space-y-4 animate-fade-in-down">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. ประเภทรายการ (ห้ามลงซ้ำประเภทเดิมในวันเดียว)</label>
                        {availableActions.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {availableActions.map((opt) => (
                              <button 
                                key={opt}
                                onClick={() => setAction(opt)}
                                className={`py-4 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${
                                  action === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className={`p-6 border rounded-3xl flex items-center gap-4 ${!isWorkingDay ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                             <AlertTriangle className="w-6 h-6 shrink-0" />
                             <div className="flex flex-col">
                                <p className="text-sm font-black uppercase leading-tight">
                                   ท่านลงรายการครบแล้ว หรืออยู่นอกเวลา
                                </p>
                                <p className="text-[10px] font-bold opacity-70 mt-1">
                                   ระบบไม่อนุญาตให้ลงประเภทรายการซ้ำเดิมในวันเดียวกัน
                                </p>
                             </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={handleSubmit}
                        disabled={submitting || availableActions.length === 0}
                        className="w-full py-5 bg-slate-900 text-white font-black rounded-[28px] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale active:scale-[0.98] uppercase tracking-[0.2em] text-xs mt-4"
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        ยืนยันการบันทึกเวลา
                      </button>
                   </div>
                 )}
              </div>
           </div>

           <div className="flex-1 bg-slate-50/50 p-8 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" /> ประวัติการลงเวลาวันนี้
                 </h4>
              </div>

              <div className="space-y-3">
                 {logs.filter(l => l.date === currentTime.toISOString().split('T')[0] && (l.employeeId === selectedEmployeeId || l.employeeId === selectedEmployee?.employeeId)).length === 0 ? (
                   <div className="text-center py-24 text-slate-300">
                      <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="font-black text-xs uppercase tracking-[0.3em]">ยังไม่มีประวัติในวันนี้</p>
                   </div>
                 ) : (
                   logs
                    .filter(l => l.date === currentTime.toISOString().split('T')[0] && (l.employeeId === selectedEmployeeId || l.employeeId === selectedEmployee?.employeeId))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((log) => (
                      <div key={log.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all animate-fade-in group">
                         <div className="flex items-center gap-5">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center font-mono font-black text-indigo-600 text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                               {log.logCode.split('-')[1]}
                            </div>
                            <div>
                               <h5 className="font-black text-slate-800 text-xs">{log.action}</h5>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-mono font-bold text-slate-400">
                                    เวลา {new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                  </span>
                               </div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              log.workStatus === 'ทำงานปกติ' ? 'text-emerald-500' : 'text-amber-500'
                            }`}>{log.workStatus}</span>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center px-10 text-slate-400">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Attendance Identity Verification Active</span>
           </div>
           <p className="text-[9px] font-black uppercase tracking-[0.4em]">FireView Identity Core v6.5</p>
        </div>
      </div>
    </div>
  );
};
