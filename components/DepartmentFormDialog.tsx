import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, Hash, Target, Edit } from 'lucide-react';
import { setDocumentWithId } from '../services/firebase';
import { DepartmentData } from '../types';

interface DepartmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  initialData?: DepartmentData | null;
}

const INITIAL_DATA: DepartmentData = {
  departmentId: '',
  name: '',
  headOfDepartment: '',
  targetHeadcount: 0
};

export const DepartmentFormDialog: React.FC<DepartmentFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<DepartmentData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData(INITIAL_DATA);
      }
    }
  }, [isOpen, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'targetHeadcount' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.departmentId || !formData.name) {
      alert("กรุณากรอกรหัสแผนกและชื่อแผนก");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      
      // Use departmentId as the document ID
      await setDocumentWithId('departments', formData.departmentId, payload);
      await onSave();
      onClose();
    } catch (err) {
      console.error("Error saving department:", err);
      alert("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-teal-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 text-white rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-teal-900">
                {isEditMode ? 'แก้ไขข้อมูลแผนก' : 'เพิ่มแผนกใหม่'}
              </h3>
              <p className="text-xs text-teal-600">
                Department Management
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full text-teal-600 hover:text-teal-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" /> 
              รหัสแผนก (Department ID) <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleInputChange}
              placeholder="เช่น HR, IT, SALE"
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none uppercase font-mono ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-teal-500'}`}
              readOnly={isEditMode}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" /> 
              ชื่อแผนก (Department Name) <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="เช่น ทรัพยากรบุคคล, เทคโนโลยีสารสนเทศ"
              className="w-full p-2 border border-teal-500 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> 
              ชื่อหัวหน้า / ผู้บังคับบัญชา
            </label>
            <input 
              type="text"
              name="headOfDepartment"
              value={formData.headOfDepartment}
              onChange={handleInputChange}
              placeholder="ระบุชื่อหัวหน้าแผนก"
              className="w-full p-2 border border-teal-500 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400" /> 
              เป้าหมายอัตรากำลังคน (Target Headcount)
            </label>
            <input 
              type="number"
              name="targetHeadcount"
              value={formData.targetHeadcount}
              onChange={handleInputChange}
              min={0}
              className="w-full p-2 border border-teal-500 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white font-mono"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-lg shadow-teal-200 flex items-center gap-2 transition-all disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};