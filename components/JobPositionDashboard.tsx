
import React, { useState, useEffect, useMemo } from 'react';
/* Added missing Loader2 icon import from lucide-react */
import { X, Briefcase, Plus, Search, Filter, Trash2, ExternalLink, Save, Building2, Users, Target, Pencil, CheckCircle2, AlertCircle, Clock, Sparkles, Share2, Megaphone, UserPlus, ShieldCheck, AlertTriangle, Activity, UserCheck, Loader2 } from 'lucide-react';
import { fetchCollectionData, addDocumentToCollection, deleteDocumentFromCollection, setDocumentWithId } from '../services/firebase';
import { JobPositionData, DepartmentData, FirestoreDoc, WorkProfileData } from '../types';

interface JobPositionDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MergedJobPosition extends JobPositionData {
  departmentName: string;
  actualHeadcount: number;
  currentEmployees: any[];
}

const POSITION_STATUS_OPTIONS = [
  "อัตรายังว่าง",
  "เต็มอัตรา",
  "เกินอัตรากำลัง",
  "รอขยายอัตรา"
];

const STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ทดลองงาน",
  "พักงาน",
  "ลาออกแล้ว"
];

export const JobPositionDashboard: React.FC<JobPositionDashboardProps> = ({ isOpen, onClose }) => {
  const [positions, setPositions] = useState<JobPositionData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [employees, setEmployees] = useState<FirestoreDoc[]>([]);
  const [workProfiles, setWorkProfiles] = useState<WorkProfileData[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ยังทำงานอยู่'); // Default to Active
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState<Partial<JobPositionData>>({
    departmentId: '',
    title: '',
    targetHeadcount: 1,
    jobDescriptionUrl: '',
    status: 'อัตรายังว่าง'
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [posDocs, deptDocs, empDocs, profileDocs] = await Promise.all([
        fetchCollectionData('job_positions'),
        fetchCollectionData('departments'),
        fetchCollectionData('employees'),
        fetchCollectionData('work_profiles')
      ]);
      setPositions(posDocs as unknown as JobPositionData[]);
      setDepartments(deptDocs as unknown as DepartmentData[]);
      setEmployees(empDocs);
      setWorkProfiles(profileDocs as unknown as WorkProfileData[]);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  const groupedPositions = useMemo(() => {
    // Merge employees with their profiles for status checking
    const employeeWithStatus = employees.map(emp => {
      const profile = workProfiles.find(p => p.employeeId === emp.employeeId || p.employeeId === emp.id);
      return {
        ...emp,
        employmentStatus: profile?.employmentStatus || emp.employmentStatus || 'ยังทำงานอยู่',
        positionTitle: profile?.position || ''
      };
    });

    const merged = positions.map(pos => {
      const dept = departments.find(d => d.departmentId === pos.departmentId);
      
      // Calculate actual headcount based on the selected status filter
      const occupants = employeeWithStatus.filter(emp => 
        emp.positionTitle === pos.title && 
        (statusFilter ? emp.employmentStatus === statusFilter : true)
      );

      return {
        ...pos,
        departmentName: dept ? dept.name : (pos.departmentId || 'ไม่ระบุแผนก'),
        actualHeadcount: occupants.length,
        currentEmployees: occupants
      } as MergedJobPosition;
    });

    const filtered = merged.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter ? item.departmentId === departmentFilter : true;
      return matchesSearch && matchesDept;
    });

    const groups: Record<string, MergedJobPosition[]> = {};
    filtered.forEach(pos => {
      const groupName = pos.departmentName;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(pos);
    });

    return groups;
  }, [positions, departments, employees, workProfiles, searchTerm, departmentFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition.departmentId || !newPosition.title) {
      alert("กรุณาเลือกแผนกและระบุชื่อตำแหน่ง");
      return;
    }

    setLoading(true);
    try {
      const payload: JobPositionData = {
        departmentId: newPosition.departmentId,
        title: newPosition.title,
        targetHeadcount: newPosition.targetHeadcount || 1,
        jobDescriptionUrl: newPosition.jobDescriptionUrl || '',
        status: newPosition.status || 'อัตรายังว่าง',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await setDocumentWithId('job_positions', editingId, payload);
      } else {
        await addDocumentToCollection('job_positions', payload);
      }
      
      resetForm();
      await loadData();
    } catch (e) {
      console.error("Save failed", e);
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MergedJobPosition) => {
    setEditingId(item.id || null);
    setNewPosition({
      departmentId: item.departmentId,
      title: item.title,
      targetHeadcount: item.targetHeadcount,
      jobDescriptionUrl: item.jobDescriptionUrl,
      status: item.status || 'อัตรายังว่าง'
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setNewPosition({ departmentId: '', title: '', targetHeadcount: 1, jobDescriptionUrl: '', status: 'อัตรายังว่าง' });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบตำแหน่งงานนี้ใช่หรือไม่?")) return;
    try {
      await deleteDocumentFromCollection('job_positions', id);
      setPositions(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleShare = (item: MergedJobPosition) => {
    const text = `📢 ประกาศรับสมัครงาน!\n\nตำแหน่ง: ${item.title}\nแผนก: ${item.departmentName}\nจำนวน: ${item.targetHeadcount} อัตรา\n\nสนใจดูรายละเอียดเพิ่มเติมที่: ${item.jobDescriptionUrl || '-'}\n\n#Hiring #JobOpportunity #FireViewHR`;
    
    if (navigator.share) {
      navigator.share({ title: 'ประกาศรับสมัครงาน', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("คัดลอกข้อความสำหรับประกาศงานแล้ว!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
      <div className="bg-rose-50/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[95vw] border border-white/40 flex flex-col h-[94vh] animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-rose-100/50 bg-white/40 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-rose-900 tracking-tight">ระบบจัดการและวิเคราะห์ตำแหน่งงาน</h3>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Job Structure & Vacancy Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => isAdding ? resetForm() : setIsAdding(true)}
                className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md ${
                  isAdding ? 'bg-white/60 text-slate-500' : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAdding ? 'ยกเลิก' : 'เพิ่มตำแหน่งงาน'}
              </button>
             <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
               <X className="w-7 h-7" />
             </button>
          </div>
        </div>

        {/* Controls - Filter Strip */}
        <div className="px-8 py-4 border-b border-white/20 bg-white/40 backdrop-blur-md sticky top-0 z-10 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                 <input 
                   type="text" 
                   placeholder="ค้นหาชื่อตำแหน่ง..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-rose-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-100 transition-all placeholder-rose-300"
                 />
              </div>
              <div className="relative w-full md:w-64">
                 <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                 <select 
                   value={departmentFilter}
                   onChange={(e) => setDepartmentFilter(e.target.value)}
                   className="w-full pl-10 pr-8 py-2.5 bg-white/60 border border-indigo-200 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-rose-100"
                 >
                    <option value="">ทุกแผนก (All Depts)</option>
                    {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                 </select>
              </div>

              {/* NEW: Status Filter */}
              <div className="relative w-full md:w-56">
                 <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                 <select 
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                   className={`w-full pl-10 pr-8 py-2.5 border rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer focus:ring-4 transition-all ${
                    statusFilter ? 'bg-indigo-50 border-indigo-200 text-indigo-700 focus:ring-indigo-100' : 'bg-white/60 border-rose-200 text-slate-700 focus:ring-rose-100'
                   }`}
                 >
                    <option value="">ทุกสถานะพนักงาน</option>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600"/></div>
                 <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center"><Megaphone className="w-4 h-4 text-amber-600"/></div>
                 <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-white flex items-center justify-center"><Users className="w-4 h-4 text-rose-600"/></div>
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Cross-Collection Analysis</span>
           </div>
        </div>

        {/* Add/Edit Form */}
        {isAdding && (
          <div className="px-8 py-6 bg-rose-50/40 border-b border-rose-100/50 animate-fade-in-down overflow-y-auto">
             <div className="max-w-6xl mx-auto">
                <h4 className="font-black text-sm text-rose-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Sparkles className="w-4 h-4" /> 
                   {editingId ? 'แก้ไขข้อมูลตำแหน่งงาน' : 'สร้างรายการตำแหน่งงานใหม่'}
                </h4>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm">
                   <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 ml-1">แผนก</label>
                      <select 
                        value={newPosition.departmentId}
                        onChange={(e) => setNewPosition({...newPosition, departmentId: e.target.value})}
                        className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold bg-white/60 outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                        required
                      >
                         <option value="">-- เลือกแผนก --</option>
                         {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                      </select>
                   </div>
                   <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 ml-1">ชื่อตำแหน่งงาน</label>
                      <input 
                        type="text" 
                        value={newPosition.title}
                        onChange={(e) => setNewPosition({...newPosition, title: e.target.value})}
                        className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold bg-white/60 outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                        placeholder="เช่น Senior Web Developer"
                        required
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 ml-1">จำนวนเป้าหมาย (อัตรา)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={newPosition.targetHeadcount}
                        onChange={(e) => setNewPosition({...newPosition, targetHeadcount: Number(e.target.value)})}
                        className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold bg-white/60 outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                      />
                   </div>
                   <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 ml-1">สถานะพื้นฐาน</label>
                      <select 
                        value={newPosition.status}
                        onChange={(e) => setNewPosition({...newPosition, status: e.target.value})}
                        className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold bg-white/60 outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                      >
                         {POSITION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                   </div>
                   <div className="md:col-span-9">
                      <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 ml-1">Link รายละเอียดลักษณะงาน (Job Description URL)</label>
                      <input 
                        type="text" 
                        value={newPosition.jobDescriptionUrl}
                        onChange={(e) => setNewPosition({...newPosition, jobDescriptionUrl: e.target.value})}
                        className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold bg-white/60 outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                        placeholder="https://docs.google.com/..."
                      />
                   </div>
                   <div className="md:col-span-3 flex gap-2">
                      <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95">
                         {loading ? '...' : editingId ? 'อัปเดตข้อมูล' : 'บันทึกรายการ'}
                      </button>
                      <button type="button" onClick={resetForm} className="px-4 py-2.5 bg-white/60 text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">ยกเลิก</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* Groups & Cards Grid */}
        <div className="flex-1 overflow-y-auto p-8 bg-transparent">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">กำลังวิเคราะห์ความสอดคล้องของตำแหน่งงาน...</p>
             </div>
           ) : Object.keys(groupedPositions).length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl font-black uppercase tracking-[0.3em]">ไม่พบข้อมูลตำแหน่งงาน</p>
             </div>
           ) : (
             <div className="space-y-12">
                {Object.entries(groupedPositions).map(([deptName, groupPositions]: [string, MergedJobPosition[]]) => (
                   <div key={deptName} className="space-y-6">
                      <div className="flex items-center gap-4 border-b-2 border-rose-200/50 pb-3">
                         <div className="p-2 bg-white/60 rounded-lg border border-rose-100 shadow-sm"><Building2 className="w-5 h-5 text-rose-600" /></div>
                         <h4 className="text-xl font-black text-rose-800 uppercase tracking-tight">{deptName}</h4>
                         <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-md">{groupPositions.length} ตำแหน่ง</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                         {groupPositions.map(pos => {
                            const isVacant = pos.actualHeadcount < pos.targetHeadcount;
                            const isFull = pos.actualHeadcount === pos.targetHeadcount;
                            const isOver = pos.actualHeadcount > pos.targetHeadcount;
                            
                            let statusColor = 'bg-white/40 border-white/60';
                            let accentColor = 'text-slate-400';
                            let icon = <ShieldCheck className="w-5 h-5" />;

                            if (isVacant) {
                               statusColor = 'bg-amber-50/40 border-amber-200/50';
                               accentColor = 'text-amber-600';
                               icon = <Megaphone className="w-5 h-5" />;
                            } else if (isFull) {
                               statusColor = 'bg-emerald-50/40 border-emerald-200/50';
                               accentColor = 'text-emerald-600';
                               icon = <CheckCircle2 className="w-5 h-5" />;
                            } else if (isOver) {
                               statusColor = 'bg-rose-50/40 border-rose-200/50';
                               accentColor = 'text-rose-600';
                               icon = <AlertTriangle className="w-5 h-5" />;
                            }

                            return (
                              <div key={pos.id} className={`relative group rounded-3xl border overflow-hidden flex flex-col transition-all hover:shadow-xl ${statusColor}`}>
                                 <div className="absolute top-0 right-0 p-4">
                                    {isVacant ? (
                                      <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">VACANT</div>
                                    ) : isFull ? (
                                      <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">FILLED</div>
                                    ) : (
                                      <div className="bg-rose-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">OVER</div>
                                    )}
                                 </div>
                                 
                                 <div className="p-6 flex-1">
                                    <div className={`p-2 bg-white rounded-xl w-10 h-10 flex items-center justify-center mb-4 shadow-sm ${accentColor}`}>{icon}</div>
                                    <h5 className="text-lg font-black text-slate-900 leading-tight mb-4 group-hover:text-rose-700 transition-colors">{pos.title}</h5>
                                    
                                    <div className="space-y-3">
                                       <div className="flex justify-between items-center bg-white/60 p-3 rounded-2xl border border-white/40 shadow-inner">
                                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                             <Users className="w-4 h-4" />
                                             <span>สถานะกำลังพลจริง</span>
                                          </div>
                                          <div className="flex items-baseline gap-1">
                                             <span className={`text-xl font-black ${accentColor}`}>{pos.actualHeadcount}</span>
                                             <span className="text-xs text-slate-400">/ {pos.targetHeadcount}</span>
                                          </div>
                                       </div>

                                       <div className="flex flex-wrap gap-1">
                                          {pos.currentEmployees.map((emp, idx) => (
                                             <div key={idx} className="w-6 h-6 rounded-full border border-white overflow-hidden shadow-sm bg-white" title={emp.fullName}>
                                                {emp.employeeImage ? <img src={emp.employeeImage} className="w-full h-full object-cover" /> : <UserCheck className="w-full h-full p-1 text-slate-300" />}
                                             </div>
                                          ))}
                                          {pos.actualHeadcount < pos.targetHeadcount && (
                                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-rose-200 flex items-center justify-center text-[10px] text-rose-300 font-black">+</div>
                                          )}
                                       </div>
                                    </div>
                                 </div>

                                 <div className="bg-white/40 p-4 border-t border-white/50 flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                       <button onClick={() => handleEdit(pos)} className="p-2 bg-white/60 text-slate-400 hover:text-rose-600 rounded-xl shadow-sm transition-all border border-rose-100"><Pencil className="w-4 h-4"/></button>
                                       <button onClick={() => pos.id && handleDelete(pos.id)} className="p-2 bg-white/60 text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all border border-rose-100"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                    <div className="flex gap-2">
                                       <button onClick={() => handleShare(pos)} className="px-3 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md hover:bg-rose-600 transition-all active:scale-95"><Share2 className="w-3.5 h-3.5"/> Share</button>
                                       {pos.jobDescriptionUrl && (
                                         <a href={pos.jobDescriptionUrl} target="_blank" rel="noreferrer" className="p-2 bg-white/60 text-rose-600 rounded-xl shadow-sm border border-rose-200 hover:bg-white hover:shadow-md transition-all"><ExternalLink className="w-4 h-4"/></a>
                                       )}
                                    </div>
                                 </div>
                              </div>
                            );
                         })}
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>
        
        {/* Footer Summary */}
        <div className="px-8 py-3 bg-white/40 backdrop-blur-md border-t border-white/40 flex justify-between items-center rounded-b-3xl">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase"><div className="w-3 h-3 rounded-full bg-amber-400"></div> อัตรายังว่าง</div>
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> เต็มอัตรา</div>
              <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase"><div className="w-3 h-3 rounded-full bg-rose-400"></div> เกินอัตรา</div>
              <div className="h-4 w-px bg-rose-200 mx-2"></div>
              <div className="text-[10px] font-black text-slate-500 uppercase">กรองตาม: <span className="text-indigo-600">{statusFilter || 'ทุกสถานะ'}</span></div>
           </div>
           <p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.4em]">FireView Analytics Engine v3.0</p>
        </div>
      </div>
    </div>
  );
};
