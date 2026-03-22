import React, { useState, useEffect, useMemo } from 'react';
import { X, FileSpreadsheet, Search, Download, Loader2, Lock, Unlock, Building2, User, MapPin, GraduationCap, Banknote, Briefcase, Calendar, Clock, History, ClipboardList, Thermometer, Baby, ShieldCheck, ArrowLeft, CreditCard, ExternalLink, Image as ImageIcon, Award, Hash, Phone, Navigation, Maximize2, Minimize2, Mars, Venus, Activity, Zap, Star, Files, CheckCircle2, AlertCircle, LayoutGrid, Image as LucideImage } from 'lucide-react';
import { fetchAllSpecifiedCollections, fetchCollectionData } from '../services/firebase';
import { FirestoreDoc, WorkProfileData, AddressData, EducationData, LeaveRequest, WorkPermissionData, DepartmentData } from '../types';

interface AllEmployeeReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeId?: string | null;
}

interface TrainingRecord extends FirestoreDoc {
  employeeId: string;
  courseName: string;
  date: string;
  institution: string;
  result: string;
}

interface MergedReportData extends FirestoreDoc {
  workProfile?: WorkProfileData;
  address?: AddressData;
  education?: EducationData;
  leaves?: LeaveRequest[];
  training?: TrainingRecord[];
  workPermission?: WorkPermissionData;
  phoneNumber?: string;
  idCardNumber?: string;
  birthDateISO?: string;
  nickname?: string;
  idCardImage?: string;
}

const STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ทดลองงาน",
  "พักงาน",
  "ลาออกแล้ว"
];

export const AllEmployeeReportDialog: React.FC<AllEmployeeReportDialogProps> = ({ isOpen, onClose, initialEmployeeId }) => {
  const [data, setData] = useState<MergedReportData[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'list' | 'gallery'>('list');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDossierFullscreen, setIsDossierFullscreen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMergedData();
      loadDepartments();
      setIsUnlocked(false);
      setPin('');
      setSelectedEmployeeId(initialEmployeeId || null);
      setSearchTerm('');
      setSelectedDept('');
      setSelectedStatus('');
      setIsDossierFullscreen(false);
      setActiveTab('list');
    }
  }, [isOpen, initialEmployeeId]);

  const loadDepartments = async () => {
    try {
      const docs = await fetchCollectionData('departments');
      const names = docs.map(d => (d as unknown as DepartmentData).name).sort();
      setDepartmentOptions(names);
    } catch (e) {
      console.warn("Failed to load departments");
    }
  };

  const loadMergedData = async () => {
    setLoading(true);
    try {
      const collections = await fetchAllSpecifiedCollections(['employees', 'work_profiles', 'addresses', 'education', 'history', 'work_permissions', 'training']);
      
      const employees = collections['employees'] || [];
      const workProfiles = collections['work_profiles'] || [];
      const addresses = collections['addresses'] || [];
      const education = collections['education'] || [];
      const history = collections['history'] || [];
      const workPerms = collections['work_permissions'] || [];
      const training = collections['training'] || [];

      const merged = employees.map(emp => {
        const empId = emp.employeeId || emp.id;
        return {
          ...emp,
          workProfile: workProfiles.find(wp => wp.employeeId === empId) as unknown as WorkProfileData | undefined,
          address: addresses.find(addr => addr.employeeId === empId) as unknown as AddressData | undefined,
          education: education.find(edu => edu.employeeId === empId) as unknown as EducationData | undefined,
          leaves: (history as any[]).filter(h => h.employeeId === empId) as LeaveRequest[],
          workPermission: workPerms.find(wp => wp.employeeId === empId) as unknown as WorkPermissionData | undefined,
          training: (training as any[]).filter(t => t.employeeId === empId) as TrainingRecord[],
        } as MergedReportData;
      });

      setData(merged);
    } catch (e) {
      console.error(e);
      setError("ไม่สามารถโหลดข้อมูลรวมได้");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeId?.includes(searchTerm) ||
        item.idCardNumber?.includes(searchTerm);
      
      const matchesDept = selectedDept === '' || item.department === selectedDept;
      
      const empStatus = item.workProfile?.employmentStatus || item.employmentStatus || 'ยังทำงานอยู่';
      const matchesStatus = selectedStatus === '' || empStatus === selectedStatus;
      
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [data, searchTerm, selectedDept, selectedStatus]);

  const groupedData = useMemo(() => {
    const groups: Record<string, MergedReportData[]> = {};
    filteredData.forEach(item => {
      const dept = item.department || 'ไม่ระบุแผนก';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(item);
    });
    return groups;
  }, [filteredData]);

  const selectedEmployee = useMemo(() => {
    return data.find(emp => emp.employeeId === selectedEmployeeId || emp.id === selectedEmployeeId);
  }, [data, selectedEmployeeId]);

  const handleUnlockSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '140812') {
      setIsUnlocked(true);
      setError(null);
    } else {
      setError("PIN ผิด");
      setPin('');
    }
  };

  const calculateAge = (birthDateISO?: string) => {
    if (!birthDateISO) return "-";
    const dob = new Date(birthDateISO);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return `${age} ปี`;
  };

  const calculateTenure = (startDateStr?: string) => {
    if (!startDateStr) return "-";
    const start = new Date(startDateStr);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    return `${years}ปี ${months}ด.`;
  };

  const getLeaveStatsSummary = (leaves: LeaveRequest[] = []) => {
    const currentYear = new Date().getFullYear();
    const yearLeaves = leaves.filter(l => l.status === 'Approved' && new Date(l.startDateTime).getFullYear() === currentYear);
    const countByType = (type: string) => yearLeaves.filter(l => l.leaveType === type).length;
    return {
      sick: countByType('Sick'),
      personal: countByType('Personal'),
      maternity: countByType('Maternity')
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm overflow-hidden text-left text-slate-900">
      <div className={`bg-purple-50/80 backdrop-blur-xl shadow-2xl flex flex-col animate-scale-in overflow-hidden transition-all duration-300 border border-white/40 ${
        isDossierFullscreen ? 'fixed inset-0 w-full h-full z-[60] rounded-none' : 'rounded-[40px] w-full max-w-[98vw] h-[96vh]'
      }`}>
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-8 py-2.5 border-b border-purple-100/50 bg-white/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-lg">
               <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tight text-purple-900 uppercase leading-tight">
                {selectedEmployeeId ? `แฟ้มข้อมูล: ${selectedEmployee?.fullName}` : 'ฐานข้อมูลพนักงานอัจฉริยะ'}
              </h3>
              <p className="text-[12px] font-black text-purple-400 uppercase tracking-[0.3em] leading-none">INTELLIGENT EMPLOYEE DOSSIER SYSTEM</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {selectedEmployeeId && (
               <button onClick={() => setSelectedEmployeeId(null)} className="px-4 py-1.5 bg-white/60 border border-purple-200 rounded-lg text-[11px] font-black uppercase tracking-widest text-purple-600 hover:bg-white flex items-center gap-1.5 transition-all shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /> ย้อนกลับ</button>
             )}
             <button onClick={() => setIsDossierFullscreen(!isDossierFullscreen)} className="p-1.5 bg-white/60 hover:bg-purple-50 border border-purple-200 rounded-lg text-purple-600 transition-all shadow-sm">
                {isDossierFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
             </button>
             <button onClick={onClose} className="p-1 hover:bg-white rounded-full text-slate-300 hover:text-red-500 transition-colors"><X className="w-7 h-7" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
           {!selectedEmployeeId ? (
             <div className="flex-1 flex flex-col">
                {/* Filter Bar */}
                <div className="p-2.5 bg-white/40 border-b border-purple-100/30 flex flex-col md:flex-row gap-2 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                    <input type="text" placeholder="ค้นหาชื่อ, รหัส..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-purple-200 rounded-lg outline-none focus:ring-4 focus:ring-purple-100 text-sm font-bold transition-all placeholder-purple-300" />
                  </div>
                  <div className="flex gap-1.5 w-full md:w-auto">
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="flex-1 md:w-44 pl-3 pr-8 py-1.5 bg-white/60 border border-purple-200 rounded-lg text-[11px] font-black uppercase outline-none appearance-none cursor-pointer">
                      <option value="">ทุกแผนก</option>
                      {departmentOptions.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="flex-1 md:w-44 pl-3 pr-8 py-1.5 bg-white/60 border border-purple-200 rounded-lg text-[11px] font-black uppercase outline-none appearance-none cursor-pointer">
                      <option value="">ทุกสถานะ</option>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  
                  {/* View Toggle Switcher */}
                  <div className="flex p-1 bg-purple-100/50 rounded-xl border border-purple-200">
                    <button onClick={() => setActiveTab('list')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-400 hover:text-purple-600'}`}>
                      <LayoutGrid className="w-3 h-3" /> รายชื่อ
                    </button>
                    <button onClick={() => setActiveTab('gallery')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'gallery' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-400 hover:text-purple-600'}`}>
                      <Files className="w-3 h-3" /> คลังเอกสาร
                    </button>
                  </div>

                  {!isUnlocked ? (
                    <form onSubmit={handleUnlockSalary} className="flex items-center gap-2 bg-amber-50/80 p-1 rounded-lg border border-amber-100">
                       <Lock className="w-3.5 h-3.5 text-amber-600 ml-1.5" />
                       <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="bg-transparent text-sm font-black outline-none w-14 text-amber-900" />
                       <button type="submit" className="px-3 py-1 bg-amber-600 text-white text-[9px] font-black rounded-md uppercase">Unlock</button>
                    </form>
                  ) : <div className="bg-emerald-50/80 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-2"><Unlock className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[9px] font-black text-emerald-600 uppercase">Unlocked</span></div>}
                </div>

                <div className="flex-1 overflow-auto p-4 scrollbar-hide">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">กำลังโหลดฐานข้อมูล...</p>
                    </div>
                  ) : activeTab === 'list' ? (
                    <div className="space-y-6 pb-6">
                      {Object.entries(groupedData).map(([dept, employees]: [string, MergedReportData[]]) => (
                        <div key={dept} className="space-y-2">
                           <div className="flex items-center gap-2 border-b border-purple-100 pb-1">
                              <div className="w-1 h-3 bg-purple-600 rounded-full"></div>
                              <h4 className="text-[12px] font-black text-slate-700 uppercase tracking-wider">{dept} ({employees.length})</h4>
                           </div>
                           <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                             {employees.map(item => {
                               const isM = item.gender === 'ชาย';
                               const isF = item.gender === 'หญิง';
                               return (
                                 <div 
                                   key={item.id} 
                                   onClick={() => setSelectedEmployeeId(item.employeeId)} 
                                   className={`group relative backdrop-blur-md rounded-xl border p-1.5 shadow-sm hover:shadow-lg hover:border-purple-400 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col items-center text-center ${isM ? 'bg-blue-50/40 border-blue-100' : isF ? 'bg-rose-50/40 border-rose-100' : 'bg-white/60 border-white/60'}`}
                                 >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white shadow-sm mb-1 group-hover:scale-105 transition-transform bg-white shrink-0">
                                      {item.employeeImage ? <img src={item.employeeImage} className="w-full h-full object-cover" /> : <User className="w-6 h-6 m-3 text-slate-100" />}
                                    </div>
                                    <h5 className="text-[11px] font-black text-slate-800 leading-tight line-clamp-1 w-full px-0.5">{item.fullName.split(' ').pop()}</h5>
                                    <div className="flex items-center gap-1 mt-0.5 opacity-60">
                                       <span className="text-[8px] font-bold text-slate-500 uppercase">ID: {item.employeeId}</span>
                                       {item.nickname && <span className="text-[8px] font-black text-indigo-500">({item.nickname})</span>}
                                    </div>
                                 </div>
                             )})}
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* --- Media Gallery View --- */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                      {filteredData.map(item => {
                         const hasPortrait = !!item.employeeImage;
                         const hasID = !!item.idCardImage;
                         const hasHouse = !!item.address?.houseRegistrationImage;
                         const hasEdu = !!item.education?.certificateImage;
                         const docsCount = [hasPortrait, hasID, hasHouse, hasEdu].filter(Boolean).length;
                         
                         return (
                           <div key={item.id} className="bg-white/60 backdrop-blur-md rounded-[28px] border border-white/60 p-4 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                              <div className="flex items-center justify-between mb-3">
                                 <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">{item.employeeId}</div>
                                    <div className="overflow-hidden">
                                       <p className="text-[11px] font-black text-slate-900 truncate leading-tight">{item.fullName}</p>
                                       <p className="text-[8px] font-bold text-purple-400 uppercase tracking-tighter">{item.department || 'GENERAL'}</p>
                                    </div>
                                 </div>
                                 <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 border ${docsCount === 4 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {docsCount === 4 ? <CheckCircle2 className="w-2 h-2" /> : <AlertCircle className="w-2 h-2" />}
                                    Docs: {docsCount}/4
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                 {/* Portrait */}
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Portrait</p>
                                    <div onClick={() => item.employeeImage && setPreviewImage(item.employeeImage)} className={`aspect-square rounded-xl border border-dashed flex items-center justify-center overflow-hidden transition-all ${hasPortrait ? 'border-indigo-200 cursor-pointer hover:border-indigo-500' : 'border-slate-200 bg-slate-50 opacity-40'}`}>
                                       {hasPortrait ? <img src={item.employeeImage} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-200" />}
                                    </div>
                                 </div>
                                 {/* ID Card */}
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">ID Card</p>
                                    <div onClick={() => item.idCardImage && setPreviewImage(item.idCardImage)} className={`aspect-square rounded-xl border border-dashed flex items-center justify-center overflow-hidden transition-all ${hasID ? 'border-blue-200 cursor-pointer hover:border-blue-500' : 'border-slate-200 bg-slate-50 opacity-40'}`}>
                                       {hasID ? <img src={item.idCardImage} className="w-full h-full object-cover" /> : <CreditCard className="w-5 h-5 text-slate-200" />}
                                    </div>
                                 </div>
                                 {/* House Reg */}
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">House Reg</p>
                                    <div onClick={() => item.address?.houseRegistrationImage && setPreviewImage(item.address.houseRegistrationImage)} className={`aspect-square rounded-xl border border-dashed flex items-center justify-center overflow-hidden transition-all ${hasHouse ? 'border-rose-200 cursor-pointer hover:border-rose-500' : 'border-slate-200 bg-slate-50 opacity-40'}`}>
                                       {hasHouse ? <img src={item.address?.houseRegistrationImage} className="w-full h-full object-cover" /> : <MapPin className="w-5 h-5 text-slate-200" />}
                                    </div>
                                 </div>
                                 {/* Education */}
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Edu Cert</p>
                                    <div onClick={() => item.education?.certificateImage && setPreviewImage(item.education.certificateImage)} className={`aspect-square rounded-xl border border-dashed flex items-center justify-center overflow-hidden transition-all ${hasEdu ? 'border-amber-200 cursor-pointer hover:border-amber-500' : 'border-slate-200 bg-slate-50 opacity-40'}`}>
                                       {hasEdu ? <img src={item.education?.certificateImage} className="w-full h-full object-cover" /> : <GraduationCap className="w-5 h-5 text-slate-200" />}
                                    </div>
                                 </div>
                              </div>
                              
                              <button onClick={() => setSelectedEmployeeId(item.employeeId)} className="mt-3 w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 flex items-center justify-center gap-2">
                                <Zap className="w-3 h-3" /> เปิดแฟ้มประวัติ
                              </button>
                           </div>
                         );
                      })}
                    </div>
                  )}
                </div>
             </div>
           ) : selectedEmployee ? (
             <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in space-y-4 bg-transparent">
                
                {/* 1. Dossier Header - Inline Mini KPI (Reduced Padding & Gaps) */}
                <div className="bg-white/60 backdrop-blur-md p-4 rounded-[32px] border border-white/60 shadow-xl flex flex-col md:flex-row items-center gap-5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.02]"><ShieldCheck className="w-48 h-48 text-slate-900" /></div>
                   
                   <div className="relative">
                      <div className="w-28 h-28 rounded-[24px] border-[4px] border-white shadow-xl overflow-hidden shrink-0">
                         {selectedEmployee.employeeImage ? <img src={selectedEmployee.employeeImage} className="w-full h-full object-cover" /> : <User className="w-14 h-14 m-7 text-slate-100" />}
                      </div>
                      <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-lg shadow-lg border border-white flex items-center justify-center ${selectedEmployee.gender === 'ชาย' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'}`}>
                         {selectedEmployee.gender === 'ชาย' ? <Mars className="w-3.5 h-3.5" /> : <Venus className="w-3.5 h-3.5" />}
                      </div>
                   </div>

                   <div className="flex-1 text-center md:text-left z-10">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                         <h2 className="text-[28px] font-black text-slate-900 leading-none">{selectedEmployee.title}{selectedEmployee.fullName}</h2>
                         <div className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest shadow-md">UID: {selectedEmployee.employeeId}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                         {[
                           { label: 'ชื่อเล่น', val: selectedEmployee.nickname || '-', color: 'indigo' },
                           { label: 'อายุตัว', val: calculateAge(selectedEmployee.birthDateISO), color: 'rose' },
                           { label: 'อายุงาน', val: calculateTenure(selectedEmployee.workProfile?.startDate), color: 'emerald' },
                           { label: 'สถานะ', val: selectedEmployee.workProfile?.employmentStatus || 'ACTIVE', color: 'slate' }
                         ].map((kpi, idx) => (
                           <div key={idx} className="bg-white/40 p-2 rounded-xl border border-white/60 flex items-center justify-between px-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{kpi.label}:</span>
                              <span className={`text-[12px] font-black text-${kpi.color}-700 uppercase`}>{kpi.val}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* 2. Main Content Grid - 3 Columns with Professional Inline Rows (Reduced Padding & Spacing) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
                   
                   {/* Column 1: Career */}
                   <div className="space-y-4">
                      <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white/60 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-[0.03]"><Briefcase className="w-16 h-16" /></div>
                         <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-3 bg-indigo-600 rounded-full"></div> ข้อมูลตำแหน่งและสังกัด
                         </h5>
                         <div className="space-y-1">
                            <div className="flex justify-between items-center py-1 border-b border-indigo-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">แผนก</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.workPermission?.department || selectedEmployee.department || '-'}</span></div>
                            <div className="flex justify-between items-center py-1 border-b border-indigo-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">ตำแหน่ง</span><span className="text-[13px] font-black text-slate-700 uppercase leading-tight">{selectedEmployee.workPermission?.position || selectedEmployee.workProfile?.position || '-'}</span></div>
                            <div className="flex justify-between items-center py-1 border-b border-indigo-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">Code</span><span className="text-[11px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded leading-none">{selectedEmployee.workPermission?.workingCode || 'NO_CODE'}</span></div>
                            <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold text-slate-400 uppercase">ทักษะ</span><span className="text-[13px] font-black text-slate-600 leading-tight">{selectedEmployee.workPermission?.expertiseLevel || '-'}</span></div>
                         </div>
                      </div>

                      <div className="bg-slate-900 rounded-[24px] p-4 text-white relative overflow-hidden shadow-xl">
                         <div className="absolute top-0 right-0 p-3 opacity-10"><History className="w-16 h-16" /></div>
                         <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-3 bg-emerald-400 rounded-full"></div> สถิติการลาปีปัจจุบัน
                         </h5>
                         {(() => {
                           const stats = getLeaveStatsSummary(selectedEmployee.leaves);
                           return (
                             <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { l: 'ลาป่วย', v: stats.sick, c: 'rose' },
                                  { l: 'ลากิจ', v: stats.personal, c: 'blue' },
                                  { l: 'ลาคลอด', v: stats.maternity, c: 'purple' }
                                ].map((s, i) => (
                                  <div key={i} className="text-center bg-white/10 p-2 rounded-xl border border-white/5 backdrop-blur-md">
                                     <p className={`text-[9px] font-black text-${s.c}-400 uppercase mb-0.5`}>{s.l}</p>
                                     <p className="text-xl font-black leading-none">{s.v}</p>
                                     <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">ครั้ง</p>
                                  </div>
                                ))}
                             </div>
                           );
                         })()}
                      </div>
                   </div>

                   {/* Column 2: Employment */}
                   <div className="space-y-4">
                      <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white/60 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-[0.03]"><Banknote className="w-16 h-16" /></div>
                         <h5 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-3 bg-emerald-600 rounded-full"></div> ข้อมูลจ้างงานและรายได้
                         </h5>
                         <div className="space-y-1">
                            <div className="flex justify-between items-center py-1 border-b border-emerald-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">วันเริ่มงาน</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.workProfile?.startDate ? new Date(selectedEmployee.workProfile.startDate).toLocaleDateString('th-TH') : '-'}</span></div>
                            <div className="flex justify-between items-center py-1 border-b border-emerald-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">ประเภทจ้าง</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.workProfile?.employmentType || '-'}</span></div>
                            <div className="flex justify-between items-center py-1 border-b border-emerald-50/50">
                               <span className="text-[10px] font-bold text-slate-400 uppercase">รายได้</span>
                               {isUnlocked ? (
                                 <span className="text-[16px] font-black text-emerald-700 leading-none">฿ {selectedEmployee.workProfile?.salary?.toLocaleString()}</span>
                               ) : (
                                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic"><Lock className="inline w-3 h-3 mr-1" /> LOCKED</span>
                               )}
                            </div>
                            <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold text-slate-400 uppercase">เลขบัญชี</span><span className="text-[12px] font-mono font-black text-slate-600 leading-none">{isUnlocked ? (selectedEmployee.workProfile?.bankAccountNumber || '-') : 'XXXX-X-XXXXX-X'}</span></div>
                         </div>
                      </div>

                      <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white/60 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-[0.03]"><GraduationCap className="w-16 h-16" /></div>
                         <h5 className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-3 bg-amber-600 rounded-full"></div> การศึกษาและทักษะ
                         </h5>
                         <div className="space-y-1">
                            <div className="flex justify-between items-center py-1 border-b border-amber-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">วุฒิสูงสุด</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.education?.highestLevel || '-'}</span></div>
                            <div className="flex justify-between items-center py-1 border-b border-amber-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">จบปี</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.education?.graduationYear || '-'}</span></div>
                            <div className="py-1">
                               <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">ทักษะ:</span>
                               <p className="text-[12px] font-medium text-slate-500 leading-tight italic line-clamp-1">"{selectedEmployee.education?.skills || 'ไม่มีข้อมูลเพิ่ม'}"</p>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Column 3: Contact & Docs */}
                   <div className="space-y-4">
                      <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white/60 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-[0.03]"><MapPin className="w-16 h-16" /></div>
                         <h5 className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-3 bg-rose-600 rounded-full"></div> ที่อยู่และการติดต่อ
                         </h5>
                         <div className="space-y-1">
                            <div className="flex justify-between items-center py-1 border-b border-rose-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">โทรศัพท์</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.phoneNumber || '-'}</span></div>
                            <div className="flex justify-between items-center py-1 border-b border-rose-50/50"><span className="text-[10px] font-bold text-slate-400 uppercase">จังหวัด</span><span className="text-[13px] font-black text-slate-700 leading-tight">{selectedEmployee.address?.province || '-'}</span></div>
                            <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Maps</span>{selectedEmployee.address?.latitude ? <a href={`https://www.google.com/maps?q=${selectedEmployee.address.latitude},${selectedEmployee.address.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-black text-indigo-600 uppercase hover:underline leading-none"><Navigation className="w-3 h-3" /> พิกัด</a> : <span className="text-[11px] font-bold text-slate-300 italic">No Data</span>}</div>
                         </div>
                      </div>

                      <div className="bg-indigo-900 rounded-[24px] p-4 text-white relative overflow-hidden shadow-xl">
                         <div className="absolute top-0 right-0 p-3 opacity-10"><Zap className="w-14 h-14 text-yellow-300" /></div>
                         <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                           <div className="w-1 h-3 bg-indigo-300 rounded-full"></div> เอกสารดิจิทัล
                         </h5>
                         <div className="grid grid-cols-2 gap-2">
                            {[
                               { l: 'บัตร ปชช.', u: selectedEmployee.idCardImage },
                               { l: 'ทบ. บ้าน', u: selectedEmployee.address?.houseRegistrationImage },
                               { l: 'วุฒิการศึกษา', u: selectedEmployee.education?.certificateImage },
                               { l: 'JD งาน', u: selectedEmployee.workPermission?.jobDescriptionUrl }
                            ].filter(i => i.u).map((doc, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => doc.u && setPreviewImage(doc.u)}
                                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl border border-white/10 transition-all flex flex-col items-center gap-1 group/btn"
                              >
                                 <ImageIcon className="w-4 h-4 text-indigo-200 group-hover/btn:scale-110 transition-transform" />
                                 <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">{doc.l}</span>
                              </button>
                            ))}
                         </div>
                      </div>
                   </div>

                </div>
             </div>
           ) : null}
        </div>
        
        {/* --- Image Preview Overlay --- */}
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-10 animate-fade-in" onClick={() => setPreviewImage(null)}>
             <div className="absolute top-5 right-5 flex gap-4">
                <button onClick={() => window.open(previewImage, '_blank')} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all shadow-xl"><ExternalLink className="w-6 h-6" /></button>
                <button onClick={() => setPreviewImage(null)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all shadow-xl"><X className="w-6 h-6" /></button>
             </div>
             <img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* --- Footer --- */}
        <div className="p-2.5 border-t border-purple-100/30 bg-white/40 flex justify-between items-center px-10 text-purple-300">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] font-black uppercase tracking-widest">Master Database Verified</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-[10px] font-black uppercase tracking-widest">TLS 1.3 Encryption</span></div>
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">FireView Intelligent Dossier v5.4 • All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
};