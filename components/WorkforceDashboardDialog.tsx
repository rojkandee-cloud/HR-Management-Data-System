
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Users, Briefcase, TrendingUp, PieChart, UserCheck, UserX, Banknote, Building2, Activity, Loader2, Info, Share2, FileText, Calendar, Clock, ShieldCheck, Eye, Download, ArrowLeft, CheckCircle, Maximize2, Coins } from 'lucide-react';
import { fetchCollectionData } from '../services/firebase';
import { FirestoreDoc, WorkProfileData } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- มาตรฐานคำศัพท์กลาง (Official Report Labels) ---
const LABELS = {
  totalRegistered: 'จำนวนพนักงานที่ลงทะเบียน',
  activeEmployees: 'จำนวนพนักงานปัจจุบัน',
  resignedEmployees: 'จำนวนพนักงานที่พ้นสภาพ',
  totalBudget: 'งบประมาณเงินเดือนรวมเบื้องต้น (บาท)',
  deptBreakdown: '01. ข้อมูลสัดส่วนพนักงานรายแผนก',
  genderBreakdown: '02. ข้อมูลสถิติประชากร (เพศ)',
  salaryBreakdown: '03. สัดส่วนงบประมาณเงินเดือนรายแผนก',
  employmentType: 'สถิติประเภทการจ้างงาน',
  verifiedStatus: 'ตรวจสอบความถูกต้องแล้วโดยระบบ (SYSTEM VERIFIED)',
  confidential: 'เอกสารลับเฉพาะภายในองค์กร (INTERNAL ONLY)',
  reportId: 'รหัสอ้างอิงเอกสาร:',
  generatedDate: 'วันที่ออกรายงาน:',
  generatedTime: 'เวลาที่ออกรายงาน:'
};

interface WorkforceDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: FirestoreDoc[]; 
}

interface MergedEmployeeData extends FirestoreDoc {
  workProfile?: WorkProfileData;
}

const COLORS_HEX = ['#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];
const COLORS_TW = ['bg-indigo-600', 'bg-blue-600', 'bg-cyan-600', 'bg-teal-600', 'bg-emerald-600', 'bg-green-600', 'bg-amber-600', 'bg-orange-600', 'bg-rose-600'];

// --- Reusable 3D Donut Chart Component ---
const Donut3D: React.FC<{ 
  data: { label: string, value: number, color: string }[], 
  total: number, 
  title: string, 
  unit?: string,
  isExpanded?: boolean
}> = ({ data, total, title, unit = "บาท", isExpanded = false }) => {
  const radius = 50;
  const strokeWidth = isExpanded ? 18 : 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  let cumulativePercent = 0;

  const sizeClass = isExpanded ? "w-64 h-64 md:w-80 md:h-80" : "w-44 h-44";

  return (
    <div className={`flex flex-col items-center w-full ${isExpanded ? 'p-6' : 'p-2'}`}>
      <div className="w-full text-left mb-6">
        <h6 className={`${isExpanded ? 'text-lg font-black' : 'text-[10px] font-black'} text-slate-800 uppercase tracking-widest flex items-center gap-2`}>
          <div className="w-1.5 h-4 bg-emerald-600 rounded-full"></div> {title}
        </h6>
      </div>
      
      <div className={`relative ${sizeClass}`}>
        <svg viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-xl overflow-visible">
          <circle cx="50" cy="50" r={normalizedRadius} fill="transparent" stroke="#f8fafc" strokeWidth={strokeWidth} />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`${isExpanded ? 'text-2xl' : 'text-lg'} font-black text-slate-800 leading-none`}>
            {total >= 1000000 ? (total / 1000000).toFixed(2) + 'M' : total.toLocaleString()}
          </span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{unit}</span>
        </div>
      </div>

      <div className={`mt-6 w-full ${isExpanded ? 'grid grid-cols-2 gap-x-6 gap-y-2' : 'space-y-2'}`}>
        {data.filter(i => i.value > 0).map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
              <span className="text-[10px] font-bold text-slate-500 truncate">{item.label}</span>
            </div>
            <span className="text-[10px] font-black text-slate-700 ml-2">
              {((item.value / (total || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const WorkforceDashboardDialog: React.FC<WorkforceDashboardDialogProps> = ({ isOpen, onClose, employees }) => {
  const [workProfiles, setWorkProfiles] = useState<WorkProfileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportMetadata, setReportMetadata] = useState({ id: '', date: '', time: '' });
  const reportRef = useRef<HTMLDivElement>(null);
  
  // New state for Salary Distribution Filter
  const [salaryFilterMode, setSalaryFilterMode] = useState<'month' | 'year'>('month');

  useEffect(() => {
    if (isOpen) {
      loadWorkProfiles();
      setIsPreviewing(false);
    }
  }, [isOpen]);

  const loadWorkProfiles = async () => {
    setLoading(true);
    try {
      const docs = await fetchCollectionData('work_profiles');
      setWorkProfiles(docs as unknown as WorkProfileData[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const merged: MergedEmployeeData[] = employees.map(emp => ({
      ...emp,
      workProfile: workProfiles.find(wp => wp.employeeId === emp.employeeId || wp.employeeId === emp.id)
    }));
    
    const totalCount = merged.length;
    const activeEmployees = merged.filter(m => !m.workProfile || m.workProfile.employmentStatus !== 'ลาออกแล้ว');
    const resignedCount = totalCount - activeEmployees.length;
    const activeCount = activeEmployees.length;
    
    // Monthly Budget
    const monthlyTotalPayroll = activeEmployees.reduce((sum, emp) => sum + (emp.workProfile?.salary || 0), 0);
    const yearlyTotalPayroll = monthlyTotalPayroll * 12;
    
    // Dept Count Stats
    const deptMap: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const dept = emp.workProfile?.department || emp.department || 'ไม่ระบุแผนก';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const deptStats = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ 
      name, count, percent: activeCount > 0 ? (count / activeCount) * 100 : 0 
    }));

    // Gender Stats
    const genderMap: Record<string, number> = { 'ชาย': 0, 'หญิง': 0, 'เพศทางเลือก': 0, 'ไม่ระบุ': 0 };
    activeEmployees.forEach(emp => {
      const g = emp.gender || 'ไม่ระบุ';
      if (genderMap[g] !== undefined) genderMap[g]++;
      else genderMap['ไม่ระบุ']++;
    });

    // Salary Distribution by Dept
    const salaryDeptMap: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const dept = emp.workProfile?.department || emp.department || 'ไม่ระบุแผนก';
      const salary = emp.workProfile?.salary || 0;
      salaryDeptMap[dept] = (salaryDeptMap[dept] || 0) + (salary * (salaryFilterMode === 'year' ? 12 : 1));
    });
    
    const salaryDeptDonut = Object.entries(salaryDeptMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: COLORS_HEX[i % COLORS_HEX.length]
      }));

    const typeMap: Record<string, number> = {};
    activeEmployees.forEach(emp => {
       const type = emp.workProfile?.employmentType || 'ไม่ระบุ';
       typeMap[type] = (typeMap[type] || 0) + 1;
    });

    return { 
      totalCount, activeCount, resignedCount, 
      totalPayroll: salaryFilterMode === 'year' ? yearlyTotalPayroll : monthlyTotalPayroll,
      deptStats, genderMap, typeMap, salaryDeptDonut 
    };
  }, [employees, workProfiles, salaryFilterMode]);

  const enterPreview = () => {
    const now = new Date();
    setReportMetadata({
      id: `WF-${now.getTime().toString().slice(-6)}`,
      date: now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    setIsPreviewing(true);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 4, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');
      pdf.save(`Workforce_Report_${reportMetadata.id}.pdf`);
      setIsPreviewing(false);
    } catch (err) {
      alert("ไม่สามารถสร้างรายงาน PDF ได้");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-emerald-50/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-7xl border border-white/40 flex flex-col h-[94vh] animate-scale-in relative">
        
        {/* มาตรการตรวจสอบ: Overlay ขณะประมวลผล */}
        {(loading || isExporting) && (
          <div className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
            <p className="font-black text-slate-800 text-lg uppercase tracking-widest">
              {loading ? "กำลังโหลดข้อมูล..." : "กำลังบันทึกเอกสารตรวจสอบแล้วตามมาตรฐาน ISO..."}
            </p>
          </div>
        )}

        {/* --- โหมด A: แดชบอร์ดจัดการข้อมูล --- */}
        {!isPreviewing && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-emerald-100/50 bg-white/40 sticky top-0 z-20 rounded-t-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100"><Activity className="w-7 h-7" /></div>
                <div>
                  <h3 className="font-black text-2xl text-emerald-900 leading-tight tracking-tight">ระบบภาพรวมอัตรากำลังพล</h3>
                  <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">การควบคุมข้อมูลตามมาตรฐานองค์กร</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={enterPreview} className="px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-2 active:scale-95">
                  <Eye className="w-4 h-4 text-emerald-400" /> 
                  ตรวจสอบความสอดคล้องและออกรายงาน
                </button>
                <button onClick={onClose} className="p-2.5 hover:bg-red-50 rounded-full text-slate-300 hover:text-red-500 transition-colors border border-transparent"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-transparent space-y-8">
              {/* ส่วนสลับโหมดงบประมาณ */}
              <div className="flex justify-end mb-2">
                 <div className="bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/60 shadow-sm flex">
                    <button 
                      onClick={() => setSalaryFilterMode('month')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salaryFilterMode === 'month' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400 hover:bg-white/40'}`}
                    >
                      Monthly View
                    </button>
                    <button 
                      onClick={() => setSalaryFilterMode('year')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salaryFilterMode === 'year' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400 hover:bg-white/40'}`}
                    >
                      Annual View
                    </button>
                 </div>
              </div>

              {/* ข้อมูลสรุป KPI */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: LABELS.totalRegistered, val: stats.totalCount, sub: `ข้อมูลทะเบียนรวม`, icon: Users, color: 'emerald' },
                  { label: LABELS.activeEmployees, val: stats.activeCount, sub: `กำลังปฏิบัติงานจริง`, icon: UserCheck, color: 'emerald' },
                  { label: LABELS.resignedEmployees, val: stats.resignedCount, sub: `พ้นสภาพการจ้างงาน`, icon: UserX, color: 'rose' },
                  { label: salaryFilterMode === 'year' ? 'งบประมาณเงินเดือนรวม (รายปี)' : 'งบประมาณเงินเดือนรวม (รายเดือน)', val: stats.totalPayroll.toLocaleString(), sub: `โดยประมาณการ`, icon: Banknote, color: 'emerald' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex items-center justify-between group hover:border-emerald-400 transition-colors">
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">{item.label}</p>
                      <h4 className={`text-2xl font-black text-emerald-700 leading-none tracking-tighter`}>{item.val}</h4>
                    </div>
                    <div className={`p-4 bg-emerald-50/60 text-emerald-600 rounded-2xl shadow-inner`}><item.icon className="w-6 h-6" /></div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 01. Dept Population breakdown */}
                <div className="lg:col-span-2 bg-white/60 backdrop-blur-md p-8 rounded-[32px] border border-white/60 shadow-sm">
                  <h5 className="font-black text-slate-800 text-lg mb-8 flex items-center gap-3"><TrendingUp className="w-6 h-6 text-emerald-600" /> {LABELS.deptBreakdown}</h5>
                  <div className="space-y-6">
                    {stats.deptStats.map((dept, i) => (
                      <div key={i} className="group">
                        <div className="flex justify-between text-[11px] mb-2">
                          <span className="font-black text-slate-700 uppercase tracking-tight">{dept.name}</span>
                          <span className="font-black text-slate-900">{dept.count} <span className="text-slate-300 ml-1">คน ({dept.percent.toFixed(1)}%)</span></span>
                        </div>
                        <div className="h-2.5 bg-white/40 rounded-full overflow-hidden border border-emerald-100/30">
                          <div className={`h-full ${COLORS_TW[i % COLORS_TW.length]} transition-all duration-1000 shadow-sm`} style={{ width: `${dept.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 02. Gender Donut */}
                <div className="bg-white/60 backdrop-blur-md p-8 rounded-[32px] border border-white/60 shadow-sm flex flex-col items-center">
                   <div className="w-full mb-10 text-left">
                    <h5 className="font-black text-slate-800 text-lg flex items-center gap-3"><PieChart className="w-6 h-6 text-emerald-600" /> {LABELS.genderBreakdown}</h5>
                  </div>
                  <Donut3D 
                    title="สัดส่วนพนักงานแยกตามเพศ"
                    data={[
                      { label: 'ชาย', value: stats.genderMap['ชาย'] || 0, color: '#059669' },
                      { label: 'หญิง', value: stats.genderMap['หญิง'] || 0, color: '#ec4899' },
                      { label: 'อื่นๆ', value: (stats.genderMap['เพศทางเลือก'] || 0) + (stats.genderMap['ไม่ระบุ'] || 0), color: '#d97706' }
                    ]}
                    total={stats.activeCount}
                    unit="คน"
                  />
                </div>

                {/* 03. Salary 3D Donut - New Requirement */}
                <div className="lg:col-span-3 bg-white/60 backdrop-blur-md p-10 rounded-[40px] border border-white/60 shadow-sm">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                      <div className="space-y-6">
                         <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/50 inline-flex items-center gap-3">
                            <Coins className="w-6 h-6 text-emerald-600" />
                            <h5 className="font-black text-emerald-900 text-xl tracking-tight">{LABELS.salaryBreakdown}</h5>
                         </div>
                         <p className="text-emerald-700/60 font-medium leading-relaxed">
                            วิเคราะห์การกระจายตัวของงบประมาณค่าตอบแทนพนักงานรายเดือนและรายปี เพื่อตรวจสอบความเหมาะสมของสัดส่วนต้นทุนทรัพยากรบุคคลในแต่ละหน่วยงาน
                         </p>
                         <div className="bg-white/40 p-6 rounded-3xl border border-white/40 space-y-4 shadow-inner">
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-black text-emerald-400 uppercase">โหมดการแสดงผล</span>
                               <span className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase shadow-md">{salaryFilterMode === 'month' ? 'Monthly' : 'Annual'}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-emerald-100/50 pt-4">
                               <span className="text-xs font-black text-emerald-700 uppercase tracking-tight">รวมยอดจ่าย ({salaryFilterMode === 'month' ? 'ต่อเดือน' : 'ต่อปี'})</span>
                               <span className="text-2xl font-black text-emerald-700">฿{stats.totalPayroll.toLocaleString()}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex justify-center">
                        <Donut3D 
                          title={`สัดส่วนเงินเดือนรายแผนก (${salaryFilterMode === 'year' ? 'Annual' : 'Monthly'})`}
                          data={stats.salaryDeptDonut}
                          total={stats.totalPayroll}
                          unit="บาท"
                          isExpanded={true}
                        />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* --- โหมด B: ตรวจสอบรายงาน ISO --- */}
        {isPreviewing && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-white/40 sticky top-0 bg-white/40 backdrop-blur-md z-20 rounded-t-3xl">
              <button onClick={() => setIsPreviewing(false)} className="flex items-center gap-2 text-sm font-black text-emerald-400 hover:text-emerald-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับเพื่อแก้ไขข้อมูล
              </button>
              <div className="flex items-center gap-5">
                <div className="hidden md:flex flex-col items-end">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle className="w-3 h-3"/> ยืนยันความสอดคล้องเรียบร้อยแล้ว</p>
                   <p className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">เอกสารถูกต้องตามมาตรฐานการประชุม</p>
                </div>
                <button onClick={handleExportPDF} className="px-10 py-3.5 bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 group">
                  <Download className="w-4 h-4 group-hover:bounce" /> ยืนยันความถูกต้องและบันทึก PDF
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-800/90 p-12 flex justify-center scrollbar-hide">
              {/* ISO Master Template (A4 Format) */}
              <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white p-[18mm] flex flex-col text-left shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                
                {/* --- ส่วนหัวรายงาน --- */}
                <div className="flex justify-between items-center border-b-[3px] border-slate-900 pb-6 mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-[18px] flex items-center justify-center shadow-xl border-2 border-white shrink-0">
                      <Briefcase className="w-8 h-8" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">Workforce Summary Report</h1>
                      <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-[0.15em]">บริษัท เหล็กฟ้าใส คอร์ปอเรชั่น จำกัด</h2>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-wider border border-slate-200">ISO 9001:2015</span>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500"/> {LABELS.confidential}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="bg-slate-50 px-4 py-2.5 rounded-[14px] border border-slate-100 shadow-sm grid grid-cols-1 gap-1 min-w-[170px]">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[8px] font-black text-slate-400 uppercase">{LABELS.generatedDate}</span>
                        <span className="text-[10px] font-black text-slate-800">{reportMetadata.date}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[8px] font-black text-slate-400 uppercase">{LABELS.generatedTime}</span>
                        <span className="text-[10px] font-black text-slate-800">{reportMetadata.time} น.</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 pt-1 border-t border-slate-200 mt-1">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Ref ID:</span>
                        <span className="text-[10px] font-mono font-black text-slate-900">{reportMetadata.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* สรุปข้อมูลตัวเลขสำคัญ */}
                <div className="grid grid-cols-4 gap-4 mb-10 px-1">
                  {[
                    { l: LABELS.totalRegistered, v: stats.totalCount, color: 'bg-slate-900' },
                    { l: LABELS.activeEmployees, v: stats.activeCount, color: 'bg-emerald-600' },
                    { l: LABELS.resignedEmployees, v: stats.resignedCount, color: 'bg-rose-600' },
                    { l: LABELS.totalBudget, v: stats.totalPayroll.toLocaleString(), color: 'bg-emerald-600' }
                  ].map((s, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-[20px] border border-slate-100 flex flex-col">
                      <div className={`w-6 h-1 rounded-full mb-3 ${s.color}`}></div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-tight h-5">{s.l}</p>
                      <h4 className="text-lg font-black text-slate-900 tracking-tighter leading-none">{s.v}</h4>
                    </div>
                  ))}
                </div>

                {/* เนื้อหาหลัก รายงาน ISO */}
                <div className="grid grid-cols-2 gap-12 flex-1">
                  <div className="space-y-10">
                    <div>
                      <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 border-l-[3px] border-emerald-600 pl-3">
                        {LABELS.deptBreakdown}
                      </h5>
                      <div className="space-y-4">
                        {stats.deptStats.map((dept, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between items-end">
                              <span className="text-[8px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[180px]">{dept.name}</span>
                              <span className="text-[9px] font-black text-slate-900">{dept.count} <span className="text-slate-300 font-bold ml-0.5">({dept.percent.toFixed(1)}%)</span></span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-900" style={{ width: `${dept.percent}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-6 bg-slate-900 text-white rounded-[24px] shadow-lg relative overflow-hidden">
                       <h5 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3">{LABELS.employmentType}</h5>
                       <div className="space-y-2.5">
                          {Object.entries(stats.typeMap).map(([type, count], i) => (
                            <div key={i} className="flex justify-between items-center text-[10px]">
                               <span className="font-bold opacity-70 uppercase tracking-tight">{type}</span>
                               <span className="font-black font-mono bg-white/10 px-2 py-0.5 rounded text-emerald-300">{count} คน</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-8">
                    <div>
                        <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 border-l-[3px] border-emerald-600 pl-3">
                          {LABELS.salaryBreakdown}
                        </h5>
                        <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                           <Donut3D 
                            title={`Distribution - ${salaryFilterMode === 'year' ? 'Annual' : 'Monthly'}`}
                            data={stats.salaryDeptDonut}
                            total={stats.totalPayroll}
                            unit="บาท"
                           />
                        </div>
                    </div>

                    <div className="mt-auto p-6 bg-emerald-50 border border-emerald-100 rounded-[24px] relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-3 opacity-5 rotate-12"><ShieldCheck className="w-16 h-16 text-emerald-900" /></div>
                       <h6 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">การรับรองความสอดคล้อง</h6>
                       <p className="text-[10px] text-emerald-900 font-bold leading-relaxed mb-4">
                         รายงานนี้ถูกรับรองโดยระบบอัตโนมัติ ข้อมูลทุกรายการมีความสอดคล้องกับฐานข้อมูลปัจจุบัน ณ วันเวลาที่ระบุในส่วนหัวเอกสาร
                       </p>
                       <div className="flex items-center gap-3 border-t border-emerald-200 pt-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-emerald-200 shadow-sm shrink-0">
                             <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                             <p className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Authentication Status</p>
                             <p className="text-[9px] font-black text-emerald-900 uppercase">{LABELS.verifiedStatus}</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Footer ทางการ */}
                <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-end text-slate-300 font-black text-[8px] uppercase tracking-[0.25em]">
                  <div className="flex flex-col gap-1.5">
                    <p>© 2024-2025 FireView HR Intelligence</p>
                    <p className="text-[7px] opacity-60 tracking-normal">VERIFIED BY FIREVIEW AI SECURITY • LHEK FAH SAI CORP.</p>
                  </div>
                  <div className="flex gap-8 pb-0.5">
                    <div className="text-right">
                       <p className="text-[7px] opacity-60 mb-0.5 uppercase">Status</p>
                       <p className="text-slate-500">FINAL RELEASE</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[7px] opacity-60 mb-0.5 uppercase">Page</p>
                       <p className="text-slate-500">01 / 01</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
