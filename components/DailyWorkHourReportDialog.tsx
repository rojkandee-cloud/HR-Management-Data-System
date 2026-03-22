
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Users, ChevronLeft, ChevronRight, FileSpreadsheet, Download, Loader2, Building2, Search, Filter, Info, CheckCircle2, Clock, AlertCircle, Sparkles, Send, MessageSquare, AlertTriangle, UserCheck } from 'lucide-react';
import { fetchAllSpecifiedCollections } from '../services/firebase';
import { askCrossCollectionQuestion } from '../services/geminiService';
import { AttendanceRecord, FirestoreDoc, DepartmentData, HolidayData, LeaveRequest } from '../types';

interface DailyWorkHourReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DayData {
  date: string;
  totalHrs: number;
  normalHrs: number;
  otHrs: number;
  in?: string;
  out?: string;
  otStart?: string;
  otEnd?: string;
  holiday?: {
    type: 'HD1' | 'HD2' | 'HD3';
    title: string;
  } | null;
  leave?: LeaveRequest | null;
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

const getStartOfWeek = (d: Date) => {
  const day = d.getDay(),
    diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export const DailyWorkHourReportDialog: React.FC<DailyWorkHourReportDialogProps> = ({ isOpen, onClose }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<FirestoreDoc[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRequest[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // AI Search State
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSpecifiedCollections(['attendance', 'employees', 'departments', 'work_timing', 'history']);
      setAttendanceData((data['attendance'] || []) as unknown as AttendanceRecord[]);
      setEmployees(data['employees'] || []);
      setDepartments((data['departments'] || []) as unknown as DepartmentData[]);
      setHolidays((data['work_timing'] || []) as unknown as HolidayData[]);
      setLeaveData((data['history'] || []) as unknown as LeaveRequest[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekStart]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return undefined;
    const date = new Date(isoString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getHolidayForDate = (date: Date) => {
    const isoDate = date.toISOString().split('T')[0];
    if (date.getDay() === 0) return { type: 'HD1' as const, title: 'วันหยุดประจำสัปดาห์' };
    const stored = holidays.find(h => h.date === isoDate);
    if (stored) return { type: stored.type, title: stored.title };
    return null;
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiThinking(true);
    setAiAnswer(null);
    try {
      // Fix for error in file components/DailyWorkHourReportDialog.tsx: Cast collections to any to satisfy askCrossCollectionQuestion type requirements as LeaveRequest and DepartmentData have optional IDs.
      const collections = { attendance: attendanceData, employees, history: leaveData, departments } as any;
      const response = await askCrossCollectionQuestion(collections, `อ้างอิงข้อมูลสัปดาห์นี้ (${currentWeekStart.toLocaleDateString()}), ช่วยวิเคราะห์: ${aiQuery}`);
      setAiAnswer(response.text || "ไม่พบคำตอบจาก AI");
    } catch (error) {
      setAiAnswer("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
    } finally {
      setIsAiThinking(false);
    }
  };

  const reportMatrix = useMemo(() => {
    const filteredEmps = employees.filter(emp => {
      const matchesSearch = emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || emp.employeeId?.includes(searchTerm);
      const matchesDept = deptFilter === '' || emp.department === deptFilter;
      return matchesSearch && matchesDept;
    });

    return filteredEmps.map(emp => {
      const empId = emp.employeeId || emp.id;
      const dailyDetails: DayData[] = [];
      let weeklyTotal = 0;
      let weeklyOT = 0;

      weekDays.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayLogs = attendanceData.filter(log => log.employeeId === empId && log.date === dateStr);
        const holidayInfo = getHolidayForDate(date);
        
        // Check for approved leaves on this day
        const dayStart = new Date(dateStr); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(dateStr); dayEnd.setHours(23,59,59,999);
        const leaveOnDay = leaveData.find(l => 
          l.employeeId === empId && 
          l.status === 'Approved' &&
          new Date(l.startDateTime) <= dayEnd && 
          new Date(l.endDateTime) >= dayStart
        );

        if (dayLogs.length === 0) {
          dailyDetails.push({ date: dateStr, totalHrs: 0, normalHrs: 0, otHrs: 0, holiday: holidayInfo, leave: leaveOnDay });
          return;
        }

        const chronological = [...dayLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const checkIn = chronological.find(l => l.action === 'เข้าทำงาน')?.timestamp;
        const checkOut = [...chronological].reverse().find(l => l.action === 'ออกงาน')?.timestamp;
        const otStart = chronological.find(l => l.action === 'เริ่ม_OT')?.timestamp;
        const otEnd = [...chronological].reverse().find(l => l.action === 'เลิก_OT')?.timestamp;

        let nMins = 0;
        let oMins = 0;

        for (let i = 0; i < chronological.length; i++) {
          const current = chronological[i];
          if (current.action === 'เข้าทำงาน') {
            const next = chronological.find((l, idx) => idx > i && l.action === 'ออกงาน');
            if (next) nMins += (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60);
          }
          if (current.action === 'เริ่ม_OT') {
            const next = chronological.find((l, idx) => idx > i && l.action === 'เลิก_OT');
            if (next) oMins += (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60);
          }
        }

        const nHrs = Number((nMins / 60).toFixed(1));
        const oHrs = Number((oMins / 60).toFixed(1));
        dailyDetails.push({
          date: dateStr,
          totalHrs: Number((nHrs + oHrs).toFixed(1)),
          normalHrs: nHrs,
          otHrs: oHrs,
          in: formatTime(checkIn),
          out: formatTime(checkOut),
          otStart: formatTime(otStart),
          otEnd: formatTime(otEnd),
          holiday: holidayInfo,
          leave: leaveOnDay
        });
        weeklyTotal += (nHrs + oHrs);
        weeklyOT += oHrs;
      });

      return {
        id: empId,
        name: emp.fullName,
        dept: emp.department,
        dailyDetails,
        weeklyTotal: Number(weeklyTotal.toFixed(1)),
        weeklyOT: Number(weeklyOT.toFixed(1)),
        isOTExcessive: weeklyOT > 8
      };
    }).sort((a, b) => (a.dept || '').localeCompare(b.dept || ''));
  }, [attendanceData, employees, weekDays, deptFilter, searchTerm, holidays, leaveData]);

  const moveWeek = (offset: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setCurrentWeekStart(newDate);
    setAiAnswer(null);
  };

  const getHolidayColorClass = (type?: 'HD1' | 'HD2' | 'HD3') => {
    if (type === 'HD1') return 'bg-yellow-400/20 text-yellow-700';
    if (type === 'HD2') return 'bg-orange-400/20 text-orange-700';
    if (type === 'HD3') return 'bg-rose-400/20 text-rose-700';
    return '';
  };

  const getLeaveBadge = (type: string) => {
    const base = "px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm";
    switch(type) {
      case 'Sick': return <span className={`${base} bg-rose-500 text-white`}>ป่วย</span>;
      case 'Personal': return <span className={`${base} bg-blue-500 text-white`}>ลากิจ</span>;
      case 'Maternity': return <span className={`${base} bg-purple-500 text-white`}>ลาคลอด</span>;
      default: return <span className={`${base} bg-slate-400 text-white`}>ลา</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[98vw] border border-slate-200 flex flex-col h-[96vh] animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-[40px]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">สรุปชั่วโมงงานและสิทธิการลา</h3>
              <div className="flex items-center gap-2 mt-0.5">
                 <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-200">Week {getWeekNumber(currentWeekStart)}</span>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Full Workforce Integration • {currentWeekStart.getFullYear() + 543}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => moveWeek(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                <div className="px-6 text-center min-w-[240px]">
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">สัปดาห์ที่ {getWeekNumber(currentWeekStart)} ประจำปี {currentWeekStart.getFullYear() + 543}</p>
                   <p className="font-black text-slate-800 text-sm whitespace-nowrap">
                      {weekDays[0].getDate()} {THAI_MONTHS_SHORT[weekDays[0].getMonth()]} - {weekDays[6].getDate()} {THAI_MONTHS_SHORT[weekDays[6].getMonth()]}
                   </p>
                </div>
                <button onClick={() => moveWeek(1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronRight className="w-5 h-5"/></button>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-300 hover:text-red-500 transition-colors">
               <X className="w-8 h-8" />
             </button>
          </div>
        </div>

        {/* AI & Search Bar */}
        <div className="px-8 py-4 bg-white border-b border-slate-100 flex flex-col gap-4">
           {/* Row 1: Traditional Filters */}
           <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                 <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="ค้นหาพนักงาน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100" />
                 </div>
                 <div className="relative w-full md:w-64">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                       <option value="">ทุกแผนก (All Depts)</option>
                       {departments.map(d => <option key={d.departmentId} value={d.name}>{d.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">ปกติ</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">OT</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">ลางาน</span></div>
                 <div className="h-4 w-px bg-slate-200 mx-1"></div>
                 <div className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-rose-500 animate-pulse"/><span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">Highlight: OT > 8 ชม./สัปดาห์</span></div>
              </div>
           </div>

           {/* Row 2: AI Work History Search */}
           <div className="relative">
              <form onSubmit={handleAiSearch} className="flex gap-2">
                 <div className="relative flex-1">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                    <input 
                      type="text" 
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="AI Work Search: สอบถามประวัติการทำงาน/วันลา/ความสอดคล้องข้อมูลสัปดาห์นี้..." 
                      className="w-full pl-12 pr-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 text-sm font-bold text-indigo-900 placeholder-indigo-300 transition-all"
                    />
                 </div>
                 <button 
                   type="submit" 
                   disabled={isAiThinking || !aiQuery.trim()}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                 >
                    {isAiThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isAiThinking ? 'Analyzing...' : 'Ask AI'}
                 </button>
              </form>

              {aiAnswer && (
                <div className="mt-3 p-5 bg-white border border-indigo-100 rounded-[24px] shadow-xl animate-fade-in-down relative group">
                   <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shrink-0"><MessageSquare className="w-4 h-4" /></div>
                      <div className="flex-1">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Workspace Insight</span>
                            <button onClick={() => setAiAnswer(null)} className="text-slate-300 hover:text-slate-500"><X className="w-4 h-4"/></button>
                         </div>
                         <p className="text-sm text-slate-700 font-medium leading-relaxed italic">{aiAnswer}</p>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Matrix Content */}
        <div className="flex-1 overflow-auto bg-slate-100/50 p-4 scrollbar-hide">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">กำลังวิเคราะห์ข้อมูลการทำงานรายสัปดาห์...</p>
             </div>
           ) : reportMatrix.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Users className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl font-black uppercase tracking-[0.3em]">ไม่พบข้อมูลพนักงาน</p>
             </div>
           ) : (
             <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden min-w-max">
                <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 z-40">
                      <tr className="bg-indigo-600 text-white shadow-md">
                         <th className="sticky left-0 top-0 z-50 bg-indigo-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10 min-w-[220px]">พนักงาน (Employee)</th>
                         <th className="sticky top-0 z-30 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center bg-indigo-800 min-w-[120px]">รวมสัปดาห์ (ชม.)</th>
                         {weekDays.map((date, idx) => {
                            const holiday = getHolidayForDate(date);
                            const dayName = date.toLocaleDateString('th-TH', { weekday: 'short' });
                            return (
                              <th key={idx} className={`sticky top-0 z-30 px-2 py-3 text-[10px] font-black text-center min-w-[100px] border-r border-white/10 transition-colors ${holiday ? getHolidayColorClass(holiday.type).replace('text-', 'text-white/').replace('bg-', 'bg-') : 'bg-indigo-600'}`}>
                                 <div className="flex flex-col items-center">
                                    <span className="opacity-60 mb-0.5">{dayName}</span>
                                    <span className="text-sm">{date.getDate()} {THAI_MONTHS_SHORT[date.getMonth()]}</span>
                                    {holiday && <span className="text-[7px] font-black mt-0.5 opacity-80">{holiday.type}</span>}
                                 </div>
                              </th>
                            );
                         })}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {reportMatrix.map((row) => (
                        <tr key={row.id} className="hover:bg-indigo-50/10 transition-colors group">
                           {/* Name Column - Sticky Left + OT Highlight Logic */}
                           {/* Fix for error: Property 'title' does not exist on Lucide components. Wrapped AlertTriangle in a span with title. */}
                           <td className={`sticky left-0 z-20 transition-colors group-hover:bg-indigo-50/50 px-6 py-3 border-r border-slate-100 shadow-[4px_0_12px_rgba(0,0,0,0.05)] ${row.isOTExcessive ? 'bg-rose-50 animate-pulse-subtle' : 'bg-white'}`}>
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[9px] font-black shrink-0 border ${row.isOTExcessive ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                    {row.id}
                                 </div>
                                 <div className="overflow-hidden">
                                    <div className="flex items-center gap-2">
                                       <p className={`text-[12px] font-black truncate leading-tight ${row.isOTExcessive ? 'text-rose-700' : 'text-slate-800'}`}>{row.name}</p>
                                       {row.isOTExcessive && <span title="OT Over Limit (> 8h)"><AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" /></span>}
                                    </div>
                                    <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter truncate">{row.dept || 'NO DEPT'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className={`px-4 py-3 border-r border-slate-100 text-center font-mono font-black text-[13px] ${row.isOTExcessive ? 'bg-rose-100/30 text-rose-600' : 'bg-indigo-50/10 text-indigo-600'}`}>
                              <div className="flex flex-col">
                                 <span>{row.weeklyTotal}</span>
                                 <div className="flex justify-center gap-1.5 mt-0.5 opacity-60">
                                    <span className="text-[8px] text-emerald-600">N: {row.weeklyTotal - row.weeklyOT}</span>
                                    <span className={`text-[8px] ${row.isOTExcessive ? 'text-rose-600 font-black' : 'text-indigo-600'}`}>OT: {row.weeklyOT}</span>
                                 </div>
                              </div>
                           </td>
                           {row.dailyDetails.map((data, idx) => {
                             const hasWork = data.in || data.out || data.otStart || data.otEnd;
                             const hasLeave = !!data.leave;
                             const hColor = data.holiday ? getHolidayColorClass(data.holiday.type) : '';

                             return (
                               <td key={idx} className={`px-2 py-1.5 border-r border-slate-50 transition-all relative ${hColor} ${data.totalHrs > 0 ? 'bg-opacity-40' : ''} ${hasLeave ? 'bg-rose-50/50' : ''}`}>
                                  {hasLeave ? (
                                    <div className="flex flex-col items-center justify-center h-12 gap-1 animate-fade-in">
                                       {getLeaveBadge(data.leave?.leaveType || '')}
                                       <span className="text-[7px] font-bold text-rose-400 uppercase leading-none">อนุมัติแล้ว</span>
                                    </div>
                                  ) : !hasWork ? (
                                    <div className="text-center h-12 flex items-center justify-center">
                                       {data.holiday ? (
                                         <span className="text-[8px] font-black uppercase opacity-40">{data.holiday.type}</span>
                                       ) : (
                                         <span className="text-slate-200 text-[10px] font-black opacity-30">-</span>
                                       )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                       <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                                          <div className={`text-[7px] font-mono font-black px-1 rounded-sm leading-tight text-center border border-emerald-100 ${data.in ? 'bg-emerald-500 text-white' : 'bg-transparent text-slate-200 border-transparent'}`}>
                                             {data.in || '---'}
                                          </div>
                                          <div className={`text-[7px] font-mono font-black px-1 rounded-sm leading-tight text-center border border-rose-100 ${data.out ? 'bg-rose-500 text-white' : 'bg-transparent text-slate-200 border-transparent'}`}>
                                             {data.out || '---'}
                                          </div>
                                          <div className={`text-[7px] font-mono font-black px-1 rounded-sm leading-tight text-center border border-indigo-100 ${data.otStart ? 'bg-indigo-500 text-white' : 'bg-transparent text-slate-200 border-transparent'}`}>
                                             {data.otStart || '---'}
                                          </div>
                                          <div className={`text-[7px] font-mono font-black px-1 rounded-sm leading-tight text-center border border-amber-100 ${data.otEnd ? 'bg-amber-500 text-white' : 'bg-transparent text-slate-200 border-transparent'}`}>
                                             {data.otEnd || '---'}
                                          </div>
                                       </div>
                                       {/* Fix for error: Property 'title' does not exist on Lucide components. Wrapped AlertCircle in a span with title. */}
                                       <div className="text-[9px] font-black text-slate-700 text-center border-t border-slate-200/50 mt-1 pt-0.5 flex justify-center items-center gap-1">
                                          {data.totalHrs}h
                                          {data.holiday && <span title={`Holiday Work: ${data.holiday.title}`}><AlertCircle className="w-2.5 h-2.5 text-rose-500" /></span>}
                                       </div>
                                    </div>
                                  )}
                               </td>
                             );
                           })}
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center px-10">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attendance & Leave Synced</span>
              </div>
              <div className="h-4 w-px bg-slate-100"></div>
              <div className="flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-indigo-400" />
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    AI Analysis Active • ISO 8601 Week Engine
                 </p>
              </div>
           </div>
           <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl">
              <Download className="w-3.5 h-3.5" /> Export Integrated Sheet
           </button>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { background-color: rgba(255, 241, 242, 0.5); }
          50% { background-color: rgba(255, 241, 242, 1); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
