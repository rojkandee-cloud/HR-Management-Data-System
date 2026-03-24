import React, { useState } from 'react';
import { User, CreditCard, Pencil, Trash2, Building2, MapPin, GraduationCap, Briefcase, ScrollText, History, Phone, Eye, Activity } from 'lucide-react';

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

export const EmployeeTag: React.FC<EmployeeTagProps> = React.memo(({ id, data, onEdit, onDelete, onManageAddress, onManageEducation, onManageWorkPermission, onManageWorkProfile, onManageLeaveHistory, onViewDossier }) => {
  const { 
    employeeId, title, fullName, nickname, employeeImage, idCardNumber, qrCode, department, phoneNumber, employmentStatus 
  } = data;

  const [logoError, setLogoError] = useState(false);

  const getStatusColor = () => {
    switch (employmentStatus) {
      case 'ยังทำงานอยู่': return 'bg-emerald-500';
      case 'ทดลองงาน': return 'bg-amber-500';
      case 'พักงาน': return 'bg-rose-500';
      case 'ลาออกแล้ว': return 'bg-slate-500';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden flex flex-col relative group print:shadow-none print:border-slate-800">
      {/* Cover */}
      <div className={`h-24 w-full ${getStatusColor()} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30"></div>
        {/* Logo */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-white/50 z-10">
           {!logoError ? (
             <img src="https://img2.pic.in.th/logo_2637c29d-fedb-4854-850e-6a929393e100_250_250.th.jpg" alt="Logo" className="w-6 h-6 object-contain rounded" onError={() => setLogoError(true)} />
           ) : (
             <div className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded"><Building2 className="w-4 h-4" /></div>
           )}
        </div>
        {/* Status Badge */}
        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white tracking-wider border border-white/30 z-10 flex items-center gap-1.5 shadow-sm">
          <Activity className="w-3 h-3" />
          {employmentStatus || 'GENERAL'}
        </div>
      </div>

      {/* Profile Picture & Primary Actions */}
      <div className="px-4 relative">
        <div className="absolute -top-12 left-4 w-24 h-24 rounded-full border-4 border-white bg-slate-50 shadow-md overflow-hidden flex items-center justify-center z-20">
          {employeeImage ? (
            <img src={employeeImage} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-slate-300" />
          )}
        </div>
        
        {/* Primary Actions (Visible on hover) */}
        <div className="absolute -top-5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-slate-100 z-30 translate-y-2 group-hover:translate-y-0 print:hidden">
          <button type="button" onClick={(e) => { e.stopPropagation(); onViewDossier?.(employeeId); }} className="p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors" title="ดูข้อมูลแบบเต็ม"><Eye className="w-4 h-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.(data); }} className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete?.(id); }} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Details */}
      <div className="pt-14 pb-4 px-4 flex-1 flex flex-col bg-white">
        <div className="mb-3">
          <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-1" title={`${title} ${fullName}`}>{title} {fullName}</h3>
          {nickname && <p className="text-sm text-indigo-600 font-bold mt-0.5">({nickname})</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded-md border border-slate-200 shadow-sm">{employeeId}</span>
          {department && (
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full border border-indigo-100 truncate flex items-center max-w-[160px]">
              <Building2 className="w-3 h-3 mr-1.5 shrink-0"/>
              <span className="truncate">{department}</span>
            </span>
          )}
        </div>

        <div className="flex justify-between items-end mt-auto">
          <div className="space-y-2.5 flex-1 pr-2">
            <div className="flex items-center text-xs text-slate-600 font-medium">
              <Phone className="w-3.5 h-3.5 mr-2.5 text-slate-400 shrink-0" />
              <span className="truncate">{phoneNumber || '-'}</span>
            </div>
            {idCardNumber && (
              <div className="flex items-center text-xs text-slate-600 font-medium">
                <CreditCard className="w-3.5 h-3.5 mr-2.5 text-slate-400 shrink-0" />
                <span className="font-mono tracking-tight truncate">{idCardNumber}</span>
              </div>
            )}
          </div>
          {qrCode && (
            <div className="shrink-0">
              <img src={qrCode} alt="QR" className="w-12 h-12 border border-slate-200 rounded-lg p-1 bg-white object-contain shadow-sm" />
            </div>
          )}
        </div>

        {/* Secondary Management Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-5 gap-1.5 print:hidden">
          <button type="button" onClick={(e) => { e.stopPropagation(); onManageWorkProfile?.(id, `${title} ${fullName}`); }} className="flex flex-col items-center justify-center py-2 px-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all group/btn shadow-sm border border-indigo-100/50" title="ประวัติการทำงาน">
            <ScrollText className="w-4 h-4 mb-1 group-hover/btn:scale-110 transition-transform" />
            <span className="text-[8px] font-extrabold tracking-wide">งาน</span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onManageWorkPermission?.(id, `${title} ${fullName}`); }} className="flex flex-col items-center justify-center py-2 px-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all group/btn shadow-sm border border-emerald-100/50" title="ใบอนุญาต">
            <Briefcase className="w-4 h-4 mb-1 group-hover/btn:scale-110 transition-transform" />
            <span className="text-[8px] font-extrabold tracking-wide">อนุญาต</span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onManageEducation?.(id, `${title} ${fullName}`); }} className="flex flex-col items-center justify-center py-2 px-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-all group/btn shadow-sm border border-amber-100/50" title="การศึกษา">
            <GraduationCap className="w-4 h-4 mb-1 group-hover/btn:scale-110 transition-transform" />
            <span className="text-[8px] font-extrabold tracking-wide">ศึกษา</span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onManageAddress?.(id, `${title} ${fullName}`); }} className="flex flex-col items-center justify-center py-2 px-1 bg-cyan-50 text-cyan-600 hover:bg-cyan-100 rounded-xl transition-all group/btn shadow-sm border border-cyan-100/50" title="ที่อยู่">
            <MapPin className="w-4 h-4 mb-1 group-hover/btn:scale-110 transition-transform" />
            <span className="text-[8px] font-extrabold tracking-wide">ที่อยู่</span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onManageLeaveHistory?.(id, `${title} ${fullName}`); }} className="flex flex-col items-center justify-center py-2 px-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all group/btn shadow-sm border border-rose-100/50" title="ประวัติการลา">
            <History className="w-4 h-4 mb-1 group-hover/btn:scale-110 transition-transform" />
            <span className="text-[8px] font-extrabold tracking-wide">ลาหยุด</span>
          </button>
        </div>
      </div>
    </div>
  );
});