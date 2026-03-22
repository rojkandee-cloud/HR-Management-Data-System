
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, Info, CheckCircle2, Globe, Mail, Save, Trash2, Plus, List as ListIcon, Search, Filter, Edit, AlertCircle, CalendarDays } from 'lucide-react';
import { fetchCollectionData, setDocumentWithId, deleteDocumentFromCollection } from '../services/firebase';
import { HolidayData } from '../types';

interface WorkCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const HD_TYPES = [
  { id: 'HD2', label: 'วันหยุดบริษัท (Annual)', color: 'bg-orange-500', text: 'text-orange-600' },
  { id: 'HD3', label: 'วันหยุดประเพณี (Tradition)', color: 'bg-red-500', text: 'text-red-600' }
];

export const WorkCalendarDialog: React.FC<WorkCalendarDialogProps> = ({ isOpen, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<HolidayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'registry'>('calendar');
  
  // CRUD / Form State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tagTitle, setTagTitle] = useState('');
  const [tagType, setTagType] = useState<'HD2' | 'HD3'>('HD2');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [registrySearch, setRegistrySearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadHolidays();
    }
  }, [isOpen]);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await fetchCollectionData('work_timing');
      setHolidays(data as unknown as HolidayData[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const getHolidayForDate = (date: Date) => {
    const isoDate = date.toISOString().split('T')[0];
    const day = date.getDay();
    if (day === 0) return { type: 'HD1' as const, title: 'วันหยุดประจำสัปดาห์' };
    const stored = holidays.find(h => h.date === isoDate);
    return stored || null;
  };

  const handleSaveTag = async () => {
    if (!selectedDate || !tagTitle) return;
    setLoading(true);
    try {
      const payload: Partial<HolidayData> = {
        date: selectedDate,
        title: tagTitle,
        type: tagType,
        updatedAt: new Date().toISOString()
      };
      await setDocumentWithId('work_timing', selectedDate, payload);
      await loadHolidays();
      resetForm();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday: HolidayData) => {
    setSelectedDate(holiday.date);
    setTagTitle(holiday.title);
    setTagType(holiday.type as 'HD2' | 'HD3');
    setEditingId(holiday.id);
    setViewMode('calendar'); // Switch to calendar to see the form
  };

  const resetForm = () => {
    setSelectedDate(null);
    setTagTitle('');
    setTagType('HD2');
    setEditingId(null);
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("ยืนยันการลบข้อมูลการทำงาน/วันหยุดนี้?")) return;
    setLoading(true);
    try {
      await deleteDocumentFromCollection('work_timing', id);
      await loadHolidays();
      if (selectedDate === id) resetForm();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistry = useMemo(() => {
    return holidays
      .filter(h => h.title.toLowerCase().includes(registrySearch.toLowerCase()) || h.date.includes(registrySearch))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [holidays, registrySearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl w-full max-w-6xl border border-white/60 flex flex-col h-[90vh] animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-white/40 rounded-t-[40px]">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-tight uppercase">ระบบบริหารจัดการปฏิทินงาน (Work Schedule CRUD)</h3>
              <div className="flex items-center gap-3 mt-1">
                 <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-widest">Database Sync Active</span>
                 <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                 <p className="text-xs font-bold text-slate-400">กำหนดวันหยุดและตารางงานบริษัทตามมาตรฐาน ISO</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200 shadow-inner">
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CalendarDays className="w-4 h-4" /> ปฏิทิน
                </button>
                <button 
                  onClick={() => setViewMode('registry')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'registry' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <ListIcon className="w-4 h-4" /> จัดการข้อมูล (CRUD)
                </button>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-300 hover:text-red-500 transition-colors">
               <X className="w-8 h-8" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Main Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-transparent">
            {viewMode === 'calendar' ? (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-6">
                     <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-3 bg-white hover:bg-indigo-50 rounded-2xl border border-slate-200 transition-all shadow-sm"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                     <h4 className="text-2xl font-black text-slate-800 min-w-[240px] text-center tracking-tight">
                       {THAI_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                     </h4>
                     <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-3 bg-white hover:bg-indigo-50 rounded-2xl border border-slate-200 transition-all shadow-sm"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
                  </div>

                  <div className="flex gap-3">
                     {HD_TYPES.map(type => (
                       <div key={type.id} className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{type.label}</span>
                       </div>
                     ))}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-4">
                  {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day, i) => (
                    <div key={day} className={`text-center py-3 text-[10px] font-black uppercase tracking-[0.2em] ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {day}
                    </div>
                  ))}
                  
                  {daysInMonth.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="h-32 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-100 opacity-40"></div>;
                    
                    const holiday = getHolidayForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isoDate = date.toISOString().split('T')[0];

                    return (
                      <div 
                        key={isoDate}
                        onClick={() => holiday?.type !== 'HD1' && setSelectedDate(isoDate)}
                        className={`h-32 rounded-[32px] border-2 p-4 transition-all group relative cursor-pointer flex flex-col shadow-sm ${
                          holiday?.type === 'HD1' ? 'bg-yellow-50 border-yellow-100' :
                          holiday?.type === 'HD2' ? 'bg-orange-50 border-orange-200' :
                          holiday?.type === 'HD3' ? 'bg-rose-50 border-rose-200' :
                          'bg-white border-slate-50 hover:border-indigo-200 hover:shadow-xl'
                        } ${isToday ? 'ring-4 ring-indigo-500/20 border-indigo-500' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                           <span className={`text-lg font-black ${isToday ? 'text-indigo-600' : holiday?.type === 'HD1' ? 'text-yellow-600' : 'text-slate-400'}`}>
                             {date.getDate()}
                           </span>
                           {holiday && (
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                               holiday.type === 'HD1' ? 'bg-yellow-200 text-yellow-800' :
                               holiday.type === 'HD2' ? 'bg-orange-600 text-white' :
                               'bg-rose-600 text-white'
                             }`}>
                               {holiday.type}
                             </span>
                           )}
                        </div>
                        {holiday && (
                          <div className={`mt-3 text-[10px] font-bold leading-tight line-clamp-2 ${
                            holiday.type === 'HD1' ? 'text-yellow-700/60' :
                            holiday.type === 'HD2' ? 'text-orange-900' :
                            'text-red-900'
                          }`}>
                            {holiday.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* --- Registry View (CRUD) --- */
              <div className="animate-fade-in space-y-6">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
                       <Database className="w-6 h-6 text-indigo-600" /> รายการฐานข้อมูลวันหยุด (Work Registry)
                    </h4>
                    <div className="relative w-72">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="ค้นหาวันที่ หรือ ชื่อ..."
                         value={registrySearch}
                         onChange={(e) => setRegistrySearch(e.target.value)}
                         className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                       />
                    </div>
                 </div>

                 <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                          <tr>
                             <th className="px-8 py-5">ลำดับ / วันที่</th>
                             <th className="px-8 py-5">รายละเอียดวันหยุด</th>
                             <th className="px-8 py-5 text-center">ประเภท (Type)</th>
                             <th className="px-8 py-5 text-right">การจัดการ (Actions)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {filteredRegistry.length === 0 ? (
                            <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest">ไม่พบข้อมูลในระบบ</td></tr>
                          ) : filteredRegistry.map((h, idx) => (
                             <tr key={h.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-4">
                                      <span className="text-[10px] font-black text-slate-300">{(idx+1).toString().padStart(2, '0')}</span>
                                      <span className="font-mono text-sm font-black text-slate-700">{h.date}</span>
                                   </div>
                                </td>
                                <td className="px-8 py-5 font-bold text-slate-600">{h.title}</td>
                                <td className="px-8 py-5 text-center">
                                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                      h.type === 'HD2' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                   }`}>
                                      {h.type} {h.type === 'HD2' ? '(ANNUAL)' : '(TRADITION)'}
                                   </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEdit(h)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteTag(h.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
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

          {/* Right Sidebar: Form Control */}
          <div className="w-full md:w-80 bg-white/40 backdrop-blur-md p-8 flex flex-col gap-6 overflow-y-auto border-l border-slate-100">
             
             {selectedDate ? (
               <div className="bg-white p-8 rounded-[40px] border-2 border-indigo-500 shadow-2xl space-y-6 animate-fade-in-down">
                  <div className="flex items-center justify-between">
                     <h5 className="font-black text-sm text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                        {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingId ? 'แก้ไขข้อมูล' : 'เพิ่มรายการใหม่'}
                     </h5>
                     <button onClick={resetForm} className="text-slate-300 hover:text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 text-center shadow-inner">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">วันที่เลือก (Selected Date)</p>
                     <p className="text-lg font-black text-indigo-900">{new Date(selectedDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                  </div>

                  <div className="space-y-5">
                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อกิจกรรม/วันหยุด</label>
                        <input 
                          type="text" 
                          placeholder="เช่น วันขึ้นปีใหม่..." 
                          value={tagTitle}
                          onChange={(e) => setTagTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ระดับความสำคัญ</label>
                        <div className="grid grid-cols-1 gap-2">
                           {HD_TYPES.map(type => (
                             <button 
                               key={type.id}
                               onClick={() => setTagType(type.id as any)} 
                               className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${
                                 tagType === type.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-100'
                               }`}
                             >
                                <div className={`w-2 h-2 rounded-full ${tagType === type.id ? 'bg-white' : type.color}`}></div>
                                {type.label}
                             </button>
                           ))}
                        </div>
                     </div>
                     
                     <div className="pt-2 flex flex-col gap-3">
                        <button 
                          onClick={handleSaveTag}
                          disabled={loading || !tagTitle}
                          className="w-full py-4 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-30"
                        >
                          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          {editingId ? 'บันทึกการแก้ไข' : 'ยืนยันการบันทึก'}
                        </button>
                        
                        {editingId && (
                           <button 
                             onClick={() => handleDeleteTag(editingId)}
                             className="w-full py-3 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                           >
                             <Trash2 className="w-3.5 h-3.5" /> ลบรายการนี้ออก
                           </button>
                        )}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-40">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Plus className="w-12 h-12 text-slate-300" />
                  </div>
                  <p className="text-[12px] font-black text-slate-600 uppercase leading-relaxed tracking-wider">
                    เลือกวันที่ในปฏิทิน<br/>หรือกดปุ่มแก้ไขในตาราง<br/>เพื่อบริหารข้อมูล
                  </p>
               </div>
             )}

             {/* Help Card */}
             <div className="bg-indigo-900 rounded-[32px] p-6 text-white relative overflow-hidden mt-auto">
                <div className="absolute top-0 right-0 p-3 opacity-10"><Info className="w-16 h-16" /></div>
                <h6 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Management Note</h6>
                <p className="text-[10px] font-bold leading-relaxed opacity-70">
                   การกำหนดวันหยุด HD2/HD3 จะมีผลทำให้พนักงานไม่สามารถลงเวลา "เข้าทำงานปกติ" ได้ และระบบจะบังคับให้เป็นการลงเวลา OT ทั้งหมด
                </p>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center px-12 text-slate-300 rounded-b-[40px]">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Central Work Timing Verified</span>
              </div>
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">FireView HR Core v5.5.0 • CRUD Engine Pro</p>
        </div>
      </div>
    </div>
  );
};

// Internal icon for consistency
const Database: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);
