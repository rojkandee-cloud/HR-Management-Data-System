
import React, { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, Calendar, Filter, Download, PieChart, Users, Building2, User, CheckCircle, Clock, Thermometer, Briefcase, Baby, Activity, Mars, Venus, ChevronRight, ChevronLeft, Share2, ShieldCheck, TrendingUp, ArrowLeft, Maximize2 } from 'lucide-react';
import { fetchCollectionData } from '../services/firebase';
import { LeaveRequest, FirestoreDoc, HolidayData, DepartmentData } from '../types';

interface CompanyLeaveReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: FirestoreDoc[];
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

const LEAVE_CONFIG = {
  Sick: { bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-500', color: '#f43f5e', label: 'ลาป่วย', Icon: Thermometer },
  Personal: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500', color: '#3b82f6', label: 'ลากิจ', Icon: Briefcase },
  Maternity: { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500', color: '#a855f7', label: 'ลาคลอด', Icon: Baby },
};

// --- Custom 3D-Style Donut Chart ---
const Donut3D: React.FC<{ 
  data: { label: string, value: number, color: string }[], 
  total: number, 
  title: string, 
  unit?: string,
  onClick?: () => void,
  isExpanded?: boolean
}> = ({ data, total, title, unit = "ชม.", onClick, isExpanded = false }) => {
  const radius = 50;
  const strokeWidth = isExpanded ? 20 : 15;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  let cumulativePercent = 0;

  const sizeClass = isExpanded ? "w-64 h-64 md:w-80 md:h-80" : "w-40 h-40";

  return (
    <div 
      onClick={onClick}
      className={`bg-white/60 backdrop-blur-md rounded-[32px] border border-white/60 shadow-sm flex flex-col items-center group transition-all duration-300 ${
        isExpanded 
          ? 'p-10 w-full max-w-2xl' 
          : 'p-6 h-full cursor-pointer hover:shadow-2xl hover:border-indigo-400 hover:-translate-y-1'
      }`}
    >
      <div className="w-full flex justify-between items-center mb-6">
        <h6 className={`${isExpanded ? 'text-lg font-black' : 'text-[10px] font-black text-center mx-auto'} text-slate-800 uppercase tracking-widest`}>{title}</h6>
        {!isExpanded && <Maximize2 className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      
      <div className={`relative ${sizeClass}`}>
        <svg viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-2xl overflow-visible">
          <circle cx="50" cy="50" r={normalizedRadius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {data.map((item, i) => {
            const percent = (item.value / (total || 1)) * 100;
            if (percent <= 0) return null;
            const strokeDashoffset = circumference - (percent / 100) * circumference;
            const rotation = (cumulativePercent / 100) * 360;
            cumulativePercent += percent;
            return (
              <circle
                key={i} cx="50" cy="50" r={normalizedRadius} fill="transparent" 
                stroke={item.color}
                strokeWidth={strokeWidth} 
                strokeDasharray={`${circumference} ${circumference}`}
                strokeLinecap="round"
                style={{ 
                  strokeDashoffset, 
                  transform: `rotate(${rotation}deg)`, 
                  transformOrigin: '50px 50px', 
                  transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}
                className="opacity-90 hover:opacity-100"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center rounded-full">
          <span className={`${isExpanded ? 'text-4xl' : 'text-2xl'} font-black text-slate-800 leading-none transition-all`}>{total.toLocaleString()}</span>
          <span className={`${isExpanded ? 'text-xs' : 'text-[8px]'} font-black text-slate-400 uppercase tracking-widest mt-1`}>{unit}</span>
        </div>
      </div>

      <div className={`mt-8 w-full ${isExpanded ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-2.5'}`}>
        {data.filter(i => i.value > 0).map((item, i) => (
          <div key={i} className={`flex items-center justify-between font-bold ${isExpanded ? 'p-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 text-sm' : 'text-[10px]'}`}>
            <div className="flex items-center gap-2">
              <div className={`${isExpanded ? 'w-3 h-3' : 'w-2 h-2'} rounded-full shadow-sm`} style={{ backgroundColor: item.color }}></div>
              <span className="text-slate-500 truncate max-w-[150px]">{item.label}</span>
            </div>
            <span className="text-slate-800 font-mono">
              {item.value.toLocaleString()} {isExpanded && <span className="text-slate-300 ml-1 text-xs">({((item.value/total)*100).toFixed(1)}%)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Custom 3D-Style Bar Chart ---
const BarChart3D: React.FC<{ 
  data: { label: string, leave: number, work: number }[], 
  title: string,
  maxVal: number
}> = ({ data, title, maxVal }) => {
  return (
    <div className="bg-white/60 backdrop-blur-md p-8 rounded-[40px] border border-white/60 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-10">
        <h5 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
           <TrendingUp className="w-5 h-5 text-indigo-600" /> {title}
        </h5>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-600 rounded-sm shadow-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">ทำงาน</span></div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-500 rounded-sm shadow-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">การลา</span></div>
        </div>
      </div>
      
      <div className="flex-1 flex items-end justify-between gap-3 px-4 pb-10">
        {data.map((item, i) => {
          const leaveH = (item.leave / (maxVal || 1)) * 100;
          const workH = (item.work / (maxVal || 1)) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full">
               <div className="w-full flex justify-center items-end gap-1 h-full relative">
                  {/* Work Bar 3D */}
                  <div 
                    className="w-4 bg-gradient-to-t from-indigo-800 via-indigo-600 to-indigo-400 rounded-t-md shadow-2xl transition-all duration-1000 group-hover:scale-x-110 origin-bottom" 
                    style={{ height: `${Math.max(workH, 2)}%` }}
                  ></div>
                  {/* Leave Bar 3D */}
                  <div 
                    className="w-4 bg-gradient-to-t from-rose-800 via-rose-600 to-rose-400 rounded-t-md shadow-2xl transition-all duration-1000 group-hover:scale-x-110 origin-bottom" 
                    style={{ height: `${Math.max(leaveH, 1)}%` }}
                  ></div>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-2xl border border-white/10 scale-90 group-hover:scale-100 transition-transform">
                    <p className="flex justify-between gap-4"><span>Work:</span> <span className="text-indigo-300 font-mono">{item.work.toLocaleString()} h</span></p>
                    <p className="flex justify-between gap-4 text-rose-400"><span>Leave:</span> <span className="font-mono">{item.leave.toLocaleString()} h</span></p>
                  </div>
               </div>
               <span className="absolute -bottom-6 text-[9px] font-black text-slate-400 uppercase rotate-[-30deg] origin-center whitespace-nowrap w-full text-center">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CompanyLeaveReportDialog: React.FC<CompanyLeaveReportDialogProps> = ({ isOpen, onClose, employees }) => {
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  
  // State for expanded graph
  const [expandedDonutId, setExpandedDonutId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
      setExpandedDonutId(null);
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [histDocs, holidayDocs, deptDocs] = await Promise.all([
        fetchCollectionData('history'),
        fetchCollectionData('work_timing'),
        fetchCollectionData('departments')
      ]);
      setHistory(histDocs as unknown as LeaveRequest[]);
      setHolidays(holidayDocs as unknown as HolidayData[]);
      setDepartments(deptDocs as unknown as DepartmentData[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getWorkingDaysInMonth = (year: number, month: number) => {
    const lastDate = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= lastDate; d++) {
      const date = new Date(year, month, d);
      const iso = date.toISOString().split('T')[0];
      const isSunday = date.getDay() === 0;
      const isHoliday = holidays.some(h => h.date === iso && (h.type === 'HD2' || h.type === 'HD3'));
      if (!isSunday && !isHoliday) workingDays++;
    }
    return workingDays;
  };

  const getLeaveHours = (req: LeaveRequest) => {
    const start = new Date(req.startDateTime);
    const end = new Date(req.endDateTime);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  };

  const dashboardData = useMemo(() => {
    const currentYearHistory = history.filter(h => h.status === 'Approved' && new Date(h.startDateTime).getFullYear() === selectedYear);
    
    // 1. Stats by Dept (Hours)
    const deptHoursMap: Record<string, number> = {};
    currentYearHistory.forEach(h => {
      const emp = employees.find(e => e.id === h.employeeId || e.employeeId === h.employeeId);
      const dept = emp?.department || 'ไม่ระบุ';
      deptHoursMap[dept] = (deptHoursMap[dept] || 0) + getLeaveHours(h);
    });
    const deptDonut = Object.entries(deptHoursMap).map(([label, value], i) => ({ label, value: Math.round(value), color: COLORS[i % COLORS.length] }));

    // 2. Stats by Month (Hours)
    const monthHoursMap: Record<string, number> = {};
    currentYearHistory.forEach(h => {
      const m = new Date(h.startDateTime).getMonth();
      monthHoursMap[THAI_MONTHS[m]] = (monthHoursMap[THAI_MONTHS[m]] || 0) + getLeaveHours(h);
    });
    const monthDonut = THAI_MONTHS.map((m, i) => ({ label: m, value: Math.round(monthHoursMap[m] || 0), color: COLORS[i % COLORS.length] }));

    // 3. Stats by Type (Count)
    const typeCountMap: Record<string, number> = { Sick: 0, Personal: 0, Maternity: 0 };
    currentYearHistory.forEach(h => { if (typeCountMap[h.leaveType] !== undefined) typeCountMap[h.leaveType]++; });
    const typeDonut = Object.entries(typeCountMap).map(([k, v]) => ({ label: LEAVE_CONFIG[k as keyof typeof LEAVE_CONFIG].label, value: v, color: LEAVE_CONFIG[k as keyof typeof LEAVE_CONFIG].color }));

    // 4. Stats by Gender (Hours)
    const genderHoursMap: Record<string, number> = { 'ชาย': 0, 'หญิง': 0, 'อื่นๆ': 0 };
    currentYearHistory.forEach(h => {
      const emp = employees.find(e => e.id === h.employeeId || e.employeeId === h.employeeId);
      const g = emp?.gender === 'ชาย' ? 'ชาย' : emp?.gender === 'หญิง' ? 'หญิง' : 'อื่นๆ';
      genderHoursMap[g] = (genderHoursMap[g] || 0) + getLeaveHours(h);
    });
    const genderDonut = Object.entries(genderHoursMap).map(([label, value]) => ({ label, value: Math.round(value), color: label === 'ชาย' ? '#4f46e5' : label === 'หญิง' ? '#ec4899' : '#94a3b8' }));

    // 5. Bar Chart: Annual Comparison
    const annualComparison = THAI_MONTHS.map((m, i) => {
      const leaveHrs = currentYearHistory.filter(h => new Date(h.startDateTime).getMonth() === i).reduce((sum, h) => sum + getLeaveHours(h), 0);
      const workDays = getWorkingDaysInMonth(selectedYear, i);
      const totalWorkHrs = employees.length * workDays * 8; 
      return { label: m.substring(0, 3), leave: Math.round(leaveHrs), work: totalWorkHrs };
    });

    // 6. Bar Chart: Selected Month Dept Breakdown
    const monthlyDeptBreakdown = departments.map(d => {
      const leaveHrs = currentYearHistory.filter(h => {
        const emp = employees.find(e => e.id === h.employeeId || e.employeeId === h.employeeId);
        return emp?.department === d.name && new Date(h.startDateTime).getMonth() === selectedMonth;
      }).reduce((sum, h) => sum + getLeaveHours(h), 0);
      
      const deptEmpsCount = employees.filter(e => e.department === d.name).length;
      const workDays = getWorkingDaysInMonth(selectedYear, selectedMonth);
      const totalWorkHrs = deptEmpsCount * workDays * 8;

      return { label: d.name, leave: Math.round(leaveHrs), work: totalWorkHrs };
    });

    const maxAnnual = Math.max(...annualComparison.map(a => Math.max(a.leave, a.work))) * 1.1;
    const maxMonthlyDept = Math.max(...monthlyDeptBreakdown.map(a => Math.max(a.leave, a.work))) * 1.1;

    return { 
      deptDonut, monthDonut, typeDonut, genderDonut, 
      annualComparison, monthlyDeptBreakdown,
      maxAnnual, maxMonthlyDept,
      totalYearHours: Math.round(currentYearHistory.reduce((sum, h) => sum + getLeaveHours(h), 0)),
      totalYearRequests: currentYearHistory.length
    };
  }, [history, holidays, employees, departments, selectedYear, selectedMonth]);

  const donutConfigs = [
    { title: "สัดส่วนชั่วโมงลาตามแผนก", data: dashboardData.deptDonut, total: dashboardData.totalYearHours, unit: "ชม." },
    { title: "ชั่วโมงลารายเดือนในปีนี้", data: dashboardData.monthDonut, total: dashboardData.totalYearHours, unit: "ชม." },
    { title: "จำนวนครั้งการลาตามประเภท", data: dashboardData.typeDonut, total: dashboardData.totalYearRequests, unit: "ครั้ง" },
    { title: "สัดส่วนชั่วโมงลาตามเพศ", data: dashboardData.genderDonut, total: dashboardData.totalYearHours, unit: "ชม." }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-yellow-50/80 backdrop-blur-xl rounded-[48px] shadow-2xl w-full max-w-[95vw] border border-white/40 flex flex-col h-[96vh] animate-scale-in">
        
        {/* Modern Header */}
        <div className="flex items-center justify-between p-8 border-b border-yellow-100/50 bg-white/40 sticky top-0 z-30 rounded-t-[48px]">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-yellow-500 text-white rounded-[24px] shadow-2xl shadow-yellow-100">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-3xl text-yellow-900 tracking-tight">รายงานสรุปประสิทธิภาพและการลา</h3>
              <div className="flex items-center gap-3 mt-1">
                 <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded text-[10px] font-black uppercase tracking-widest">Efficiency Analytics v4.5</span>
                 <div className="h-1 w-1 rounded-full bg-yellow-300"></div>
                 <p className="text-sm font-bold text-yellow-700/60">ฐานข้อมูลปัจจุบัน ปี พ.ศ. {selectedYear + 543}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/40">
               <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft className="w-4 h-4 text-yellow-400"/></button>
               <span className="px-4 font-black text-yellow-900 min-w-[100px] text-center">พ.ศ. {selectedYear + 543}</span>
               <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight className="w-4 h-4 text-yellow-400"/></button>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-red-50 rounded-full text-slate-300 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12 relative">
           
           {/* Expanded Donut View Overlay */}
           {expandedDonutId !== null && (
             <div className="absolute inset-0 z-50 bg-yellow-50/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-fade-in">
                <div className="w-full max-w-4xl flex justify-between items-center mb-8">
                   <button 
                     onClick={() => setExpandedDonutId(null)}
                     className="flex items-center gap-2 px-6 py-3 bg-white/60 border border-yellow-200 rounded-2xl text-yellow-700 font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm transition-all"
                   >
                     <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                   </button>
                   <button 
                     onClick={() => setExpandedDonutId(null)}
                     className="p-3 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition-all"
                   >
                     <X className="w-6 h-6" />
                   </button>
                </div>
                
                <div className="animate-scale-in flex justify-center w-full">
                  <Donut3D 
                    {...donutConfigs[expandedDonutId]}
                    isExpanded={true}
                  />
                </div>
             </div>
           )}

           {/* Top KPIs */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'ชั่วโมงการลาสะสมรวม', value: dashboardData.totalYearHours.toLocaleString(), unit: 'ชม.', icon: Clock, color: 'yellow' },
                { label: 'รายการลางานสะสม', value: dashboardData.totalYearRequests.toLocaleString(), unit: 'ครั้ง', icon: CheckCircle, color: 'emerald' },
                { label: 'อัตราการลาเฉลี่ย/คน', value: (dashboardData.totalYearHours / (employees.length || 1)).toFixed(1), unit: 'ชม.', icon: Users, color: 'blue' },
                { label: 'วันทำงานจริง (เดือนนี้)', value: getWorkingDaysInMonth(selectedYear, selectedMonth), unit: 'วัน', icon: Calendar, color: 'amber' },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white/60 shadow-sm flex items-center justify-between hover:shadow-xl transition-all">
                  <div>
                    <p className="text-[10px] font-black text-yellow-700 uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
                    <h4 className="text-3xl font-black text-slate-800 leading-none">{kpi.value} <span className="text-xs font-bold text-slate-300">{kpi.unit}</span></h4>
                  </div>
                  <div className={`p-4 bg-${kpi.color === 'yellow' ? 'yellow-100' : kpi.color + '-50'} text-${kpi.color === 'yellow' ? 'yellow-600' : kpi.color + '-600'} rounded-2xl shadow-inner`}><kpi.icon className="w-6 h-6" /></div>
                </div>
              ))}
           </div>

           {/* --- 1. Donut Analysis Section --- */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-auto min-h-[380px]">
              {donutConfigs.map((config, idx) => (
                <Donut3D 
                  key={idx}
                  {...config}
                  onClick={() => setExpandedDonutId(idx)}
                />
              ))}
           </div>

           {/* --- 2. Bar Analysis Section --- */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
              <BarChart3D 
                title="เปรียบเทียบ ชั่วโมงการลา vs ชั่วโมงการทำงาน (รายเดือน)"
                data={dashboardData.annualComparison}
                maxVal={dashboardData.maxAnnual}
              />

              <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between bg-white/60 backdrop-blur-md px-8 py-4 rounded-[32px] border border-white/60 shadow-sm">
                    <div className="flex items-center gap-3">
                       <Filter className="w-5 h-5 text-yellow-600" />
                       <span className="text-sm font-black text-yellow-900 uppercase tracking-tight">วิเคราะห์รายแผนกเดือน:</span>
                    </div>
                    <select 
                       value={selectedMonth}
                       onChange={(e) => setSelectedMonth(Number(e.target.value))}
                       className="bg-white/80 border border-yellow-200 px-6 py-2 rounded-xl font-black text-yellow-700 outline-none focus:ring-4 focus:ring-yellow-100"
                    >
                       {THAI_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                 </div>
                 <BarChart3D 
                   title={`ประสิทธิภาพรายแผนก (${THAI_MONTHS[selectedMonth]})`}
                   data={dashboardData.monthlyDeptBreakdown}
                   maxVal={dashboardData.maxMonthlyDept}
                 />
              </div>
           </div>

           {/* Advanced Insights Panel */}
           <div className="bg-yellow-600 rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl mb-10 border border-yellow-400/50">
              <div className="absolute top-[-50px] right-[-50px] p-12 opacity-10 rotate-12"><PieChart className="w-80 h-80" /></div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                 <div>
                    <h5 className="text-3xl font-black mb-6 flex items-center gap-4 text-white">
                       <ShieldCheck className="w-8 h-8 text-white/70" /> 
                       AI Executive Summary
                    </h5>
                    <p className="text-yellow-50 text-lg leading-relaxed font-medium">
                       จากการวิเคราะห์ชั่วโมงทำงานรวมทั้งบริษัท ({dashboardData.annualComparison.reduce((s,a)=>s+a.work, 0).toLocaleString()} ชม.) 
                       เทียบกับการลา ({dashboardData.totalYearHours.toLocaleString()} ชม.) ในปี {selectedYear+543} 
                       องค์กรมีความเสถียรของอัตรากำลังอยู่ที่ {((1 - (dashboardData.totalYearHours / dashboardData.annualComparison.reduce((s,a)=>s+a.work, 1))) * 100).toFixed(2)}%
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4">
                       <button className="px-10 py-4 bg-white text-yellow-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-50 transition-all flex items-center gap-3 shadow-xl">
                          <Download className="w-5 h-5" /> Export Detailed PDF
                       </button>
                       <button className="px-10 py-4 bg-yellow-700/50 text-white border border-yellow-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-700 transition-all flex items-center gap-3">
                          <Share2 className="w-5 h-5" /> Share Insights
                       </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/10 p-6 rounded-3xl border border-white/20 backdrop-blur-md hover:bg-white/20 transition-all">
                       <p className="text-[11px] font-black text-yellow-200 uppercase tracking-widest mb-2">Highest Leave Impact (Dept)</p>
                       <div className="flex justify-between items-end">
                          <span className="text-xl font-black">{dashboardData.deptDonut.sort((a,b)=>b.value-a.value)[0]?.label || '-'}</span>
                          <span className="text-3xl font-black text-white">{dashboardData.deptDonut.sort((a,b)=>b.value-a.value)[0]?.value.toLocaleString() || 0} ชม.</span>
                       </div>
                    </div>
                    <div className="bg-white/10 p-6 rounded-3xl border border-white/20 backdrop-blur-md hover:bg-white/20 transition-all">
                       <p className="text-[11px] font-black text-yellow-200 uppercase tracking-widest mb-2">Peak Leave Period (Month)</p>
                       <div className="flex justify-between items-end">
                          <span className="text-xl font-black">{dashboardData.monthDonut.sort((a,b)=>b.value-a.value)[0]?.label || '-'}</span>
                          <span className="text-3xl font-black text-white">{dashboardData.monthDonut.sort((a,b)=>b.value-a.value)[0]?.value.toLocaleString() || 0} ชม.</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

        </div>

        {/* Professional Footer */}
        <div className="p-8 border-t border-yellow-100/30 bg-white/40 rounded-b-[48px] flex justify-between items-center px-12 text-yellow-700/40">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">FireView Intelligent Analytics • Data Visualization Engine v4.9</p>
          <div className="flex items-center gap-4">
             <ShieldCheck className="w-5 h-5 opacity-50" />
             <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted Data Stream</span>
          </div>
        </div>
      </div>
    </div>
  );
};
