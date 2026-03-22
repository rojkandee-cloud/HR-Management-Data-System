import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, ScrollText, Building2, Banknote, Briefcase, UserCheck, Clock, Activity, CreditCard, Lock, AlertTriangle } from 'lucide-react';
import { getSingleDocument, setDocumentWithId, fetchCollectionData } from '../services/firebase';
import { WorkProfileData, DepartmentData } from '../types';

interface WorkProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

const EMPLOYMENT_TYPES = [
  "พนักงานรายวัน (Daily)",
  "พนักงานรายเดือน (Monthly)",
  "พนักงานอัตราบริหาร (Management)",
  "พนักงานสัญญาจ้าง (Contract)",
  "พนักงานทดลองงาน (Probation)",
  "นักศึกษาฝึกงาน (Intern)"
];

const EMPLOYMENT_STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ลาออกแล้ว"
];

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const INITIAL_DATA: WorkProfileData = {
  employeeId: '',
  startDate: '',
  position: '',
  department: '',
  employmentType: '',
  salary: 0,
  employmentStatus: 'ยังทำงานอยู่',
  bankAccountNumber: ''
};

export const WorkProfileDialog: React.FC<WorkProfileDialogProps> = ({ isOpen, onClose, employeeId, employeeName }) => {
  const [formData, setFormData] = useState<WorkProfileData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [tenure, setTenure] = useState<string>('');
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [duplicateBankWarning, setDuplicateBankWarning] = useState<string | null>(null);
  
  // Security Lock State
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [lockError, setLockError] = useState(false);
  
  // Date Picker Logic
  const currentYear = new Date().getFullYear();
  const currentYearBE = currentYear + 543;
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYearBE - i); // Past 50 years
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    if (isOpen) {
      setIsLocked(true);
      setPin('');
      setLockError(false);
      setDuplicateBankWarning(null);
      loadDepartments();
      
      if (employeeId) {
        loadData();
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
        setDepartmentOptions([
          "Human Resources (HR)", "Information Technology (IT)", "Sales & Marketing", 
          "Accounting & Finance", "Operations / Production", "Logistics / Warehouse", 
          "Research & Development (R&D)", "Customer Service", "Legal", "Other"
        ]);
      }
    } catch (e) {
      console.warn("Failed to load departments", e);
    }
  };

  useEffect(() => {
    if (formData.startDate) {
        setTenure(calculateTenure(formData.startDate));
    } else {
        setTenure('-');
    }
  }, [formData.startDate]);

  const calculateTenure = (startDateStr: string) => {
    if (!startDateStr) return "-";
    const start = new Date(startDateStr);
    const now = new Date();
    
    if (isNaN(start.getTime())) return "-";
    if (start > now) return "ยังไม่ถึงวันเริ่มงาน";

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    return `${years} ปี ${months} เดือน ${days} วัน`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const doc = await getSingleDocument('work_profiles', employeeId);
      if (doc) {
        const loadedData = doc as unknown as WorkProfileData;
        if (!loadedData.employmentStatus) loadedData.employmentStatus = 'ยังทำงานอยู่';
        setFormData(loadedData);
        setSalaryInput(loadedData.salary !== undefined && loadedData.salary !== null ? loadedData.salary.toFixed(2) : '');
      } else {
        setFormData({ ...INITIAL_DATA, employeeId });
        setSalaryInput('');
      }
    } catch (err) {
      console.error("Failed to load work profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '140812') {
        setIsLocked(false);
        setLockError(false);
    } else {
        setLockError(true);
        setPin('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); 
    const value = raw.slice(0, 10); 
    
    let formatted = '';
    if (value.length > 0) formatted += value.substring(0, 3);
    if (value.length > 3) formatted += '-' + value.substring(3, 4);
    if (value.length > 4) formatted += '-' + value.substring(4, 9);
    if (value.length > 9) formatted += '-' + value.substring(9, 10);

    setFormData(prev => ({ ...prev, bankAccountNumber: formatted }));
    setDuplicateBankWarning(null);
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) {
        setSalaryInput(val);
        const num = parseFloat(val);
        setFormData(prev => ({ ...prev, salary: isNaN(num) ? 0 : num }));
    }
  };

  const handleSalaryBlur = () => {
    const num = parseFloat(salaryInput);
    if (!isNaN(num)) {
        const formatted = num.toFixed(2);
        setSalaryInput(formatted);
    } else if (salaryInput === '') {
        setSalaryInput('');
    }
  };

  const getSafeDateParts = (isoDateString: string) => {
    if (!isoDateString) return { day: '', month: '', year: '' };
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return { day: '', month: '', year: '' };
    return {
        day: date.getDate().toString(),
        month: (date.getMonth() + 1).toString(),
        year: (date.getFullYear() + 543).toString()
    };
  };

  const { day: selDay, month: selMonth, year: selYear } = getSafeDateParts(formData.startDate);

  const handleDatePartChange = (type: 'day' | 'month' | 'year', value: string) => {
    let d = parseInt(selDay || '1');
    let m = parseInt(selMonth || '1');
    let y = parseInt(selYear || currentYearBE.toString()); 

    if (type === 'day') d = parseInt(value);
    if (type === 'month') m = parseInt(value);
    if (type === 'year') y = parseInt(value);

    const yearAD = y - 543;
    const dateObj = new Date(yearAD, m - 1, d);
    const finalYear = dateObj.getFullYear();
    const finalMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const finalDay = dateObj.getDate().toString().padStart(2, '0');
    
    setFormData(prev => ({ ...prev, startDate: `${finalYear}-${finalMonth}-${finalDay}` }));
  };

  const validateBankUniqueness = async () => {
    if (!formData.bankAccountNumber || formData.bankAccountNumber === '---') return true;
    
    const existing = await fetchCollectionData('work_profiles');
    const duplicate = existing.find(p => p.bankAccountNumber === formData.bankAccountNumber && p.employeeId !== employeeId);
    
    if (duplicate) {
        setDuplicateBankWarning(`เลขบัญชีนี้ถูกใช้งานแล้วโดยพนักงานรหัส: ${duplicate.employeeId}`);
        return false;
    }
    return true;
  };

  const handleSave = async () => {
    setDuplicateBankWarning(null);
    if (!formData.startDate || !formData.employmentType || !formData.position) {
        alert("กรุณากรอกข้อมูล วันเริ่มงาน, ตำแหน่ง และ อัตราจ้าง ให้ครบถ้วน");
        return;
    }

    setLoading(true);
    try {
      const isUniqueBank = await validateBankUniqueness();
      if (!isUniqueBank) {
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        employeeId,
        updatedAt: new Date().toISOString()
      };
      await setDocumentWithId('work_profiles', employeeId, payload);
      onClose();
    } catch (err) {
      console.error("Save failed", err);
      alert("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const isDaily = formData.employmentType.includes("รายวัน");
  const salaryLabel = isDaily ? "ค่าแรง / ค่าตอบแทนต่อวัน" : "เงินเดือน / ค่าตอบแทนต่อเดือน";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col my-8 animate-fade-in-up transition-all">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-emerald-900">
                ข้อมูลการจ้างงาน (Work Profile)
              </h3>
              <p className="text-xs text-emerald-700">
                Employment Details for: <span className="font-semibold">{employeeName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full text-emerald-600 hover:text-emerald-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLocked ? (
             <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Lock className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">ข้อมูลถูกจำกัดการเข้าถึง</h3>
                <p className="text-slate-500 mb-8 text-center text-sm max-w-xs">
                    กรุณากรอกรหัสผ่านเพื่อเข้าถึงข้อมูลเงินเดือนและรายละเอียดการจ้างงาน
                </p>
                <form onSubmit={handleUnlock} className="w-full max-w-xs flex flex-col gap-4">
                    <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setLockError(false); }}
                        className={`w-full text-center text-3xl tracking-[0.5em] font-bold p-3 border rounded-xl outline-none transition-all placeholder-slate-200 ${
                            lockError 
                            ? 'border-red-400 bg-red-50 text-red-800 focus:ring-4 focus:ring-red-100' 
                            : 'border-slate-200 text-emerald-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                        }`}
                        placeholder="••••••" autoFocus maxLength={6} inputMode="numeric"
                    />
                    {lockError && <p className="text-red-500 text-xs font-semibold text-center animate-shake">รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่</p>}
                    <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2">ปลดล็อคข้อมูล</button>
                </form>
             </div>
        ) : (
            <>
                <div className="p-6 md:p-8 space-y-6 animate-fade-in">
                  {duplicateBankWarning && (
                    <div className="p-3 bg-rose-50 border-l-4 border-rose-500 rounded flex gap-3 text-rose-700 animate-fade-in-down">
                       <AlertTriangle className="w-5 h-5 shrink-0" />
                       <div className="text-xs font-bold leading-tight">
                          <p className="uppercase tracking-widest text-[9px] mb-1">ตรวจพบเลขบัญชีซ้ำ</p>
                          {duplicateBankWarning}
                       </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                            <UserCheck className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">รหัสพนักงาน</span>
                            <div className="text-lg font-mono font-bold text-slate-700">{employeeId}</div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> อายุการทำงาน
                        </span>
                        <div className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-bold rounded-lg border border-emerald-200">{tenure}</div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> 2. วันเริ่มงาน (Start Date)</label>
                        <div className="flex gap-2">
                          <select value={selDay || ''} onChange={(e) => handleDatePartChange('day', e.target.value)} className="flex-1 p-2 border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none bg-white appearance-none"><option value="" disabled>วัน</option>{dayOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                          <select value={selMonth || ''} onChange={(e) => handleDatePartChange('month', e.target.value)} className="flex-1 p-2 border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none bg-white appearance-none"><option value="" disabled>เดือน</option>{THAI_MONTHS.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}</select>
                          <select value={selYear || ''} onChange={(e) => handleDatePartChange('year', e.target.value)} className="flex-1 p-2 border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none bg-white appearance-none"><option value="" disabled>พ.ศ.</option>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        </div>
                     </div>
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" /> 3. ตำแหน่งหน้าที่รับผิดชอบ (Job Responsibilities)</label>
                        <input type="text" name="position" value={formData.position} onChange={handleInputChange} placeholder="เช่น ผู้จัดการฝ่ายผลิต, เจ้าหน้าที่ธุรการ..." className="w-full p-2 border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 bg-white" />
                     </div>
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /> 4. สังกัดแผนก (Department)</label>
                        <select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2 border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 bg-white"><option value="">-- เลือกแผนก --</option>{departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><UserCheck className="w-4 h-4 text-slate-400" /> 5. อัตราจ้างบัญชี</label>
                        <select name="employmentType" value={formData.employmentType} onChange={handleInputChange} className="w-full p-2 border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 bg-white"><option value="">-- เลือกประเภท --</option>{EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400" /> 6. สถานะภาพการทำงาน</label>
                        <select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} className={`w-full p-2 border rounded-lg focus:ring-2 outline-none font-medium ${formData.employmentStatus === 'ลาออกแล้ว' ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-200' : 'border-emerald-500 bg-white text-emerald-800 focus:ring-emerald-300'}`}>{EMPLOYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                     </div>
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Banknote className="w-4 h-4 text-slate-400" /> 7. {salaryLabel}</label>
                        <div className="relative">
                          <input type="text" name="salary" value={salaryInput} onChange={handleSalaryChange} onBlur={handleSalaryBlur} placeholder="0.00" inputMode="decimal" className="w-full p-3 pl-4 pr-12 text-right border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-300 bg-white font-mono text-lg font-bold text-emerald-700" />
                          <span className="absolute right-4 top-3.5 text-slate-400 font-bold">฿</span>
                        </div>
                     </div>
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-400" /> 8. เลขบัญชีธนาคาร (Bank Account No.)</label>
                        <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleBankAccountChange} placeholder="XXX-X-XXXXX-X" className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-300 bg-white font-mono tracking-wider ${duplicateBankWarning ? 'border-rose-400 ring-2 ring-rose-100' : 'border-emerald-500'}`} />
                     </div>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">ยกเลิก</button>
                  <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all disabled:opacity-70">
                    <Save className="w-4 h-4" /> {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
}