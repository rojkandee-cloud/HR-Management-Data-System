import React from 'react';
import { User, CreditCard, Pencil, Trash2, Building2, MapPin, GraduationCap, Briefcase, ScrollText, History, Phone, Eye, Activity, CheckSquare, Square } from 'lucide-react';
import { FirestoreDoc } from '../types';

interface EmployeeTableProps {
  documents: FirestoreDoc[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  onEdit: (data: any) => void;
  onDelete: (id: string) => void;
  onManageAddress: (id: string, name: string) => void;
  onManageEducation: (id: string, name: string) => void;
  onManageWorkPermission: (id: string, name: string) => void;
  onManageWorkProfile: (id: string, name: string) => void;
  onManageLeaveHistory: (id: string, name: string) => void;
  onViewDossier: (id: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  documents,
  selectedIds,
  toggleSelect,
  onEdit,
  onDelete,
  onManageAddress,
  onManageEducation,
  onManageWorkPermission,
  onManageWorkProfile,
  onManageLeaveHistory,
  onViewDossier
}) => {
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
          <tr>
            <th className="p-4 w-12 text-center">
              {/* Optional: Select All checkbox could go here */}
            </th>
            <th className="p-4">พนักงาน</th>
            <th className="p-4">รหัสพนักงาน</th>
            <th className="p-4">แผนก</th>
            <th className="p-4">เบอร์โทรศัพท์</th>
            <th className="p-4">สถานะ</th>
            <th className="p-4 text-center">จัดการข้อมูล</th>
            <th className="p-4 text-center">การกระทำ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const { 
              employeeId, title, fullName, nickname, employeeImage, department, phoneNumber, employmentStatus 
            } = doc;
            const isSelected = selectedIds.includes(doc.id);
            const nameStr = `${title || ''} ${fullName || ''}`.trim();

            const getStatusColor = () => {
              switch (employmentStatus) {
                case 'ยังทำงานอยู่': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                case 'ทดลองงาน': return 'bg-amber-100 text-amber-700 border-amber-200';
                case 'พักงาน': return 'bg-rose-100 text-rose-700 border-rose-200';
                case 'ลาออกแล้ว': return 'bg-slate-100 text-slate-700 border-slate-200';
                default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
              }
            };

            return (
              <tr key={doc.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-sky-50/50' : ''}`}>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => toggleSelect(doc.id)} 
                    className={`p-1 rounded-md transition-all ${isSelected ? 'text-sky-500' : 'text-slate-300 hover:text-sky-400'}`}
                  >
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {employeeImage ? (
                        <img src={employeeImage} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{nameStr}</div>
                      {nickname && <div className="text-xs text-indigo-600 font-medium">({nickname})</div>}
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs font-bold text-slate-700">
                  {employeeId}
                </td>
                <td className="p-4">
                  {department ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Building2 className="w-3 h-3 mr-1" />
                      {department}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-4">
                  {phoneNumber ? (
                    <div className="flex items-center text-xs font-medium">
                      <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {phoneNumber}
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor()}`}>
                    <Activity className="w-3 h-3 mr-1" />
                    {employmentStatus || 'GENERAL'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => onManageWorkProfile(doc.id, nameStr)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="ประวัติการทำงาน"><ScrollText className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onManageWorkPermission(doc.id, nameStr)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="ใบอนุญาต"><Briefcase className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onManageEducation(doc.id, nameStr)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="การศึกษา"><GraduationCap className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onManageAddress(doc.id, nameStr)} className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" title="ที่อยู่"><MapPin className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onManageLeaveHistory(doc.id, nameStr)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="ประวัติการลา"><History className="w-4 h-4" /></button>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => onViewDossier(employeeId)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="ดูข้อมูลแบบเต็ม"><Eye className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onEdit(doc)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => onDelete(doc.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
          {documents.length === 0 && (
            <tr>
              <td colSpan={8} className="p-8 text-center text-slate-500">
                ไม่พบข้อมูลพนักงาน
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
