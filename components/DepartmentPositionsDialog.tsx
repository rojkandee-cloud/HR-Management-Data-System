
import React, { useState, useEffect } from 'react';
import { X, Briefcase, Plus, Trash2, ExternalLink, Users, Save, Target, AlertCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getDocumentsByField, addDocumentToCollection, deleteDocumentFromCollection } from '../services/firebase';
import { JobPositionData } from '../types';

interface DepartmentPositionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
}

const POSITION_STATUS_OPTIONS = [
  "อัตรายังว่าง",
  "เต็มอัตรา",
  "เกินอัตรากำลัง",
  "รอขยายอัตรา"
];

export const DepartmentPositionsDialog: React.FC<DepartmentPositionsDialogProps> = ({ 
  isOpen, 
  onClose, 
  departmentId, 
  departmentName 
}) => {
  const [positions, setPositions] = useState<JobPositionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newHeadcount, setNewHeadcount] = useState<number>(1);
  const [newJdUrl, setNewJdUrl] = useState('');
  const [newStatus, setNewStatus] = useState('อัตรายังว่าง');

  useEffect(() => {
    if (isOpen && departmentId) {
      loadPositions();
    }
  }, [isOpen, departmentId]);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const docs = await getDocumentsByField('job_positions', 'departmentId', departmentId);
      setPositions(docs as unknown as JobPositionData[]);
    } catch (e) {
      console.error("Failed to load positions", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setLoading(true);
    try {
      const payload: JobPositionData = {
        departmentId,
        title: newTitle,
        targetHeadcount: newHeadcount,
        jobDescriptionUrl: newJdUrl || '',
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      await addDocumentToCollection('job_positions', payload);
      setNewTitle(''); setNewHeadcount(1); setNewJdUrl(''); setNewStatus('อัตรายังว่าง'); setIsAdding(false);
      await loadPositions();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ลบข้อมูล?")) return;
    setLoading(true);
    try {
      await deleteDocumentFromCollection('job_positions', id);
      await loadPositions();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const getStatusBadge = (status: string | undefined) => {
    const base = "px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter";
    switch(status) {
      case 'เต็มอัตรา': return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1`}><CheckCircle2 className="w-2.5 h-2.5"/> เต็ม</span>;
      case 'เกินอัตรากำลัง': return <span className={`${base} bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1`}><AlertTriangle className="w-2.5 h-2.5"/> เกิน</span>;
      case 'รอขยายอัตรา': return <span className={`${base} bg-amber-50 text-amber-600 border-amber-100 flex items-center gap-1`}><Clock className="w-2.5 h-2.5"/> รอ</span>;
      default: return <span className={`${base} bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1`}><Users className="w-2.5 h-2.5"/> ว่าง</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden text-left">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col h-[80vh] animate-fade-in-up">
        
        {/* Header - Minimal */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-indigo-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-indigo-900 truncate">แผนก: {departmentName}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
           
           <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-bold text-slate-400">รายการตำแหน่ง ({positions.length})</span>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {isAdding ? 'ยกเลิก' : <><Plus className="w-3 h-3"/> เพิ่มใหม่</>}
              </button>
           </div>

           {/* Add Minimal Form */}
           {isAdding && (
             <form onSubmit={handleAddPosition} className="mb-4 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                   <input 
                     type="text" 
                     value={newTitle}
                     onChange={(e) => setNewTitle(e.target.value)}
                     placeholder="ชื่อตำแหน่ง"
                     className="w-full p-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                     autoFocus required
                   />
                   <div className="flex gap-2">
                      <input 
                        type="number" min="1"
                        value={newHeadcount}
                        onChange={(e) => setNewHeadcount(Number(e.target.value))}
                        className="w-16 p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-100"
                      />
                      <select 
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="flex-1 p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-100"
                      >
                        {POSITION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                   </div>
                </div>
                <div className="flex justify-end gap-2">
                   <button type="submit" disabled={loading} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors">
                      {loading ? '...' : 'บันทึก'}
                   </button>
                </div>
             </form>
           )}

           {/* List as Minimal Tag Bars */}
           <div className="space-y-1.5">
              {positions.length === 0 ? (
                 <div className="text-center py-10 text-slate-300 text-xs italic">ไม่มีข้อมูลตำแหน่งงาน</div>
              ) : (
                 positions.map((pos) => {
                    const isFull = pos.status === 'เต็มอัตรา';
                    const isOver = pos.status === 'เกินอัตรากำลัง';
                    const listBg = isFull ? 'bg-emerald-50/50' : isOver ? 'bg-rose-50/50' : 'bg-white';
                    const sideBar = isFull ? 'bg-emerald-500' : isOver ? 'bg-rose-500' : 'bg-indigo-100';

                    return (
                      <div key={pos.id} className={`${listBg} px-3 py-2 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-100 transition-colors group`}>
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-1 h-6 ${sideBar} rounded-full transition-colors`}></div>
                            <div className="flex flex-col overflow-hidden">
                               <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-700 text-xs truncate">{pos.title}</span>
                                  {getStatusBadge(pos.status)}
                               </div>
                               <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                                  <span>จำนวน: <span className="text-indigo-600">{pos.targetHeadcount}</span></span>
                                  {pos.jobDescriptionUrl && (
                                     <a href={pos.jobDescriptionUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-0.5">
                                       <ExternalLink className="w-2.5 h-2.5"/> JD
                                     </a>
                                  )}
                               </div>
                            </div>
                         </div>
                         
                         <button 
                           onClick={() => pos.id && handleDelete(pos.id)}
                           className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    );
                 })
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
