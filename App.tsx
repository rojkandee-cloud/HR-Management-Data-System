
import React, { useState, useEffect, useRef } from 'react';
import { Database, Search, RefreshCw, AlertCircle, Layers, UserPlus, LayoutGrid, Table as TableIcon, Pencil, Trash2, User, Loader2, Cake, MapPin, GraduationCap, Menu, X, Briefcase, ScrollText, History, Wifi, WifiOff, Clock, Lock, Unlock, QrCode, ScanLine, Filter, BarChart3, PieChart, Building2, DownloadCloud, BookOpen, Monitor, Smartphone, CreditCard, Maximize2, Minimize2, FileSpreadsheet, Calendar, CalendarClock, MessageCircle, Activity, CheckSquare, Square, Target, Fingerprint, ClipboardList, TableProperties, ShieldCheck, LogOut, ShieldAlert, Check, Plus } from 'lucide-react';
import { fetchCollectionData, addDocumentToCollection, setDocumentWithId, deleteDocumentFromCollection, fetchAllSpecifiedCollections } from './services/firebase';
import { askCrossCollectionQuestion } from './services/geminiService';
import { FirestoreDoc, FetchStatus, DepartmentData } from './types';
import { InsightPanel } from './components/InsightPanel';
import { EmployeeFormDialog } from './components/EmployeeFormDialog';
import { EmployeeTag } from './components/EmployeeTag';
import { EmployeeTable } from './components/EmployeeTable';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AddressFormDialog } from './components/AddressFormDialog';
import { EducationFormDialog } from './components/EducationFormDialog';
import { WorkPermissionDialog } from './components/WorkPermissionDialog';
import { WorkProfileDialog } from './components/WorkProfileDialog';
import { LeaveHistoryDialog } from './components/LeaveHistoryDialog';
import { CompanyLeaveReportDialog } from './components/CompanyLeaveReportDialog';
import { WorkforceDashboardDialog } from './components/WorkforceDashboardDialog';
import { WorkPermissionDashboardDialog } from './components/WorkPermissionDashboardDialog';
import { DepartmentFormDialog } from './components/DepartmentFormDialog';
import { DepartmentCard } from './components/DepartmentCard';
import { DepartmentPositionsDialog } from './components/DepartmentPositionsDialog';
import { JobPositionDashboard } from './components/JobPositionDashboard';
import { AiAssistant } from './components/AiAssistant';
import { IdCardGeneratorDialog } from './components/IdCardGeneratorDialog';
import { AllEmployeeReportDialog } from './components/AllEmployeeReportDialog';
import { WorkCalendarDialog } from './components/WorkCalendarDialog';
import { LineAiBridgeDialog } from './components/LineAiBridgeDialog';
import { AttendanceDialog } from './components/AttendanceDialog';
import { WorkHistoryReportDialog } from './components/WorkHistoryReportDialog';
import { DailyWorkHourReportDialog } from './components/DailyWorkHourReportDialog';
import { LoginOverlay } from './components/LoginOverlay';

const DEFAULT_COLLECTION = "employees";
const SECURE_PIN = "0005284015";

const ALLOWED_COLLECTIONS = [
  { id: "employees", label: "ข้อมูลพนักงาน (Employees)" },
  { id: "attendance", label: "บันทึกเวลาทำงาน (Attendance)" },
  { id: "departments", label: "ข้อมูลแผนก (Departments)" },
  { id: "job_positions", label: "ตำแหน่งงาน (Job Positions)" },
  { id: "education", label: "การศึกษา (Education)" },
  { id: "addresses", label: "ที่อยู่ (Addresses)" },
  { id: "history", label: "ประวัติการลา (Leave History)" },
  { id: "work_permissions", label: "ใบอนุญาตทำงาน (Permissions)" },
  { id: "work_profiles", label: "ข้อมูลการจ้างงาน (Profiles)" },
  { id: "work_timing", label: "ปฏิทินวันทำงาน (Schedule)" },
];

const getOS = () => {
  const userAgent = window.navigator.userAgent;
  const platform = (window.navigator as any).platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  let os = 'Unknown OS';

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'macOS';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = 'iOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'Windows';
  } else if (/Android/.test(userAgent)) {
    os = 'Android';
  } else if (!os && /Linux/.test(platform)) {
    os = 'Linux';
  }
  return os;
};

function ClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-4 bg-white/10 px-3 py-1 rounded-full border border-white/20">
       <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /><span>{currentTime.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
       <div className="w-px h-3 bg-white/20"></div>
       <div className="flex items-center gap-2 font-mono"><Clock className="w-3.5 h-3.5" /><span className="text-[13px] tracking-widest">{currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.</span></div>
    </div>
  );
}

export default function App() {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirestoreDoc | null>(null);

  const [collectionName, setCollectionName] = useState(DEFAULT_COLLECTION);
  const [isCollectionLocked, setIsCollectionLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState(false);
  
  const [documents, setDocuments] = useState<FirestoreDoc[]>([]);
  const [departmentList, setDepartmentList] = useState<string[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); 
  const [selectedIds, setSelectedIds] = useState<string[]>([]); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [osName, setOsName] = useState('');
  
  // Unlock Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // Dialog States
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<FirestoreDoc | null>(null);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressTarget, setAddressTarget] = useState<{id: string, name: string} | null>(null);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [educationTarget, setEducationTarget] = useState<{id: string, name: string} | null>(null);
  const [isWorkPermissionModalOpen, setIsWorkPermissionModalOpen] = useState(false);
  const [workPermissionTarget, setWorkPermissionTarget] = useState<{id: string, name: string} | null>(null);
  const [isWorkProfileModalOpen, setIsWorkProfileModalOpen] = useState(false);
  const [workProfileTarget, setWorkProfileTarget] = useState<{id: string, name: string} | null>(null);
  const [isLeaveHistoryModalOpen, setIsLeaveHistoryModalOpen] = useState(false);
  const [leaveHistoryTarget, setLeaveHistoryTarget] = useState<{id: string, name: string} | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isWorkforceModalOpen, setIsWorkforceModalOpen] = useState(false);
  const [isWorkPermissionDashboardOpen, setIsWorkPermissionDashboardOpen] = useState(false);
  const [isDeptPositionsModalOpen, setIsDeptPositionsModalOpen] = useState(false);
  const [deptPositionsTarget, setDeptPositionsTarget] = useState<{id: string, name: string} | null>(null);
  const [isGlobalJobPosDashboardOpen, setIsGlobalJobPosDashboardOpen] = useState(false);
  const [isIdCardGeneratorOpen, setIsIdCardGeneratorOpen] = useState(false);
  const [isAllEmployeeReportOpen, setIsAllEmployeeReportOpen] = useState(false);
  const [initialDossierId, setInitialDossierId] = useState<string | null>(null);
  const [isWorkCalendarOpen, setIsWorkCalendarOpen] = useState(false);
  const [isAttendanceTerminalOpen, setIsAttendanceTerminalOpen] = useState(false);
  const [isWorkHistoryReportOpen, setIsWorkHistoryReportOpen] = useState(false);
  const [isDailyWorkHourReportOpen, setIsDailyWorkHourReportOpen] = useState(false);
  
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOsName(getOS());
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async (name: string) => {
    setStatus('loading');
    setErrorMsg(null);
    setSelectedIds([]);
    try {
      if (name === 'employees') {
        const [empData, profileData] = await Promise.all([
          fetchCollectionData('employees'),
          fetchCollectionData('work_profiles')
        ]);
        const merged: any[] = empData.map(emp => {
          const profile = profileData.find(p => p.employeeId === emp.employeeId || p.employeeId === emp.id);
          return {
            ...emp,
            employmentStatus: profile?.employmentStatus || emp.employmentStatus || 'ยังทำงานอยู่'
          };
        });
        setDocuments(merged);
        const uniqueDepts = Array.from(new Set(merged.map(d => d.department).filter(Boolean))).sort() as string[];
        setDepartmentList(uniqueDepts);
      } else {
        const data = await fetchCollectionData(name);
        setDocuments(data);
        if (name === 'departments') {
          setDepartmentList(data.map(d => (d as unknown as DepartmentData).name).sort());
        }
      }
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || "Failed to fetch data.");
    }
  };

  const filteredDocuments = React.useMemo(() => {
    return documents.filter(doc => {
      const lowerTerm = searchTerm.toLowerCase().trim();
      if (departmentFilter && (doc.department !== departmentFilter)) return false;
      if (statusFilter && (doc.employmentStatus !== statusFilter)) return false;
      if (lowerTerm === '') return true;
      return Object.entries(doc).some(([key, val]) => {
         if (['image', 'signature', 'qrcode', 'url'].some(ex => key.toLowerCase().includes(ex))) return false;
         return val && String(val).toLowerCase().includes(lowerTerm);
      });
    });
  }, [documents, searchTerm, departmentFilter, statusFilter]);

  const handleEditEmployee = React.useCallback((emp: any) => { setEditingEmployee(emp); setIsEmployeeModalOpen(true); }, []);
  const handleManageAddress = React.useCallback((id: string, name: string) => { setAddressTarget({id, name}); setIsAddressModalOpen(true); }, []);
  const handleManageEducation = React.useCallback((id: string, name: string) => { setEducationTarget({id, name}); setIsEducationModalOpen(true); }, []);
  const handleManageWorkPermission = React.useCallback((id: string, name: string) => { setWorkPermissionTarget({id, name}); setIsWorkPermissionModalOpen(true); }, []);
  const handleManageWorkProfile = React.useCallback((id: string, name: string) => { setWorkProfileTarget({id, name}); setIsWorkProfileModalOpen(true); }, []);
  const handleManageLeaveHistory = React.useCallback((id: string, name: string) => { setLeaveHistoryTarget({id, name}); setIsLeaveHistoryModalOpen(true); }, []);
  const handleViewDossier = React.useCallback((empId: string) => { setInitialDossierId(empId); setIsAllEmployeeReportOpen(true); }, []);
  const handleEditDepartment = React.useCallback((d: any) => { setEditingDepartment(d); setIsDepartmentModalOpen(true); }, []);
  const handleManagePositions = React.useCallback((d: any) => { if(d.departmentId) { setDeptPositionsTarget({id: d.departmentId, name: d.name}); setIsDeptPositionsModalOpen(true); } }, []);

  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleRegisterClick = React.useCallback(() => {
    if (collectionName === 'employees') {
      setEditingEmployee(null);
      setIsEmployeeModalOpen(true);
    } else if (collectionName === 'departments') {
      setEditingDepartment(null);
      setIsDepartmentModalOpen(true);
    }
  }, [collectionName]);

  const handleSelectFiltered = React.useCallback((sel: boolean) => {
    if (sel) setSelectedIds(prev => Array.from(new Set([...prev, ...filteredDocuments.map(d => d.id)])));
    else setSelectedIds(prev => prev.filter(id => !filteredDocuments.some(d => d.id === id)));
  }, [filteredDocuments]);

  const handleGlobalAsk = React.useCallback(async (question: string): Promise<any> => { 
    try { 
      const colNames = ALLOWED_COLLECTIONS.map(c => c.id); 
      const allData = await fetchAllSpecifiedCollections(colNames); 
      return await askCrossCollectionQuestion(allData, question); 
    } catch (e) { 
      return "เกิดข้อผิดพลาดในการค้นหาข้อมูล"; 
    } 
  }, []);

  const handleSaveEmployee = async (id: string, data: any) => { await setDocumentWithId('employees', id, data); await loadData('employees'); setEditingEmployee(null); };
  const requestDeleteEmployee = React.useCallback((id: string) => { setDeleteTargetId(id); setIsConfirmDialogOpen(true); }, []);
  const executeDeleteEmployee = React.useCallback(async () => { if (!deleteTargetId) return; setIsDeleting(true); try { await deleteDocumentFromCollection(collectionName, deleteTargetId); setDocuments(prev => prev.filter(doc => doc.id !== deleteTargetId)); setIsConfirmDialogOpen(false); setDeleteTargetId(null); } finally { setIsDeleting(false); } }, [deleteTargetId, collectionName]);

  const handleLogout = React.useCallback(() => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setIsAttendanceTerminalOpen(false);
  }, []);

  const handleGlobalUnlock = React.useCallback(() => {
    setIsAdmin(true);
    setIsUnlockModalOpen(false);
  }, []);

  const handlePinUnlock = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === SECURE_PIN) {
      setIsCollectionLocked(false);
      setShowPinInput(false);
      setPinInput('');
      setPinError(false);
      loadData(collectionName);
    } else {
      setPinError(true);
      setPinInput('');
    }
  }, [pinInput, collectionName]);

  useEffect(() => { 
    if (isAdmin) loadData(collectionName); 
  }, [isAdmin, collectionName]);

  const handleLoginSuccess = React.useCallback((emp: FirestoreDoc) => {
    setCurrentUser(emp);
    setIsLoggedIn(true);
    setIsAttendanceTerminalOpen(true);
  }, []);

  if (!isLoggedIn && !isAdmin) {
    return (
      <LoginOverlay 
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-900">
      {!isOnline && (<div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold shadow-xl animate-pulse"><WifiOff className="w-5 h-5" /><span>ขาดการเชื่อมต่ออินเทอร์เน็ต (Offline)</span></div>)}
      
      <div className={`sticky top-0 z-[40] ${isOnline ? 'bg-emerald-600/90' : 'bg-red-600/90'} backdrop-blur-md text-white flex flex-col sm:flex-row items-center justify-between gap-2 py-1.5 px-6 text-xs font-bold shadow-md`}>
        <div className="flex items-center gap-2">{isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}<span>สถานะ: {isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span></div>
        <ClockWidget />
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {isSidebarOpen && (
          <aside className="w-full md:w-72 bg-white/85 backdrop-blur-md border-r border-amber-900/10 flex flex-col shrink-0 sticky top-[64px] h-[calc(100vh-64px)] z-40">
            <div className="p-5 border-b border-amber-900/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-600">
                <div className="p-1.5 bg-indigo-50/80 rounded-lg"><Database className="w-5 h-5" /></div>
                <span className="font-bold text-lg tracking-tight">FireView</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide">
              <button onClick={() => setIsAttendanceTerminalOpen(true)} className="w-full py-3 px-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-xl transition-all flex items-center justify-start gap-2.5 uppercase tracking-widest mb-2 active:scale-95">
                <Fingerprint className="w-5 h-5 text-indigo-400" />ยืนยันตัวตนลงเวลา
              </button>
              
              {isAdmin ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => setIsEmployeeModalOpen(true)} disabled={!isOnline} className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow transition-all flex items-center justify-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />พนักงาน
                    </button>
                    <button onClick={() => setIsDepartmentModalOpen(true)} disabled={!isOnline} className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded-lg shadow transition-all flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />เพิ่มแผนก
                    </button>
                  </div>
                  
                  <div className="h-2"></div>
                  <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Analytics Hub</p>
                  <button onClick={() => setIsDailyWorkHourReportOpen(true)} className="w-full py-2 px-3 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold rounded-lg flex items-center justify-start gap-2.5 border border-indigo-100"><TableProperties className="w-4 h-4" />ตารางงานรายวัน</button>
                  <button onClick={() => setIsWorkHistoryReportOpen(true)} className="w-full py-2 px-3 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-bold rounded-lg flex items-center justify-start gap-2.5 border border-amber-100"><ClipboardList className="w-4 h-4" />ประวัติและสรุปชม.งาน</button>
                  <button onClick={() => setIsAllEmployeeReportOpen(true)} className="w-full py-2 px-3 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold rounded-lg flex items-center justify-start gap-2.5 border border-indigo-100"><FileSpreadsheet className="w-4 h-4" />รายงานข้อมูลรวม</button>
                  <button onClick={() => setIsIdCardGeneratorOpen(true)} className="w-full py-2 px-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-start gap-2.5"><CreditCard className="w-4 h-4" />สร้างบัตรพนักงาน</button>
                  <button onClick={() => setIsGlobalJobPosDashboardOpen(true)} className="w-full py-2 px-3 text-slate-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold rounded-lg flex items-center justify-start gap-2.5"><Target className="w-4 h-4" />วิเคราะห์ตำแหน่งงาน</button>
                  <button onClick={() => setIsWorkPermissionDashboardOpen(true)} className="w-full py-2 px-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-start gap-2.5"><Briefcase className="w-4 h-4" />ใบอนุญาตและตำแหน่ง</button>
                  <button onClick={() => setIsReportModalOpen(true)} className="w-full py-2 px-3 text-slate-600 hover:bg-indigo-50 text-xs font-semibold rounded-lg flex items-center justify-start gap-2.5"><BarChart3 className="w-4 h-4" />การลาหยุด</button>
                  <button onClick={() => setIsWorkforceModalOpen(true)} className="w-full py-2 px-3 text-slate-600 hover:bg-emerald-50 text-xs font-semibold rounded-lg flex items-center justify-start gap-2.5"><PieChart className="w-4 h-4" />อัตรากำลัง</button>
                  <button onClick={() => setIsWorkCalendarOpen(true)} className="w-full py-2 px-3 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-lg flex items-center justify-start gap-2.5"><Calendar className="w-4 h-4" />ปฏิทินบริษัท</button>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 relative">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Database Access</label>
                      {isCollectionLocked ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1.5">
                            <div className="flex-1 px-2.5 py-1.5 bg-slate-200/80 text-slate-500 text-[11px] rounded-md border border-slate-300 select-none cursor-not-allowed flex items-center">
                              <Lock className="w-3 h-3 mr-2" /><span className="truncate">{ALLOWED_COLLECTIONS.find(c => c.id === collectionName)?.label.split('(')[0]}</span>
                            </div>
                            <button onClick={() => { setShowPinInput(!showPinInput); setPinError(false); }} className={`p-1.5 rounded-md transition-all ${showPinInput ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}><Lock className="w-3.5 h-3.5" /></button>
                          </div>
                          
                          {showPinInput && (
                            <form onSubmit={handlePinUnlock} className="flex gap-1.5 animate-fade-in-down">
                              <input 
                                type="password" 
                                placeholder="PIN..." 
                                value={pinInput}
                                onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                                autoFocus
                                className={`flex-1 p-1.5 rounded-md text-[11px] border outline-none transition-all ${pinError ? 'border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-100' : 'border-indigo-200 bg-white focus:border-indigo-500'}`}
                              />
                              <button type="submit" className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm active:scale-95"><Check className="w-3.5 h-3.5" /></button>
                            </form>
                          )}
                          {pinError && <p className="text-[9px] font-bold text-rose-500 text-center animate-shake">รหัสผ่านไม่ถูกต้อง</p>}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <select value={collectionName} onChange={(e) => setCollectionName(e.target.value)} className="flex-1 p-1.5 bg-white/80 border border-green-400 rounded-md text-[11px] text-slate-800 outline-none">
                            {ALLOWED_COLLECTIONS.map(col => (<option key={col.id} value={col.id}>{col.label}</option>))}
                          </select>
                          <button onClick={() => setIsCollectionLocked(true)} className="p-1.5 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"><Unlock className="w-3.5 h-3.5 text-green-500" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-auto space-y-3">
                   <button 
                     onClick={() => setIsUnlockModalOpen(true)}
                     className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                   >
                     <Unlock className="w-3.5 h-3.5" /> Unlock System Admin
                   </button>
                   <div className="p-4 bg-indigo-900 rounded-[24px] text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10"><ShieldCheck className="w-12 h-12" /></div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300 mb-1">Security Mode</p>
                      <p className="text-[10px] font-bold leading-tight">โหมดพนักงาน จำกัดการเข้าถึงเฉพาะส่วนลงเวลาเท่านั้น</p>
                   </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-amber-900/5 bg-slate-50 flex flex-col gap-3">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                     <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="overflow-hidden">
                     <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Signed in as</p>
                     <p className="text-xs font-black text-slate-800 truncate uppercase">{isAdmin ? 'System Admin' : currentUser?.fullName || 'Employee'}</p>
                  </div>
               </div>
               <button onClick={handleLogout} className="w-full py-2 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-rose-100 transition-all border border-rose-100">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
               </button>
            </div>
            <div className="p-4 pt-1 bg-slate-50/30 text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">FIREVIEW INTELLIGENCE v7.0</div>
          </aside>
        )}

        <main className={`flex-1 p-4 md:p-8 overflow-y-auto relative ${!isAdmin ? 'bg-slate-200/50 backdrop-blur-md' : ''}`}>
          {!isAdmin && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-10 text-center">
               <div className="bg-white/80 p-12 rounded-[50px] shadow-2xl border border-white/50 backdrop-blur-xl animate-fade-in pointer-events-auto max-w-lg">
                  <div className="w-24 h-24 bg-indigo-600 text-white rounded-[32px] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-indigo-200">
                     <ShieldCheck className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-4 uppercase">Restricted Access</h3>
                  <p className="text-slate-500 font-bold leading-relaxed mb-10">โหมดพนักงาน: ท่านสามารถใช้งานได้เฉพาะ "ระบบลงเวลาทำงาน" เท่านั้น หากต้องการเข้าถึงส่วนบริหารจัดการ กรุณาใช้รหัส Admin Unlock</p>
                  <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => setIsAttendanceTerminalOpen(true)}
                        className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Fingerprint className="w-6 h-6 text-indigo-400" /> เข้าสู่ระบบลงเวลา
                    </button>
                    <button 
                        onClick={() => setIsUnlockModalOpen(true)}
                        className="w-full py-3 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest border-2 border-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Unlock className="w-4 h-4" /> Admin Unlock
                    </button>
                  </div>
               </div>
            </div>
          )}

          {isAdmin && (
            <>
              <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/80 border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-all"><Menu className="w-5 h-5" /></button>
                  <div>
                    <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{ALLOWED_COLLECTIONS.find(c => c.id === collectionName)?.label.split('(')[0] || collectionName}</h1></div>
                    <p className="text-slate-600 text-sm mt-1">จำนวนข้อมูล: {filteredDocuments.length} รายการ | คัดกรองจาก {documents.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AiAssistant documents={documents} isOnline={isOnline} />
                  <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200"><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md flex items-center gap-2 px-3 ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="w-4 h-4" /><span className="text-xs font-medium">Grid</span></button><button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md flex items-center gap-2 px-3 ${viewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><TableIcon className="w-4 h-4" /><span className="text-xs font-medium">Table</span></button></div>
                  <button onClick={() => loadData(collectionName)} className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white/50 rounded-lg transition-colors"><RefreshCw className={`w-5 h-5 ${status === 'loading' ? 'animate-spin' : ''}`} /></button>
                </div>
              </header>

              <InsightPanel 
                hasData={documents.length > 0} documents={documents} collectionName={collectionName} onGlobalAsk={handleGlobalAsk} 
                onSearchTermChange={setSearchTerm} filteredDocuments={filteredDocuments} currentSearchTerm={searchTerm} 
                onRegisterClick={['employees', 'departments'].includes(collectionName) ? handleRegisterClick : undefined}
                currentDepartmentFilter={departmentFilter} onDepartmentFilterChange={setDepartmentFilter}
                currentStatusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
                departmentOptions={departmentList}
                selectedCount={selectedIds.length}
                onSelectFiltered={handleSelectFiltered}
              />

              {status === 'success' && (
                <>
                  {collectionName === 'departments' ? (
                    <div className={`grid gap-6 animate-fade-in ${osName === 'Windows' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                      {filteredDocuments.map((doc) => (
                        <DepartmentCard key={doc.id} data={doc as any} onEdit={handleEditDepartment} onDelete={requestDeleteEmployee} onManagePositions={handleManagePositions} />
                      ))}
                    </div>
                  ) : viewMode === 'table' ? (
                    <EmployeeTable 
                      documents={filteredDocuments}
                      selectedIds={selectedIds}
                      toggleSelect={toggleSelect}
                      onEdit={handleEditEmployee}
                      onDelete={requestDeleteEmployee}
                      onManageAddress={handleManageAddress}
                      onManageEducation={handleManageEducation}
                      onManageWorkPermission={handleManageWorkPermission}
                      onManageWorkProfile={handleManageWorkProfile}
                      onManageLeaveHistory={handleManageLeaveHistory}
                      onViewDossier={handleViewDossier}
                    />
                  ) : (
                    <div className={`grid gap-6 animate-fade-in ${osName === 'Windows' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                      {filteredDocuments.map((doc) => (
                        <div key={doc.id} className="relative">
                          <button 
                             onClick={() => toggleSelect(doc.id)} 
                             className={`absolute top-4 right-4 z-40 p-1.5 rounded-xl transition-all shadow-md border-2 ${selectedIds.includes(doc.id) ? 'bg-sky-500 border-white text-white' : 'bg-white/90 border-sky-100 text-slate-300 hover:text-sky-400'}`}
                          >
                             {selectedIds.includes(doc.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                          <EmployeeTag id={doc.id} data={doc} onEdit={handleEditEmployee} onDelete={requestDeleteEmployee} onManageAddress={handleManageAddress} onManageEducation={handleManageEducation} onManageWorkPermission={handleManageWorkPermission} onManageWorkProfile={handleManageWorkProfile} onManageLeaveHistory={handleManageLeaveHistory} onViewDossier={handleViewDossier} />
                          {selectedIds.includes(doc.id) && <div className="absolute inset-0 border-4 border-sky-500 rounded-2xl pointer-events-none z-30 animate-pulse"></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
        
        {/* Modals & Dialogs */}
        <ConfirmDialog 
          isOpen={isUnlockModalOpen} 
          title="ปลดล็อกระบบผู้ดูแล (Admin Unlock)" 
          message="กรุณากรอกรหัสผ่าน Master PIN เพื่อเข้าถึงฟังก์ชันการจัดการทั้งหมดของระบบ" 
          confirmLabel="Unlock Now"
          onConfirm={handleGlobalUnlock} 
          onCancel={() => setIsUnlockModalOpen(false)} 
          isProcessing={false} 
          requiredPin={SECURE_PIN} 
        />
        <AttendanceDialog 
          isOpen={isAttendanceTerminalOpen} 
          onClose={() => { if(isAdmin) setIsAttendanceTerminalOpen(false); }} 
          isAdmin={isAdmin}
          currentUser={currentUser}
          onLogout={handleLogout}
          onAdminUnlock={() => setIsUnlockModalOpen(true)}
        />
        <DailyWorkHourReportDialog isOpen={isDailyWorkHourReportOpen} onClose={() => setIsDailyWorkHourReportOpen(false)} />
        <WorkHistoryReportDialog isOpen={isWorkHistoryReportOpen} onClose={() => setIsWorkHistoryReportOpen(false)} />
        <EmployeeFormDialog isOpen={isEmployeeModalOpen} onClose={() => { setIsEmployeeModalOpen(false); setEditingEmployee(null); }} onSave={handleSaveEmployee} initialData={editingEmployee} />
        <DepartmentFormDialog isOpen={isDepartmentModalOpen} onClose={() => { setIsDepartmentModalOpen(false); setEditingDepartment(null); }} onSave={async () => { await loadData('departments'); }} initialData={editingDepartment} />
        <CompanyLeaveReportDialog isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} employees={documents} />
        <WorkforceDashboardDialog isOpen={isWorkforceModalOpen} onClose={() => setIsWorkforceModalOpen(false)} employees={documents} />
        <WorkPermissionDashboardDialog isOpen={isWorkPermissionDashboardOpen} onClose={() => setIsWorkPermissionDashboardOpen(false)} employees={documents} />
        <JobPositionDashboard isOpen={isGlobalJobPosDashboardOpen} onClose={() => setIsGlobalJobPosDashboardOpen(false)} />
        <IdCardGeneratorDialog isOpen={isIdCardGeneratorOpen} onClose={() => setIsIdCardGeneratorOpen(false)} employees={documents} initialSelectedIds={selectedIds} departments={departmentList} />
        <AllEmployeeReportDialog isOpen={isAllEmployeeReportOpen} onClose={() => { setIsAllEmployeeReportOpen(false); setInitialDossierId(null); }} initialEmployeeId={initialDossierId} />
        <WorkCalendarDialog isOpen={isWorkCalendarOpen} onClose={() => setIsWorkCalendarOpen(false)} />
        {addressTarget && <AddressFormDialog isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} employeeId={addressTarget.id} employeeName={addressTarget.name} />}
        {educationTarget && <EducationFormDialog isOpen={isEducationModalOpen} onClose={() => setIsEducationModalOpen(false)} employeeId={educationTarget.id} employeeName={educationTarget.name} />}
        {workPermissionTarget && <WorkPermissionDialog isOpen={isWorkPermissionModalOpen} onClose={() => setIsWorkPermissionModalOpen(false)} employeeId={workPermissionTarget.id} employeeName={workPermissionTarget.name} />}
        {workProfileTarget && <WorkProfileDialog isOpen={isWorkProfileModalOpen} onClose={() => setIsWorkProfileModalOpen(false)} employeeId={workProfileTarget.id} employeeName={workProfileTarget.name} />}
        {leaveHistoryTarget && <LeaveHistoryDialog isOpen={isLeaveHistoryModalOpen} onClose={() => setIsLeaveHistoryModalOpen(false)} employeeId={leaveHistoryTarget.id} employeeName={leaveHistoryTarget.name} />}
        {deptPositionsTarget && <DepartmentPositionsDialog isOpen={isDeptPositionsModalOpen} onClose={() => setIsDailyWorkHourReportOpen(false)} departmentId={deptPositionsTarget.id} departmentName={deptPositionsTarget.name} />}
        <ConfirmDialog isOpen={isConfirmDialogOpen} title="Delete Data" message={`Confirm permanent deletion?`} confirmLabel="Delete Forever" onConfirm={executeDeleteEmployee} onCancel={() => setIsConfirmDialogOpen(false)} isProcessing={isDeleting} requiredPin={SECURE_PIN} />
      </div>
    </div>
  );
}
