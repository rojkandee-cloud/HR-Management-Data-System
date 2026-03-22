
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Calendar, Clock, FileText, CheckCircle, XCircle, PenTool, Share2, History, PlusCircle, AlertCircle, ChevronLeft, PieChart, WifiOff, ChevronRight, CalendarDays, List as ListIcon, Info } from 'lucide-react';
import { addDocumentToCollection, getDocumentsByField, setDocumentWithId, fetchCollectionData } from '../services/firebase';
import { LeaveRequest, HolidayData } from '../types';

interface LeaveHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

type Mode = 'menu' | 'request' | 'history' | 'approve';
type ViewFormat = 'list' | 'calendar';

export const LeaveHistoryDialog: React.FC<LeaveHistoryDialogProps> = ({ isOpen, onClose, employeeId, employeeName }) => {
  const [mode, setMode] = useState<Mode>('menu');
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // History View State
  const [viewFormat, setViewFormat] = useState<ViewFormat>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Request Form State
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({
    leaveType: 'Sick',
    startDateTime: '',
    endDateTime: '',
    leaveReason: '',
  });
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  // Approval State
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [rejectionReason, setRejectionReason] = useState('');

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Connectivity Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadHistoryInternal = useCallback(async () => {
    if (!employeeId) return;
    try {
      const docs = await getDocumentsByField('history', 'employeeId', employeeId);
      const data = docs.map(d => d as unknown as LeaveRequest);
      data.sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  }, [employeeId]);

  const loadHolidays = useCallback(async () => {
    try {
      const data = await fetchCollectionData('work_timing');
      setHolidays(data as unknown as HolidayData[]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode('menu');
      setViewFormat('list');
      setCalendarDate(new Date());
      setFormData({ leaveType: 'Sick', startDateTime: '', endDateTime: '', leaveReason: '' });
      setSignatureData(null);
      setHistory([]);
      loadHistoryInternal();
      loadHolidays();
    }
  }, [isOpen, loadHistoryInternal, loadHolidays]);

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "0 วัน 0 ชม.";
    const s = new Date(start);
    const e = new Date(end);
    if (e <= s) return "ข้อมูลเวลาไม่ถูกต้อง";
    const diffMs = e.getTime() - s.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} วัน ${hours} ชม.`;
  };

  const getLeaveStats = () => {
    const currentYear = new Date().getFullYear();
    const stats = {
      Sick: { count: 0, totalMs: 0 },
      Personal: { count: 0, totalMs: 0 },
      Maternity: { count: 0, totalMs: 0 }
    };
    history.filter(h => h.status === 'Approved' && new Date(h.startDateTime).getFullYear() === currentYear).forEach(req => {
      const start = new Date(req.startDateTime).getTime();
      const end = new Date(req.endDateTime).getTime();
      const diff = end - start;
      if (stats[req.leaveType]) {
        stats[req.leaveType].count += 1;
        stats[req.leaveType].totalMs += diff;
      }
    });
    const formatStats = (key: keyof typeof stats) => {
      const ms = stats[key].totalMs;
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return { count: stats[key].count, text: `${days} วัน ${hours} ชม.` };
    };
    return { Sick: formatStats('Sick'), Personal: formatStats('Personal'), Maternity: formatStats('Maternity') };
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const getHolidayForDate = (date: Date) => {
    const iso = date.toISOString().split('T')[0];
    const day = date.getDay();
    // ปรับตรรกะวันหยุดประจำสัปดาห์ใหม่: เฉพาะวันอาทิตย์ (0) เท่านั้น
    if (day === 0) return { type: 'HD1' as const, title: 'วันหยุดประจำสัปดาห์' };
    const stored = holidays.find(h => h.date === iso);
    return stored || null;
  };

  const getLeavesForDate = (date: Date) => {
    const checkDayStart = new Date(date); checkDayStart.setHours(0,0,0,0);
    const checkDayEnd = new Date(date); checkDayEnd.setHours(23,59,59,999);
    return history.filter(req => {
      const start = new Date(req.startDateTime);
      const end = new Date(req.endDateTime);
      return start <= checkDayEnd && end >= checkDayStart;
    });
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  const handleSubmitRequest = async () => {
    if (!navigator.onLine) { alert("ไม่สามารถบันทึกข้อมูลได้ เนื่องจากไม่มีการเชื่อมต่ออินเทอร์เน็ต"); return; }
    if (!formData.startDateTime || !formData.endDateTime) { alert("กรุณาระบุวันเวลาที่เริ่มและสิ้นสุด"); return; }
    const startDate = new Date(formData.startDateTime);
    const endDate = new Date(formData.endDateTime);
    const now = new Date();
    if (endDate <= startDate) { alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น"); return; }
    if (formData.leaveType === 'Personal' || formData.leaveType === 'Maternity') {
      if (startDate < now) { alert(`เงื่อนไข: การ"${formData.leaveType === 'Personal' ? 'ลากิจ' : 'ลาคลอด'}" ต้องทำรายการล่วงหน้าเท่านั้น`); return; }
    }
    if (formData.leaveType === 'Sick') {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
      if (startDate < yesterday) { alert("เงื่อนไข: การลาป่วย อนุญาตให้ทำรายการย้อนหลังได้ไม่เกิน 1 วัน"); return; }
    }
    if (formData.leaveType === 'Personal' && !formData.leaveReason?.trim()) { alert("กรณีกิจส่วนตัว ต้องระบุเหตุผล"); return; }
    if (!signatureData) { alert("กรุณาเซ็นชื่อพนักงาน"); return; }
    setLoading(true);
    try {
      const duration = calculateDuration(formData.startDateTime, formData.endDateTime);
      const payload: LeaveRequest = {
        employeeId, employeeName, startDateTime: formData.startDateTime, endDateTime: formData.endDateTime,
        totalDuration: duration, leaveType: formData.leaveType as any, leaveReason: formData.leaveReason,
        signature: signatureData, status: 'Pending', createdAt: new Date().toISOString()
      };
      await addDocumentToCollection('history', payload);
      alert("บันทึกข้อมูลการลาเรียบร้อยแล้ว");
      await loadHistoryInternal();
      setMode('menu');
    } catch (e) { console.error(e); alert("เกิดข้อผิดพลาดในการบันทึก"); } finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setLoading(true);
    await loadHistoryInternal();
    setMode('history');
    setLoading(false);
  };

  const handleOpenApproval = (req: LeaveRequest) => {
    setSelectedRequest(req); setApprovalStatus('Approved'); setRejectionReason(''); setMode('approve');
  };

  const submitApproval = async () => {
    if (!navigator.onLine) { alert("ไม่สามารถบันทึกผลการพิจารณาได้ เนื่องจากไม่มีการเชื่อมต่ออินเทอร์เน็ต"); return; }
    if (!selectedRequest?.id) return;
    if (approvalStatus === 'Rejected' && !rejectionReason.trim()) { alert("กรุณาระบุเหตุผลที่ไม่อนุมัติ"); return; }
    setLoading(true);
    try {
      const updatedData = { ...selectedRequest, status: approvalStatus, approverComment: approvalStatus === 'Rejected' ? rejectionReason : '', approvedAt: new Date().toISOString() };
      await setDocumentWithId('history', selectedRequest.id, updatedData);
      const lineMessage = `ผลการพิจารณาการลา\nพนักงาน: ${employeeName}\nประเภท: ${updatedData.leaveType}\nวันที่: ${new Date(updatedData.startDateTime).toLocaleDateString('th-TH')} - ${new Date(updatedData.endDateTime).toLocaleDateString('th-TH')}\nผล: ${approvalStatus === 'Approved' ? '✅ อนุมัติ' : '❌ ไม่อนุมัติ'}\n${approvalStatus === 'Rejected' ? `เหตุผล: ${rejectionReason}` : ''}\nเวลาพิจารณา: ${new Date().toLocaleString('th-TH')}`.trim();
      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(lineMessage)}`, '_blank');
      alert("บันทึกผลการพิจารณาเรียบร้อยแล้ว");
      await loadHistoryInternal();
      setMode('history');
    } catch (e) { console.error(e); alert("เกิดข้อผิดพลาด"); setLoading(false); }
  };

  const renderLeaveStatsSummary = () => {
    const stats = getLeaveStats();
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
           <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">ลาป่วย</span>
           <span className="text-sm font-black text-red-700">{stats.Sick.text}</span>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex flex-col items-center justify-center text-center">
           <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">ลาคลอด</span>
           <span className="text-sm font-black text-purple-700">{stats.Maternity.text}</span>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center">
           <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">ลากิจ</span>
           <span className="text-sm font-black text-blue-700">{stats.Personal.text}</span>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = calendarDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="animate-fade-in">
         <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
            <h4 className="font-black text-slate-800 text-base">{monthName}</h4>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronRight className="w-5 h-5"/></button>
         </div>
         
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-7 gap-2 mb-3 text-center">
               {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
                 <div key={i} className={`text-[10px] font-black uppercase ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{d}</div>
               ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
               {blanks.map(i => <div key={`blank-${i}`} className="h-16 bg-slate-50/50 rounded-xl"></div>)}
               {days.map(d => {
                  const currentDate = new Date(year, month, d);
                  const leaves = getLeavesForDate(currentDate);
                  const holiday = getHolidayForDate(currentDate);
                  const isToday = new Date().toDateString() === currentDate.toDateString();
                  
                  return (
                    <div key={d} className={`h-16 border rounded-xl p-1.5 flex flex-col transition-all relative group ${
                      holiday?.type === 'HD1' ? 'bg-yellow-50/30 border-yellow-100' :
                      holiday?.type === 'HD2' ? 'bg-orange-50/30 border-orange-100' :
                      holiday?.type === 'HD3' ? 'bg-red-50/30 border-red-100' :
                      'bg-white border-slate-100 hover:border-indigo-200'
                    } ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
                       <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-black ${isToday ? 'text-indigo-600 underline decoration-2' : holiday ? 'text-slate-900' : 'text-slate-500'}`}>{d}</span>
                          {holiday && (
                            <span className={`text-[8px] font-black px-1 rounded ${
                              holiday.type === 'HD1' ? 'text-yellow-600' :
                              holiday.type === 'HD2' ? 'text-orange-600' :
                              'text-red-600'
                            }`}>{holiday.type}</span>
                          )}
                       </div>
                       <div className="flex-1 min-h-0">
                          {holiday && (
                            <div className={`text-[7px] font-bold leading-tight line-clamp-1 mt-0.5 ${
                              holiday.type === 'HD1' ? 'text-yellow-600/70' :
                              holiday.type === 'HD2' ? 'text-orange-600' :
                              'text-red-600'
                            }`} title={holiday.title}>
                              {holiday.title}
                            </div>
                          )}
                       </div>
                       <div className="flex flex-wrap gap-0.5 mt-auto">
                          {leaves.map((req, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${req.leaveType === 'Sick' ? 'bg-red-500' : req.leaveType === 'Maternity' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                          ))}
                       </div>
                    </div>
                  );
               })}
            </div>
            
            {/* Legend for Leave Calendar */}
            <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-4 items-center justify-center">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[9px] font-bold text-slate-400">ลาป่วย</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[9px] font-bold text-slate-400">ลากิจ</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[9px] font-bold text-slate-400">ลาคลอด</span></div>
               <div className="h-3 w-px bg-slate-200"></div>
               <div className="flex items-center gap-1.5 text-[9px] font-black text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">HD 1 (Sun)</div>
               <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">HD 2</div>
               <div className="flex items-center gap-1.5 text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">HD 3</div>
            </div>
         </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col my-8 animate-scale-in min-h-[600px] relative overflow-hidden">
        {!isOnline && <div className="absolute top-0 left-0 right-0 z-10 bg-red-600 text-white text-[10px] text-center py-1 font-black uppercase tracking-widest">Offline Mode: Data sync disabled</div>}
        <div className={`flex items-center justify-between p-6 border-b border-slate-100 bg-orange-50/50 ${!isOnline ? 'mt-6' : ''}`}>
          <div className="flex items-center gap-3">
            {mode !== 'menu' && <button onClick={() => setMode('menu')} className="p-2 hover:bg-white rounded-full transition-all text-orange-600 shadow-sm border border-orange-100"><ChevronLeft className="w-5 h-5"/></button>}
            <div className="p-3 bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-100"><History className="w-6 h-6" /></div>
            <div>
              <h3 className="font-black text-xl text-slate-900 tracking-tight">ระบบตรวจสอบสิทธิและการลา</h3>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Employee: {employeeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-300 hover:text-red-500 transition-colors"><X className="w-7 h-7" /></button>
        </div>
        <div className="flex-1 p-8 bg-slate-50/30 overflow-y-auto">
          {mode === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full py-10 max-w-2xl mx-auto">
              <button onClick={() => setMode('request')} className="flex flex-col items-center justify-center p-10 bg-white border border-slate-200 hover:border-orange-500 rounded-3xl shadow-sm hover:shadow-2xl transition-all group">
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><PlusCircle className="w-12 h-12 text-orange-600" /></div>
                <h3 className="text-xl font-black text-slate-800 mb-1">ทำรายการลางาน</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submit New Request</p>
              </button>
              <button onClick={loadHistory} className="flex flex-col items-center justify-center p-10 bg-white border border-slate-200 hover:border-indigo-500 rounded-3xl shadow-sm hover:shadow-2xl transition-all group">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><CalendarDays className="w-12 h-12 text-indigo-600" /></div>
                <h3 className="text-xl font-black text-slate-800 mb-1">ตรวจสอบปฏิทินและประวัติ</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">View Calendar & Logs</p>
              </button>
            </div>
          )}
          {mode === 'request' && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                 <h4 className="font-black text-slate-800 text-lg border-b border-slate-50 pb-4 mb-2 flex items-center gap-3"><PenTool className="w-5 h-5 text-orange-600" />บันทึกข้อมูลการลา</h4>
                 <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-xs text-indigo-700">
                    <p className="font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Info className="w-4 h-4"/> กฎระเบียบพื้นฐาน:</p>
                    <ul className="space-y-1 font-bold">
                       <li className="flex items-start gap-2"><span>•</span> <span>ลากิจ/ลาคลอด: ต้องล่วงหน้าเท่านั้น</span></li>
                       <li className="flex items-start gap-2"><span>•</span> <span>ลาป่วย: ย้อนหลังได้ไม่เกิน 1 วันทำการ</span></li>
                    </ul>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เริ่มวันที่</label><input type="datetime-local" value={formData.startDateTime} onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-100 outline-none font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ถึงวันที่</label><input type="datetime-local" value={formData.endDateTime} onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-100 outline-none font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all" /></div>
                 </div>
                 <div className="bg-slate-900 p-4 rounded-2xl flex items-center justify-between text-white shadow-xl"><span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">ระยะเวลารวม</span><span className="text-lg font-black">{calculateDuration(formData.startDateTime || '', formData.endDateTime || '')}</span></div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการลา</label>
                    <div className="grid grid-cols-3 gap-3">
                       {['Sick', 'Maternity', 'Personal'].map((type) => (
                         <button key={type} onClick={() => setFormData(prev => ({ ...prev, leaveType: type as any }))} className={`py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${formData.leaveType === type ? 'bg-orange-600 text-white border-orange-600 shadow-lg scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:border-orange-200'}`}>{type === 'Sick' ? 'ลาป่วย' : type === 'Maternity' ? 'ลาคลอด' : 'ลากิจ'}</button>
                       ))}
                    </div>
                 </div>
                 {formData.leaveType === 'Personal' && <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เหตุผลจำเป็น</label><textarea value={formData.leaveReason} onChange={(e) => setFormData(prev => ({ ...prev, leaveReason: e.target.value }))} placeholder="ระบุเหตุผลประกอบการพิจารณา..." className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none min-h-[100px] text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all" /></div>}
                 <div className="space-y-3 pt-4">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ลายเซ็นพนักงานดิจิทัล</label><button onClick={clearSignature} className="text-[10px] font-black text-rose-500 uppercase">Reset Sig</button></div>
                    <div className="border border-slate-200 rounded-[24px] overflow-hidden bg-white touch-none h-44 relative shadow-inner"><canvas ref={canvasRef} width={600} height={200} className="w-full h-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />{!signatureData && !isDrawing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-200 text-xs font-black uppercase tracking-widest">Sign here</div>}</div>
                 </div>
                 <button onClick={handleSubmitRequest} disabled={loading || !isOnline} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] uppercase tracking-widest text-xs">{loading ? 'Processing...' : 'ยืนยันรายการลา'}</button>
              </div>
            </div>
          )}
          {mode === 'history' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
               <div className="flex justify-center mb-8"><div className="bg-white p-1.5 rounded-[20px] flex border border-slate-200 shadow-sm"><button onClick={() => setViewFormat('list')} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewFormat === 'list' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-4 h-4" /> รายชื่อประวัติ</button><button onClick={() => setViewFormat('calendar')} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewFormat === 'calendar' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}><CalendarDays className="w-4 h-4" /> แผนผังปฏิทิน</button></div></div>
               {renderLeaveStatsSummary()}
               {viewFormat === 'calendar' ? renderCalendar() : (
                 <div className="space-y-4">
                    {history.length === 0 ? <div className="text-center p-20 text-slate-300 font-black uppercase tracking-[0.3em]">No Records Found</div> : (
                      history.map((req) => (
                        <div key={req.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                           <div className="flex items-center gap-5">
                              <div className={`p-4 rounded-2xl ${req.leaveType === 'Sick' ? 'bg-red-50 text-red-600' : req.leaveType === 'Maternity' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}><Calendar className="w-6 h-6" /></div>
                              <div>
                                 <h5 className="font-black text-slate-800 text-sm">{req.leaveType === 'Sick' ? 'ลาป่วย' : req.leaveType === 'Maternity' ? 'ลาคลอด' : 'ลากิจ'} <span className="text-[10px] text-slate-400 font-bold ml-2">({req.totalDuration})</span></h5>
                                 <p className="text-xs text-slate-500 font-bold">{new Date(req.startDateTime).toLocaleDateString('th-TH', { dateStyle: 'medium' })} - {new Date(req.endDateTime).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{req.status === 'Approved' ? 'อนุมัติ' : req.status === 'Rejected' ? 'ปฏิเสธ' : 'รอพิจารณา'}</span>
                              {req.status === 'Pending' && <button onClick={() => handleOpenApproval(req)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><CheckCircle className="w-5 h-5"/></button>}
                           </div>
                        </div>
                      ))
                    )}
                 </div>
               )}
            </div>
          )}
          {mode === 'approve' && selectedRequest && (
             <div className="max-w-xl mx-auto bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl animate-scale-in">
                <h4 className="font-black text-slate-800 text-xl mb-6 text-center uppercase tracking-tight">Leave Approval Decision</h4>
                <div className="mb-8">{renderLeaveStatsSummary()}</div>
                <div className="bg-slate-50 p-6 rounded-[24px] space-y-3 mb-8 text-sm border border-slate-100 shadow-inner">
                   <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">พนักงาน:</span> <span className="font-black text-slate-800">{selectedRequest.employeeName}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภท/ระยะเวลา:</span> <span className="font-bold text-slate-700">{selectedRequest.leaveType} / {selectedRequest.totalDuration}</span></div>
                   <div className="pt-2 border-t border-slate-100"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">ลายเซ็นอิเล็กทรอนิกส์</span><div className="flex justify-center"><img src={selectedRequest.signature} alt="Sig" className="h-12 border-b-2 border-slate-900 px-10 grayscale hover:grayscale-0 transition-all" /></div></div>
                </div>
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setApprovalStatus('Approved')} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 ${approvalStatus === 'Approved' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100'}`}>อนุมัติ (Approve)</button>
                      <button onClick={() => setApprovalStatus('Rejected')} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 ${approvalStatus === 'Rejected' ? 'bg-rose-600 text-white border-rose-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100'}`}>ปฏิเสธ (Reject)</button>
                   </div>
                   {approvalStatus === 'Rejected' && <div className="animate-fade-in-down"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ระบุสาเหตุที่ไม่ผ่านพิจารณา</label><textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full p-4 border border-rose-100 rounded-2xl focus:ring-4 focus:ring-rose-50 outline-none text-sm font-bold text-slate-700 bg-rose-50/30" /></div>}
                   <button onClick={submitApproval} disabled={loading || !isOnline} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30 uppercase tracking-[0.2em] text-[10px]">{loading ? 'Saving...' : <><Share2 className="w-4 h-4" /> บันทึกและแชร์ผ่าน LINE</>}</button>
                </div>
             </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-white flex justify-center"><p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">FireView Leave Engine v3.1</p></div>
      </div>
    </div>
  );
};
