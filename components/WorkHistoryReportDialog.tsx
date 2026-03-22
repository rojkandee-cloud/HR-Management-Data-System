
import React, { useState, useEffect, useMemo } from 'react';
// Added missing ShieldCheck icon import from lucide-react
import { X, Calendar, Building2, Clock, BarChart3, Users, ChevronLeft, ChevronRight, FileText, Download, Loader2, TrendingUp, Briefcase, ShieldCheck } from 'lucide-react';
import { fetchAllSpecifiedCollections } from '../services/firebase';
import { AttendanceRecord, FirestoreDoc, DepartmentData } from '../types';

interface WorkHistoryReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeptSummary {
  deptName: string;
  employeeCount: number;
  totalNormalHours: number;
  totalOtHours: number;
  details: EmployeeWorkSummary[];
}

interface EmployeeWorkSummary {
  employeeId: string;
  employeeName: string;
  normalHours: number;
  otHours: number;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export const WorkHistoryReportDialog: React.FC<WorkHistoryReportDialogProps> = ({ isOpen, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<FirestoreDoc[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSpecifiedCollections(['attendance', 'employees', 'departments']);
      setAttendanceData((data['attendance'] || []) as unknown as AttendanceRecord[]);
      setEmployees(data['employees'] || []);
      setDepartments((data['departments'] || []) as unknown as DepartmentData[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reportData = useMemo(() => {
    // 1. Filter logs for selected month/year
    const filteredLogs = attendanceData.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getMonth() === selectedMonth && logDate.getFullYear() === selectedYear;
    });

    // 2. Group by Employee
    const employeeLogs: Record<string, AttendanceRecord[]> = {};
    filteredLogs.forEach(log => {
      if (!employeeLogs[log.employeeId]) employeeLogs[log.employeeId] = [];
      employeeLogs[log.employeeId].push(log);
    });

    // 3. Process hours per employee
    const summaries: EmployeeWorkSummary[] = [];
    Object.entries(employeeLogs).forEach(([empId, logs]) => {
      // Sort by time
      const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let normalMins = 0;
      let otMins = 0;
      let empName = logs[0]?.employeeName || 'Unknown';

      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        
        // Find pair for Normal Work
        if (current.action === 'เข้าทำงาน') {
          const next = sorted.find((l, idx) => idx > i && l.action === 'ออกงาน' && l.date === current.date);
          if (next) {
            const diff = (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60);
            normalMins += diff;
          }
        }
        
        // Find pair for OT
        if (current.action === 'เริ่ม_OT') {
          const next = sorted.find((l, idx) => idx > i && l.action === 'เลิก_OT' && l.date === current.date);
          if (next) {
            const diff = (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60);
            otMins += diff;
          }
        }
      }

      summaries.push({
        employeeId: empId,
        employeeName: empName,
        normalHours: Number((normalMins / 60).toFixed(2)),
        otHours: Number((otMins / 60).toFixed(2))
      });
    });

    // 4. Group by Department
    const deptResults: DeptSummary[] = departments.map(dept => {
      // Find employees in this dept
      const deptEmpIds = employees
        .filter(e => e.department === dept.name)
        .map(e => e.employeeId || e.id);
      
      const deptSummaries = summaries.filter(s => deptEmpIds.includes(s.employeeId));
      
      return {
        deptName: dept.name,
        employeeCount: deptEmpIds.length,
        totalNormalHours: Number(deptSummaries.reduce((sum, s) => sum + s.normalHours, 0).toFixed(2)),
        totalOtHours: Number(deptSummaries.reduce((sum, s) => sum + s.otHours, 0).toFixed(2)),
        details: deptSummaries
      };
    });

    return deptResults.sort((a, b) => b.totalNormalHours - a.totalNormalHours);
  }, [attendanceData, employees, departments, selectedMonth, selectedYear]);

  const changeMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    else if (newMonth > 11) { newMonth = 0; newYear++; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl border border-slate-200 flex flex-col h-[90vh] animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50 rounded-t-[40px]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-lg">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">รายงานสรุปชั่วโมงการทำงาน</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Departmental Work History Report</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                <div className="px-6 text-center min-w-[180px]">
                   <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">ประจำเดือน</p>
                   <p className="font-black text-slate-800 text-sm">{THAI_MONTHS[selectedMonth]} {selectedYear + 543}</p>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronRight className="w-5 h-5"/></button>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
               <X className="w-8 h-8" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
          
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                <Loader2 className="w-12 h-12 text-amber-600 animate-spin" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">กำลังคำนวณและประมวลผลข้อมูล...</p>
             </div>
          ) : reportData.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                <Clock className="w-16 h-16 opacity-20 mb-4" />
                <p className="font-black uppercase tracking-[0.3em]">ไม่พบข้อมูลการลงเวลาในเดือนนี้</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
               {/* Summary KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ชั่วโมงทำงานปกติรวม</p>
                        <h4 className="text-3xl font-black text-slate-800">{reportData.reduce((s,d) => s + d.totalNormalHours, 0).toLocaleString()} <span className="text-xs text-slate-300">ชม.</span></h4>
                     </div>
                     <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Clock className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ชั่วโมงทำงานนอกเวลารวม (OT)</p>
                        <h4 className="text-3xl font-black text-amber-600">{reportData.reduce((s,d) => s + d.totalOtHours, 0).toLocaleString()} <span className="text-xs text-slate-300">ชม.</span></h4>
                     </div>
                     <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">แผนกที่มีชั่วโมงสูงสุด</p>
                        <h4 className="text-xl font-black text-indigo-600 truncate max-w-[200px]">{reportData[0]?.deptName || '-'}</h4>
                     </div>
                     <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 className="w-6 h-6" /></div>
                  </div>
               </div>

               {/* Department Table/List */}
               <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                  <div className="bg-slate-900 px-8 py-5 flex justify-between items-center">
                     <h5 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-amber-500" /> สรุปแยกตามแผนก
                     </h5>
                     <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                        <Download className="w-3.5 h-3.5" /> Export PDF
                     </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อแผนก (Department)</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">พนักงาน</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ชม. ปกติ</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ชม. OT</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ประสิทธิภาพสัดส่วน (Normal vs OT)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {reportData.map((dept, i) => {
                              const total = dept.totalNormalHours + dept.totalOtHours;
                              const normalPct = total > 0 ? (dept.totalNormalHours / total) * 100 : 100;
                              const otPct = total > 0 ? (dept.totalOtHours / total) * 100 : 0;
                              
                              return (
                                 <tr key={i} className="hover:bg-amber-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                                             <Building2 className="w-5 h-5" />
                                          </div>
                                          <span className="font-black text-slate-700">{dept.deptName}</span>
                                       </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                       <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs">{dept.employeeCount} คน</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-slate-700">{dept.totalNormalHours.toLocaleString()}</td>
                                    <td className="px-8 py-5 text-right font-black text-amber-600">{dept.totalOtHours.toLocaleString()}</td>
                                    <td className="px-8 py-5">
                                       <div className="w-full max-w-[200px]">
                                          <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                                             <span className="text-emerald-500">{normalPct.toFixed(0)}% Normal</span>
                                             <span className="text-amber-500">{otPct.toFixed(0)}% OT</span>
                                          </div>
                                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                             <div className="h-full bg-emerald-500 shadow-lg" style={{ width: `${normalPct}%` }}></div>
                                             <div className="h-full bg-amber-500 shadow-lg" style={{ width: `${otPct}%` }}></div>
                                          </div>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Section Info */}
               <div className="bg-amber-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Briefcase className="w-48 h-48" /></div>
                  <div className="relative z-10">
                     <h5 className="text-xl font-black mb-4 flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-amber-400" />
                        สรุปประสิทธิภาพการทำงานรายเดือน
                     </h5>
                     <p className="text-amber-100/60 font-medium leading-relaxed max-w-3xl text-sm">
                        ข้อมูลนี้ถูกรวบรวมจากระบบลงเวลาอัตโนมัติ (Attendance Engine) โดยคำนวณจากคู่รายการ เข้า-ออก งานจริง 
                        เพื่อตรวจสอบความคุ้มค่าของงบประมาณและอัตราการทำโอทีของแต่ละแผนก ให้สอดคล้องกับนโยบายบริษัทและมาตรฐาน ISO
                     </p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center px-10">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Audited: {new Date().toLocaleDateString('th-TH')}</span>
              </div>
           </div>
           <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.5em]">FireView Analytics Report Engine v2.1</p>
        </div>
      </div>
    </div>
  );
};
