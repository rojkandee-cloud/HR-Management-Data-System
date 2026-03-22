
import React, { useState, useEffect } from 'react';
import { X, Briefcase, Hash, UserCheck, Layers, Link as LinkIcon, Save, ExternalLink, User } from 'lucide-react';
import { getSingleDocument, setDocumentWithId, fetchCollectionData } from '../services/firebase';
import { WorkPermissionData, DepartmentData } from '../types';

interface WorkPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

const EXPERTISE_LEVELS = [
  "Trainee (ฝึกหัด)",
  "Junior (ระดับต้น)",
  "Senior (ระดับสูง)",
  "Supervisor (หัวหน้างาน)",
  "Manager (ผู้จัดการ)",
  "Specialist (ผู้เชี่ยวชาญ)",
  "Executive (ผู้บริหาร)"
];

const INITIAL_DATA: WorkPermissionData = {
  employeeId: '',
  workingCode: '',
  position: '',
  expertiseLevel: '',
  department: '',
  jobDescriptionUrl: 'https://online.anyflip.com/bntcz/gnrd/mobile/index.html',
  employeeImage: ''
};

export const WorkPermissionDialog: React.FC<WorkPermissionDialogProps> = ({ isOpen, onClose, employeeId, employeeName }) => {
  const [formData, setFormData] = useState<WorkPermissionData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [currentEmployeeImage, setCurrentEmployeeImage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      if (employeeId) {
        loadData();
        loadEmployeeData();
      }
    }
  }, [isOpen, employeeId]);

  const loadDepartments = async () => {
    try {
      const docs = await fetchCollectionData('departments');
      if (docs && docs.length > 0) {
        const depts = docs.map(d => (d as unknown as DepartmentData).name).sort();
        setDepartmentOptions(depts);
      } else {
        // Fallback defaults if DB empty
        setDepartmentOptions([
          "Human Resources (HR)", "Information Technology (IT)", "Sales & Marketing", 
          "Accounting & Finance", "Operations / Production", "Logistics / Warehouse", 
          "Research & Development (R&D)", "Customer Service", "Legal", "Other"
        ]);
      }
    } catch (e) {
      console.warn("Failed to load departments, using defaults");
    }
  };

  const generateAutoCode = () => {
    const year = new Date().getFullYear();
    // Format: WP-EMP_ID-YEAR
    return `WP-${employeeId}-${year}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const doc = await getSingleDocument('work_permissions', employeeId);
      if (doc) {
        const loadedData = doc as unknown as WorkPermissionData;
        // Ensure default JD link if existing data is missing/empty, but prefer loaded data if present
        if (!loadedData.jobDescriptionUrl) {
            loadedData.jobDescriptionUrl = INITIAL_DATA.jobDescriptionUrl;
        }
        setFormData(loadedData);
      } else {
        // Init new data with auto-generated code
        setFormData({ 
          ...INITIAL_DATA, 
          employeeId,
          workingCode: generateAutoCode() 
        });
      }
    } catch (err) {
      console.error("Failed to load work permission data", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeData = async () => {
    try {
      const doc = await getSingleDocument('employees', employeeId);
      if (doc && doc.employeeImage) {
        setCurrentEmployeeImage(doc.employeeImage);
      }
    } catch (err) {
      console.error("Failed to load employee data", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.position || !formData.department) {
        alert("กรุณาระบุตำแหน่งและแผนก");
        return;
    }

    setLoading(true);
    try {
      const payload: WorkPermissionData = {
        ...formData,
        employeeId, // Ensure ID link
        updatedAt: new Date().toISOString(),
        employeeImage: currentEmployeeImage // Save the fetched image to work_permissions
      };
      await setDocumentWithId('work_permissions', employeeId, payload);
      onClose();
    } catch (err) {
      console.error("Save failed", err);
      alert("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col my-8 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-cyan-50 rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="relative">
                {/* Employee Image Display */}
                {currentEmployeeImage ? (
                    <img src={currentEmployeeImage} alt="Employee" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                    <div className="w-14 h-14 bg-cyan-200 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-cyan-700">
                        <User className="w-8 h-8" />
                    </div>
                )}
                <div className="absolute -bottom-1 -right-1 p-1 bg-cyan-600 text-white rounded-lg border-2 border-white shadow-sm">
                    <Briefcase className="w-3 h-3" />
                </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-cyan-900">
                ข้อมูลตำแหน่งงาน (Work Permission)
              </h3>
              <p className="text-xs text-cyan-700">
                Job Details for: <span className="font-semibold">{employeeName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full text-cyan-600 hover:text-cyan-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* 1. Working Code (Auto) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <label className="block text-sm font-semibold text-slate-500 mb-1 flex items-center gap-2">
               <Hash className="w-4 h-4" /> 
               1. รหัสงาน (Working Code) - Auto Generated
             </label>
             <div className="font-mono text-lg font-bold text-slate-700 tracking-wider">
               {formData.workingCode}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">รหัสอ้างอิงอัตโนมัติจากระบบ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* 2. Position */}
             <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  2. ชื่อตำแหน่งงาน (Position) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  name="position"
                  value={formData.position} 
                  onChange={handleInputChange}
                  placeholder="เช่น Software Engineer, HR Officer..."
                  className="w-full p-2 border border-cyan-500 rounded-lg focus:ring-2 focus:ring-cyan-300 bg-white"
                />
             </div>

             {/* 3. Expertise Level */}
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  3. ระดับความชำนาญ
                </label>
                <select 
                  name="expertiseLevel"
                  value={formData.expertiseLevel} 
                  onChange={handleInputChange}
                  className="w-full p-2 border border-cyan-500 rounded-lg focus:ring-2 focus:ring-cyan-300 bg-white"
                >
                  <option value="">-- เลือกระดับ --</option>
                  {EXPERTISE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
             </div>

             {/* 4. Department */}
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  4. ชื่อแผนก (Section/Department)
                </label>
                <select 
                  name="department"
                  value={formData.department} 
                  onChange={handleInputChange}
                  className="w-full p-2 border border-cyan-500 rounded-lg focus:ring-2 focus:ring-cyan-300 bg-white"
                >
                  <option value="">-- เลือกแผนก --</option>
                  {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
             </div>
          </div>

          {/* 5. Job Description URL */}
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
               <LinkIcon className="w-4 h-4 text-slate-400" />
               5. หน้าที่รับผิดชอบ (JD URL)
             </label>
             <div className="flex gap-2">
                <input 
                  type="url"
                  name="jobDescriptionUrl"
                  value={formData.jobDescriptionUrl} 
                  onChange={handleInputChange}
                  placeholder="https://docs.google.com/..."
                  className="flex-1 p-2 border border-cyan-500 rounded-lg focus:ring-2 focus:ring-cyan-300 bg-white placeholder-slate-300 text-sm"
                />
                {formData.jobDescriptionUrl && (
                  <a 
                    href={formData.jobDescriptionUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                    title="Open Link"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">วางลิงก์เอกสาร Google Docs, PDF หรือลิงก์ที่เกี่ยวข้อง</p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-lg shadow-cyan-200 flex items-center gap-2 transition-all disabled:opacity-70">
            <Save className="w-4 h-4" />
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </div>
    </div>
  );
};
