import React from 'react';
import { Building2, User, Target, Pencil, Trash2, Briefcase } from 'lucide-react';
import { DepartmentData } from '../types';

interface DepartmentCardProps {
  data: DepartmentData;
  onEdit: (data: DepartmentData) => void;
  onDelete: (id: string) => void;
  onManagePositions?: (dept: DepartmentData) => void;
}

// Helper to determine color theme based on Department ID
const getDepartmentStyle = (id: string) => {
  const code = (id || '').toUpperCase();
  
  if (code.includes('HR')) return {
    bar: 'bg-pink-500',
    icon: 'bg-pink-100 text-pink-600 border-pink-200',
    badge: 'bg-pink-50 text-pink-700 border-pink-200',
    hoverBorder: 'group-hover:border-pink-300',
    textHighlight: 'text-pink-600'
  };
  if (code.includes('IT') || code.includes('DEV') || code.includes('TECH')) return {
    bar: 'bg-blue-500',
    icon: 'bg-blue-100 text-blue-600 border-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    hoverBorder: 'group-hover:border-blue-300',
    textHighlight: 'text-blue-600'
  };
  if (code.includes('SALE') || code.includes('MKT')) return {
    bar: 'bg-emerald-500',
    icon: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hoverBorder: 'group-hover:border-emerald-300',
    textHighlight: 'text-emerald-600'
  };
  if (code.includes('ACC') || code.includes('FIN')) return {
    bar: 'bg-amber-500',
    icon: 'bg-amber-100 text-amber-600 border-amber-200',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    hoverBorder: 'group-hover:border-amber-300',
    textHighlight: 'text-amber-600'
  };
  if (code.includes('OPS') || code.includes('PROD') || code.includes('MANU')) return {
    bar: 'bg-orange-500',
    icon: 'bg-orange-100 text-orange-600 border-orange-200',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    hoverBorder: 'group-hover:border-orange-300',
    textHighlight: 'text-orange-600'
  };
  if (code.includes('LOG') || code.includes('WH') || code.includes('STOCK')) return {
    bar: 'bg-cyan-500',
    icon: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    hoverBorder: 'group-hover:border-cyan-300',
    textHighlight: 'text-cyan-600'
  };
  if (code.includes('RND') || code.includes('ENG')) return {
    bar: 'bg-violet-500',
    icon: 'bg-violet-100 text-violet-600 border-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    hoverBorder: 'group-hover:border-violet-300',
    textHighlight: 'text-violet-600'
  };
  if (code.includes('CS') || code.includes('SERV')) return {
    bar: 'bg-teal-500',
    icon: 'bg-teal-100 text-teal-600 border-teal-200',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    hoverBorder: 'group-hover:border-teal-300',
    textHighlight: 'text-teal-600'
  };
  if (code.includes('LEG') || code.includes('LAW')) return {
    bar: 'bg-slate-500',
    icon: 'bg-slate-100 text-slate-600 border-slate-200',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    hoverBorder: 'group-hover:border-slate-300',
    textHighlight: 'text-slate-600'
  };
  if (code.includes('ADMIN') || code.includes('MNG') || code.includes('DIR')) return {
    bar: 'bg-red-500',
    icon: 'bg-red-100 text-red-600 border-red-200',
    badge: 'bg-red-50 text-red-700 border-red-200',
    hoverBorder: 'group-hover:border-red-300',
    textHighlight: 'text-red-600'
  };

  // Default
  return {
    bar: 'bg-indigo-500',
    icon: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    hoverBorder: 'group-hover:border-indigo-300',
    textHighlight: 'text-indigo-600'
  };
};

export const DepartmentCard: React.FC<DepartmentCardProps> = ({ data, onEdit, onDelete, onManagePositions }) => {
  const styles = getDepartmentStyle(data.departmentId);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col h-full relative ${styles.hoverBorder}`}>
      
      {/* Top Decoration */}
      <div className={`h-2 w-full ${styles.bar}`}></div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(data); }}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors border border-slate-200"
          title="แก้ไข"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); if(data.departmentId) onDelete(data.departmentId); }}
          className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors border border-slate-200"
          title="ลบ"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${styles.icon}`}>
                <Building2 className="w-6 h-6" />
             </div>
             <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department ID</span>
                <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded border ${styles.badge}`}>
                  {data.departmentId}
                </span>
             </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-4 line-clamp-2 min-h-[3.5rem] flex items-center">
          {data.name}
        </h3>

        <div className="space-y-3 mt-auto">
           <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                 <User className="w-4 h-4" />
                 <span className="text-xs font-semibold">หัวหน้าแผนก</span>
              </div>
              <span className="font-medium text-slate-800 truncate max-w-[120px]" title={data.headOfDepartment}>
                {data.headOfDepartment || '-'}
              </span>
           </div>

           <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                 <Target className="w-4 h-4" />
                 <span className="text-xs font-semibold">เป้าหมาย (คน)</span>
              </div>
              <span className={`font-bold ${styles.textHighlight}`}>
                {data.targetHeadcount || 0}
              </span>
           </div>

           {/* Manage Positions Button */}
           {onManagePositions && (
             <button
                onClick={(e) => { e.stopPropagation(); onManagePositions(data); }}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 mt-2 border border-indigo-100"
             >
                <Briefcase className="w-3.5 h-3.5" /> จัดการตำแหน่งงาน
             </button>
           )}
        </div>
      </div>
    </div>
  );
};