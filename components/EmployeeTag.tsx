import React, { useState } from 'react';
import { User, CreditCard, Pencil, Trash2, Cake, Building2, MapPin, GraduationCap, Briefcase, ScrollText, History, Phone, Eye, Activity } from 'lucide-react';

interface EmployeeTagProps {
  id: string; 
  data: any;
  onEdit?: (data: any) => void;
  onDelete?: (id: string) => void;
  onManageAddress?: (id: string, name: string) => void;
  onManageEducation?: (id: string, name: string) => void;
  onManageWorkPermission?: (id: string, name: string) => void;
  onManageWorkProfile?: (id: string, name: string) => void;
  onManageLeaveHistory?: (id: string, name: string) => void;
  onViewDossier?: (id: string) => void;
}

export const EmployeeTag: React.FC<EmployeeTagProps> = ({ id, data, onEdit, onDelete, onManageAddress, onManageEducation, onManageWorkPermission, onManageWorkProfile, onManageLeaveHistory, onViewDossier }) => {
  const { 
    employeeId, title, fullName, nickname, employeeImage, birthDateISO, idCardNumber, qrCode, department, phoneNumber, employmentStatus 
  } = data;

  const [logoError, setLogoError] = useState(false);

  const getAgeInfo = () => {
    if (!birthDateISO) return null;
    const dob = new Date(birthDateISO);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }
    const currentYear = today.getFullYear();
    let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
    const todayTime = new Date().setHours(0,0,0,0);
    if (nextBirthday.getTime() < todayTime) { nextBirthday.setFullYear(currentYear + 1); }
    const diffTime = nextBirthday.getTime() - todayTime;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { age, isNear: diffDays <= 30 };
  };

  const ageInfo = getAgeInfo();

  const getStatusColor = () => {
    switch (employmentStatus) {
      case 'ยังทำงานอยู่': return 'bg-purple-600';
      case 'ทดลองงาน': return 'bg-amber-500';
      case 'พักงาน': return 'bg-rose-500';
      case 'ลาออกแล้ว': return 'bg-slate-500';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <div className="mx-auto w-[230px] h-[380px] bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 group relative print:shadow-none print:border-slate-800">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-100 rounded-full border border-slate-200 z-20 shadow-inner"></div>

      <div className="absolute top-3 left-3 z-30">
        <div className="bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-white/50">
           {!logoError ? (
             <img src="https://img2.pic.in.th/logo_2637c29d-fedb-4854-850e-6a929393e100_250_250.th.jpg" alt="Lhek Fah Sai" className="w-8 h-8 object-contain rounded" onError={() => setLogoError(true)} />
           ) : (
             <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded"><Building2 className="w-5 h-5" /></div>
           )}
        </div>
      </div>

      <div className="absolute top-14 right-2 flex flex-col gap-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
        <button type="button" onClick={(e) => { e.stopPropagation(); onViewDossier?.(employeeId); }} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg border border-indigo-500 transition-all transform hover:scale-110"><Eye className="w-3.5 h-3.5" /></button>
        <div className="h-px bg-slate-100 mx-1 my-0.5"></div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onManageLeaveHistory?.(id, `${title} ${fullName}`); }} className="p-1.5 bg-white/90 hover:bg-orange-500 text-orange-600 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><History className="w-3 h-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onManageWorkProfile?.(id, `${title} ${fullName}`); }} className="p-1.5 bg-white/90 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><ScrollText className="w-3 h-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onManageWorkPermission?.(id, `${title} ${fullName}`); }} className="p-1.5 bg-white/90 hover:bg-cyan-500 text-cyan-600 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><Briefcase className="w-3 h-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onManageEducation?.(id, `${title} ${fullName}`); }} className="p-1.5 bg-white/90 hover:bg-amber-50 text-amber-500 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><GraduationCap className="w-3 h-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onManageAddress?.(id, `${title} ${fullName}`); }} className="p-1.5 bg-white/90 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><MapPin className="w-3 h-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.(data); }} className="p-1.5 bg-white/90 hover:bg-slate-600 text-slate-500 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><Pencil className="w-3 h-3" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete?.(id); }} className="p-1.5 bg-white/90 hover:bg-red-600 text-red-500 hover:text-white rounded-full shadow-sm border border-slate-200 transition-colors"><Trash2 className="w-3 h-3" /></button>
      </div>

      <div className={`h-[120px] w-full ${getStatusColor()} relative flex justify-center items-end pb-0 transition-colors duration-500`}>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/20 to-black/40 opacity-50"></div>
        <div className="absolute top-7 w-full text-center text-white/80 text-[8px] font-black tracking-[0.25em] uppercase">
          {employmentStatus || 'GENERAL STAFF'}
        </div>
        <div className="absolute -bottom-[60px] z-10">
          <div className="w-[120px] h-[120px] rounded-full border-[5px] border-white bg-slate-50 overflow-hidden shadow-md flex items-center justify-center relative">
            {employeeImage ? (
              <img src={employeeImage} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-14 h-14 text-slate-300" />
            )}
          </div>
        </div>
      </div>

      <div className="pt-[70px] pb-4 px-3 flex-1 flex flex-col items-center text-center bg-white">
        <h3 className="font-bold text-base text-slate-900 leading-tight line-clamp-2">{title} {fullName}</h3>
        {nickname && <p className="text-xs text-indigo-600 font-black mt-1">"{nickname}"</p>}
        <div className="mt-2 mb-1 inline-flex items-center px-3 py-1 rounded bg-slate-900 text-white text-[11px] font-mono font-bold tracking-widest shadow-sm">{employeeId}</div>
        {department && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold truncate max-w-[180px]">
             <Building2 className="w-3 h-3 shrink-0" />
             <span className="truncate">{department}</span>
          </div>
        )}

        <div className="w-full mt-auto space-y-1.5 border-t border-slate-100 pt-2">
           <div className="flex justify-between items-center text-xs">
             <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Contact</span>
             <span className="text-indigo-700 font-bold flex items-center gap-1"><Phone className="w-2.5 h-2.5"/> {phoneNumber || '-'}</span>
           </div>
           <div className="flex justify-between items-center text-xs">
             <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Status</span>
             <span className="text-slate-700 font-black flex items-center gap-1 uppercase text-[8px]">{employmentStatus} <Activity className="w-2.5 h-2.5" /></span>
           </div>
           {idCardNumber && (
            <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-slate-50 w-full px-1">
               <div className="flex flex-col items-start">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">ID Number</span>
                  <span className="text-[10px] font-mono text-slate-500 tracking-tight">{idCardNumber}</span>
               </div>
               {qrCode && <img src={qrCode} alt="ID QR" className="w-10 h-10 border border-slate-200 rounded p-0.5 bg-white object-contain" />}
            </div>
           )}
        </div>
      </div>
      <div className={`h-1.5 w-full ${getStatusColor()}`}></div>
    </div>
  );
};