
import React, { useState, useEffect, useMemo } from 'react';
import { X, Briefcase, Search, Filter, LayoutGrid, List as ListIcon, User, Pencil, Trash2, ExternalLink, Layers, Building2, Download, Users, Mars, Venus, CheckCircle, Loader2, Activity } from 'lucide-react';
import { fetchCollectionData, deleteDocumentFromCollection } from '../services/firebase';
import { FirestoreDoc, WorkPermissionData, DepartmentData } from '../types';
import { WorkPermissionDialog } from './WorkPermissionDialog';

interface WorkPermissionDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: FirestoreDoc[];
}

interface MergedWorkPermission extends WorkPermissionData {
  employeeName: string;
  employeeNickname?: string;
  gender?: string;
  employmentStatus?: string;
}

const STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ทดลองงาน",
  "พักงาน",
  "ลาออกแล้ว"
];

export const WorkPermissionDashboardDialog: React.FC<WorkPermissionDashboardDialogProps> = ({ isOpen, onClose, employees }) => {
  const [permissions, setPermissions] = useState<WorkPermissionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentList, setDepartmentList] = useState<string[]>([]);

  // Edit State
  const [editingItem, setEditingItem] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadDepartments();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docs = await fetchCollectionData('work_permissions');
      setPermissions(docs as unknown as WorkPermissionData[]);
    } catch (e) {
      console.error("Failed to load work permissions", e);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const docs = await fetchCollectionData('departments');
      const depts = docs.map(d => (d as unknown as DepartmentData).name).sort();
      setDepartmentList(depts);
    } catch (e) {
      console.warn("Failed to load departments");
    }
  };

  const mergedData = useMemo(() => {
    return permissions.map(p => {
       const emp = employees.find(e => e.id === p.employeeId || e.employeeId === p.employeeId);
       return {
         ...p,
         employeeName: emp ? `${emp.title} ${emp.fullName}` : 'Unknown Employee',
         employeeNickname: emp?.nickname || '',
         employeeImage: p.employeeImage || emp?.employeeImage || '',
         gender: emp?.gender || '',
         employmentStatus: emp?.employmentStatus || 'ยังทำงานอยู่'
       } as MergedWorkPermission;
    });
  }, [permissions, employees]);

  const filteredData = useMemo(() => {
    return mergedData.filter(item => {
      const matchesSearch = 
        item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.workingCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = departmentFilter ? item.department === departmentFilter : true;
      const matchesStatus = statusFilter ? item.employmentStatus === statusFilter : true;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [mergedData, searchTerm, departmentFilter, statusFilter]);

  // Group data by Department for the grid view
  const groupedData = useMemo(() => {
    const groups: Record<string, MergedWorkPermission[]> = {};
    filteredData.forEach(item => {
      const dept = item.department || 'ไม่ระบุแผนก';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(item);
    });

    // Sort within group: Male first
    Object.keys(groups).forEach(dept => {
      groups[dept].sort((a, b) => {
        if (a.gender === 'ชาย' && b.gender !== 'ชาย') return -1;
        if (a.gender !== 'ชาย' && b.gender === 'ชาย') return 1;
        return 0;
      });
    });

    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, MergedWorkPermission[]>);
  }, [filteredData]);

  const handleEdit = (item: MergedWorkPermission) => {
    setEditingItem({ id: item.employeeId, name: item.employeeName });
  };

  const requestDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this work permission record?")) {
      try {
        await deleteDocumentFromCollection('work_permissions', id);
        setPermissions(prev => prev.filter(p => p.employeeId !== id)); 
      } catch (e) {
        console.error("Delete failed", e);
        alert("Failed to delete");
      }
    }
  };

  const handleExport = () => {
    const headers = "EmployeeID,Name,Gender,Position,Department,Level,Code,Status,JD_Link\n";
    const rows = filteredData.map(d => 
      `${d.employeeId},"${d.employeeName}",${d.gender},${d.position},${d.department},${d.expertiseLevel},${d.workingCode},${d.employmentStatus},${d.jobDescriptionUrl}`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + btoa(unescape(encodeURIComponent(headers + rows)));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "work_permissions_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden text-left">
       <div className="bg-indigo-50/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[95vw] border border-white/40 flex flex-col h-[94vh] animate-scale-in">
          
          {/* Header (Top Level Fixed) */}
          <div className="flex items-center justify-between p-6 border-b border-indigo-100/50 bg-white/40 rounded-t-3xl z-30">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                 <Briefcase className="w-7 h-7" />
               </div>
               <div>
                 <h3 className="font-black text-2xl text-indigo-900 tracking-tight">รายงานใบอนุญาตและตำแหน่งงาน</h3>
                 <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.2em]">Work Permission & Job Grade Structure</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
                <button 
                  onClick={handleExport}
                  className="px-6 py-2.5 bg-white/60 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-300 hover:text-red-500 transition-colors">
                  <X className="w-7 h-7" />
                </button>
             </div>
          </div>

          {/* Filters Bar (Sticky below Main Header) */}
          <div className="px-8 py-4 border-b border-white/20 bg-white/40 backdrop-blur-md sticky top-0 z-20 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
             <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                   <input 
                     type="text" 
                     placeholder="ค้นหาชื่อ, ตำแหน่ง, รหัส..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-indigo-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all placeholder-indigo-300"
                   />
                </div>
                
                <div className="relative w-full md:w-56">
                   <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                   <select 
                     value={departmentFilter}
                     onChange={(e) => setDepartmentFilter(e.target.value)}
                     className="w-full pl-10 pr-8 py-2.5 bg-white/60 border border-indigo-200 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-100"
                   >
                     <option value="">ทุกแผนก (All Depts)</option>
                     {departmentList.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>

                <div className="relative w-full md:w-56">
                   <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                   <select 
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                     className={`w-full pl-10 pr-8 py-2.5 border rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer focus:ring-4 transition-all ${
                        statusFilter ? 'bg-rose-50 border-rose-200 text-rose-700 focus:ring-rose-100' : 'bg-white/60 border-indigo-200 text-slate-700 focus:ring-indigo-100'
                     }`}
                   >
                     <option value="">ทุกสถานะ (All Status)</option>
                     {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
             </div>

             <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md p-1 rounded-xl border border-white/40">
                <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-indigo-400 hover:text-indigo-700'}`}>
                   <LayoutGrid className="w-3.5 h-3.5" /> Grouping
                </button>
                <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-indigo-400 hover:text-indigo-700'}`}>
                   <ListIcon className="w-3.5 h-3.5" /> List View
                </button>
             </div>
          </div>

          {/* Content Area (Scrollable with Sticky Sections) */}
          <div className="flex-1 overflow-y-auto p-8 bg-transparent scroll-smooth">
             {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                   <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">กำลังรวบรวมข้อมูลใบอนุญาต...</p>
                </div>
             ) : filteredData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                   <Search className="w-16 h-16 mb-4 opacity-20" />
                   <p className="text-xl font-black uppercase tracking-[0.3em]">ไม่พบข้อมูลที่ต้องการ</p>
                </div>
             ) : viewMode === 'grid' ? (
                <div className="space-y-12 pb-10">
                   {Object.entries(groupedData).map(([dept, employees]: [string, MergedWorkPermission[]]) => (
                      <div key={dept} className="relative">
                         {/* Dept Header (Sticky during section scroll) */}
                         <div className="sticky top-0 z-10 bg-indigo-50/70 backdrop-blur-md py-3 mb-6 border-b-2 border-indigo-200 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-4">
                               <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-100"><Building2 className="w-6 h-6 text-indigo-600" /></div>
                               <h4 className="text-xl font-black text-indigo-800 uppercase tracking-tight">{dept}</h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg border border-blue-200 flex items-center gap-1"><Mars className="w-3 h-3"/> {employees.filter(e => e.gender === 'ชาย').length}</span>
                               <span className="px-2.5 py-1 bg-pink-100 text-pink-700 text-[10px] font-black rounded-lg border border-pink-200 flex items-center gap-1"><Venus className="w-3 h-3"/> {employees.filter(e => e.gender === 'หญิง').length}</span>
                            </div>
                         </div>

                         {/* 5-Column Grid */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {employees.map(item => {
                               const isMale = item.gender === 'ชาย';
                               const isFemale = item.gender === 'หญิง';
                               const genderColorClass = isMale ? 'border-blue-200 bg-blue-50/40' : isFemale ? 'border-pink-200 bg-pink-50/40' : 'border-indigo-200 bg-white/40';
                               const genderTextClass = isMale ? 'text-blue-600' : isFemale ? 'text-pink-600' : 'text-indigo-400';
                               const isResigned = item.employmentStatus === 'ลาออกแล้ว';
                               
                               return (
                                 <div key={item.employeeId} className={`group relative backdrop-blur-md rounded-3xl border p-5 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col ${genderColorClass} ${isResigned ? 'grayscale-[0.5] opacity-80' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                       <div className="relative">
                                          <div className={`w-14 h-14 rounded-2xl border-2 bg-white overflow-hidden shadow-sm shrink-0 transition-transform group-hover:scale-105 ${isMale ? 'border-blue-100' : isFemale ? 'border-pink-100' : 'border-indigo-100'}`}>
                                            {item.employeeImage ? (
                                              <img src={item.employeeImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center text-slate-100"><User className="w-8 h-8" /></div>
                                            )}
                                          </div>
                                          <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg shadow-md bg-white ${genderTextClass}`}>
                                             {isMale ? <Mars className="w-3 h-3" /> : isFemale ? <Venus className="w-3 h-3" /> : null}
                                          </div>
                                       </div>
                                       <div className="flex flex-col items-end gap-1">
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => handleEdit(item)} className="p-1.5 bg-white text-slate-400 hover:text-indigo-600 rounded-lg shadow-sm border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                             <button onClick={() => requestDelete(item.employeeId)} className="p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm border border-slate-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                          {isResigned && (
                                             <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black rounded-full border border-rose-200 uppercase">Resigned</span>
                                          )}
                                       </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                       <span className={`text-[9px] font-black uppercase tracking-widest ${genderTextClass}`}>UID: {item.employeeId}</span>
                                       <h4 className="font-black text-slate-800 text-sm leading-tight mt-0.5 truncate">{item.employeeName}</h4>
                                       {item.employeeNickname && <p className="text-[10px] font-bold text-slate-400">"{item.employeeNickname}"</p>}
                                       
                                       <div className="mt-4 pt-4 border-t border-indigo-100/30 space-y-2.5">
                                          <div className="flex items-start gap-2">
                                             <Briefcase className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                                             <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate leading-tight uppercase">{item.position}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.expertiseLevel || '-'}</p>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                             <span className="font-mono text-[10px] font-black text-indigo-500 tracking-wider bg-white/40 px-2 py-0.5 rounded-md">{item.workingCode}</span>
                                          </div>
                                       </div>
                                    </div>

                                    {item.jobDescriptionUrl && (
                                      <a href={item.jobDescriptionUrl} target="_blank" rel="noreferrer" className="mt-4 p-2 bg-indigo-100/50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2">
                                         <ExternalLink className="w-3 h-3" /> Job Instruction
                                      </a>
                                    )}
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="bg-white/40 backdrop-blur-md rounded-3xl shadow-sm border border-white/60 overflow-hidden mb-10">
                   <div className="overflow-x-auto relative">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-indigo-50/50 text-indigo-500 uppercase text-[10px] font-black tracking-widest border-b border-indigo-100/50 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                               <th className="px-6 py-4">พนักงาน (Employee)</th>
                               <th className="px-6 py-4">ตำแหน่ง & ระดับ</th>
                               <th className="px-6 py-4">รหัส & แผนก</th>
                               <th className="px-6 py-4">สถานะงาน</th>
                               <th className="px-6 py-4 text-right">การจัดการ</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/20">
                            {filteredData.map(item => (
                               <tr key={item.employeeId} className={`hover:bg-white/40 group transition-colors ${item.employmentStatus === 'ลาออกแล้ว' ? 'bg-slate-50/50 text-slate-400' : ''}`}>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-indigo-100 shrink-0 shadow-sm">
                                           {item.employeeImage ? <img src={item.employeeImage} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-slate-200" />}
                                        </div>
                                        <div>
                                           <div className="font-black text-slate-800 text-sm leading-tight">{item.employeeName}</div>
                                           <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] font-mono text-indigo-600 font-bold">{item.employeeId}</span>
                                              <span className={`text-[9px] font-black uppercase flex items-center gap-1 ${item.gender === 'ชาย' ? 'text-blue-500' : 'text-pink-500'}`}>
                                                 {item.gender === 'ชาย' ? <Mars className="w-2.5 h-2.5" /> : <Venus className="w-2.5 h-2.5" />} {item.gender}
                                              </span>
                                           </div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="font-bold text-slate-700 text-sm">{item.position}</div>
                                     <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{item.expertiseLevel || '-'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="font-mono text-xs font-black text-indigo-600">{item.workingCode}</div>
                                     <div className="text-[10px] font-bold text-indigo-400/60 uppercase">{item.department}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${
                                        item.employmentStatus === 'ลาออกแล้ว' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                     }`}>
                                        {item.employmentStatus}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <div className="flex items-center justify-end gap-2">
                                        {item.jobDescriptionUrl && (
                                           <a href={item.jobDescriptionUrl} target="_blank" rel="noreferrer" className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" title="View Job Instruction">
                                              <ExternalLink className="w-4 h-4" />
                                           </a>
                                        )}
                                        <button onClick={() => handleEdit(item)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => requestDelete(item.employeeId)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             )}
          </div>

          {/* Footer Metrics (Bottom Fixed) */}
          <div className="p-4 border-t border-indigo-100/50 bg-white/40 backdrop-blur-md flex flex-col md:flex-row justify-between items-center px-8 rounded-b-3xl gap-4 z-30">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div>
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">พนักงานชาย (MALE)</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-pink-500 shadow-sm shadow-pink-200"></div>
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">พนักงานหญิง (FEMALE)</span>
                </div>
                <div className="h-4 w-px bg-indigo-200 mx-2 hidden md:block"></div>
                <div className="flex items-center gap-2">
                   <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verification Active</span>
                </div>
             </div>
             <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.4em]">FireView Document Center v3.5</p>
          </div>
       </div>

       {/* Edit Modal Reuse */}
       {editingItem && (
          <WorkPermissionDialog 
             isOpen={!!editingItem} 
             onClose={() => { setEditingItem(null); loadData(); }} 
             employeeId={editingItem.id} 
             employeeName={editingItem.name} 
          />
       )}
    </div>
  );
};
