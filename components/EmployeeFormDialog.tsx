import React, { useState, useEffect, useRef } from 'react';
import { X, User, Camera, Calendar, CreditCard, Image as ImageIcon, Edit, Upload, RefreshCcw, Smartphone, Tablet, Mars, Venus, Sparkles, Trash2, CheckCircle, XCircle, Building2, Save, Hash, QrCode, Loader2, Phone, ShieldCheck, Zap, AlertTriangle, UserCheck, Smile, Activity } from 'lucide-react';
import QRCode from 'qrcode';
import { fetchCollectionData } from '../services/firebase';
import { DepartmentData } from '../types';
import { checkDocumentQuality, verifyIdentityMatch, checkFaceUniqueness } from '../services/geminiService';

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
  initialData?: any;
}

const EMPLOYMENT_STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ทดลองงาน",
  "พักงาน",
  "ลาออกแล้ว"
];

const INITIAL_FORM_DATA = {
  employeeId: '',
  gender: 'ชาย',
  title: 'นาย',
  fullName: '',
  nickname: '',
  birthDate: '',
  idCardNumber: '',
  department: '',
  phoneNumber: '',
  employmentStatus: 'ยังทำงานอยู่'
};

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const FLAG_HAS_IMAGE = "มีรูปภาพ";
const FLAG_NO_IMAGE = "ไม่มีรูปภาพ/ถ่ายใหม่";

export const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [employeeImage, setEmployeeImage] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [flagImageA, setFlagImageA] = useState<string>(FLAG_NO_IMAGE);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // AI Verification State
  const [aiVerifying, setAiVerifying] = useState<'id' | 'face' | 'uniqueness' | null>(null);
  const [idQuality, setIdQuality] = useState<{status: 'Pass' | 'Fail' | null, msg: string}>({status: null, msg: ''});
  const [faceMatch, setFaceMatch] = useState<{status: boolean | null, score: number, reasoning: string}>({status: null, score: 0, reasoning: ''});
  const [faceUniqueness, setFaceUniqueness] = useState<{status: boolean | null, reasoning: string}>({status: null, reasoning: ''});

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeCameraField, setActiveCameraField] = useState<'idCard' | 'employee' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isEditMode = !!initialData;
  const currentYearBE = new Date().getFullYear() + 543;
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYearBE - i); 
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      if (initialData) {
        setFormData({
          employeeId: initialData.employeeId || '',
          gender: initialData.gender || 'ชาย',
          title: initialData.title || 'นาย',
          fullName: initialData.fullName || '',
          nickname: initialData.nickname || '',
          birthDate: initialData.birthDateISO || '', 
          idCardNumber: initialData.idCardNumber || '',
          department: initialData.department || '',
          phoneNumber: initialData.phoneNumber || '',
          employmentStatus: initialData.employmentStatus || 'ยังทำงานอยู่',
        });
        setIdCardImage(initialData.idCardImage || null);
        setEmployeeImage(initialData.employeeImage || null);
        setFlagImageA(initialData.FlagImage_A || (initialData.employeeImage ? FLAG_HAS_IMAGE : FLAG_NO_IMAGE));
      } else {
        setFormData(INITIAL_FORM_DATA);
        setIdCardImage(null);
        setEmployeeImage(null);
        setFlagImageA(FLAG_NO_IMAGE);
        setIdQuality({status: null, msg: ''});
        setFaceMatch({status: null, score: 0, reasoning: ''});
        setFaceUniqueness({status: null, reasoning: ''});
      }
      setError(null);
      setDuplicateWarning(null);
      setIsSaving(false);
      const isMobile = /android|iPad|iPhone|iPod/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
    }
  }, [isOpen, initialData]);

  const loadDepartments = async () => {
    try {
      const docs = await fetchCollectionData('departments');
      if (docs && docs.length > 0) {
        setDepartmentOptions(docs.map(d => (d as unknown as DepartmentData).name).sort());
      }
    } catch (e) { console.warn(e); }
  };

  const handleAiVerifyId = async () => {
    if (!idCardImage) return;
    setAiVerifying('id');
    try {
      const result = await checkDocumentQuality(idCardImage, 'บัตรประชาชน');
      setIdQuality({
        status: result.quality,
        msg: result.quality === 'Pass' ? 'รูปถ่ายมีคุณภาพดี พร้อมใช้งาน' : result.suggestions.join(', ')
      });
    } catch (e) {
      setIdQuality({status: 'Fail', msg: 'AI ไม่สามารถประมวลผลได้'});
    } finally {
      setAiVerifying(null);
    }
  };

  const handleAiFaceMatch = async () => {
    if (!idCardImage || !employeeImage) {
      alert("กรุณาถ่ายรูปบัตรประชาชนและรูปพนักงานก่อนตรวจสอบ");
      return;
    }
    setAiVerifying('face');
    try {
      const result = await verifyIdentityMatch(employeeImage, idCardImage);
      setFaceMatch({
        status: result.match,
        score: result.confidence,
        reasoning: result.reasoning
      });
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการตรวจสอบใบหน้า");
    } finally {
      setAiVerifying(null);
    }
  };

  const handleCheckFaceUniqueness = async () => {
    if (!employeeImage) {
        alert("กรุณาถ่ายรูปพนักงานก่อนตรวจสอบความซ้ำซ้อน");
        return;
    }
    setAiVerifying('uniqueness');
    try {
      const allEmployees = await fetchCollectionData('employees');
      // Exclude self if editing
      const others = allEmployees
        .filter(emp => emp.employeeId !== formData.employeeId && emp.employeeImage)
        .map(emp => ({ id: emp.employeeId, name: emp.fullName, image: emp.employeeImage }));
      
      if (others.length === 0) {
        setFaceUniqueness({ status: true, reasoning: "ไม่พบข้อมูลพนักงานอื่นในระบบเพื่อเปรียบเทียบ (เป็นพนักงานคนแรก)" });
        return;
      }

      const result = await checkFaceUniqueness(employeeImage, others);
      setFaceUniqueness({
        status: !result.isDuplicate,
        reasoning: result.isDuplicate 
          ? `พบบุคคลหน้าเหมือนในระบบ: ${result.matchName} (ID: ${result.matchId}). ${result.reasoning}`
          : `ผ่านการตรวจสอบ: ไม่พบบุคคลหน้าซ้ำในระบบ. ${result.reasoning}`
      });
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการตรวจสอบความซ้ำซ้อนของใบหน้า");
    } finally {
      setAiVerifying(null);
    }
  };

  const initCameraStream = async (mode: 'user' | 'environment') => {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      setCurrentFacingMode(mode);
    } catch (err) {
      setIsCameraOpen(false);
      setError("ไม่สามารถเข้าถึงกล้องได้");
    }
  };

  const startCamera = async (field: 'idCard' | 'employee') => {
    setActiveCameraField(field);
    setIsCameraOpen(true);
    await initCameraStream((field === 'idCard' && isMobileDevice) ? 'environment' : 'user');
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && activeCameraField) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = activeCameraField === 'employee' ? 600 : 1000;
      canvas.width = size;
      canvas.height = activeCameraField === 'employee' ? size : Math.floor(size * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (currentFacingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        if (activeCameraField === 'employee') {
          const sourceSize = Math.min(video.videoWidth, video.videoHeight);
          ctx.drawImage(video, (video.videoWidth - sourceSize) / 2, (video.videoHeight - sourceSize) / 2, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
        } else { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (activeCameraField === 'idCard') { setIdCardImage(dataUrl); setIdQuality({status: null, msg: ''}); }
        else { setEmployeeImage(dataUrl); setFlagImageA(FLAG_HAS_IMAGE); setFaceMatch({status: null, score: 0, reasoning: ''}); setFaceUniqueness({status: null, reasoning: ''}); }
      }
      stopCamera();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setter(event.target?.result as string);
        if (setter === setEmployeeImage) {
            setFlagImageA(FLAG_HAS_IMAGE);
            setFaceUniqueness({status: null, reasoning: ''});
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDatePartChange = (type: 'day' | 'month' | 'year', value: string) => {
    const current = formData.birthDate ? new Date(formData.birthDate) : new Date(currentYearBE - 543 - 25, 0, 1);
    let d = current.getDate(), m = current.getMonth() + 1, y = current.getFullYear() + 543;
    if (type === 'day') d = parseInt(value);
    if (type === 'month') m = parseInt(value);
    if (type === 'year') y = parseInt(value);
    const dateObj = new Date(y - 543, m - 1, d);
    setFormData(prev => ({ ...prev, birthDate: `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}` }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'idCardNumber') {
      const raw = value.replace(/\D/g, '').slice(0, 13);
      let formatted = raw.length > 0 ? raw.slice(0, 1) + (raw.length > 1 ? '-' + raw.slice(1, 5) : '') + (raw.length > 5 ? '-' + raw.slice(5, 10) : '') + (raw.length > 10 ? '-' + raw.slice(10, 12) : '') + (raw.length > 12 ? '-' + raw.slice(12, 13) : '') : '';
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'phoneNumber') {
      const raw = value.replace(/\D/g, '').slice(0, 10);
      let formatted = raw.length > 0 ? raw.slice(0, 3) + (raw.length > 3 ? '-' + raw.slice(3, 6) : '') + (raw.length > 6 ? '-' + raw.slice(6, 10) : '') : '';
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateUniqueness = async () => {
    setDuplicateWarning(null);
    const existing = await fetchCollectionData('employees');
    
    // 1. Check Employee ID
    const idDup = existing.find(e => e.employeeId === formData.employeeId && e.id !== initialData?.id);
    if (idDup) {
      setDuplicateWarning(`รหัสพนักงาน "${formData.employeeId}" ถูกใช้งานแล้วโดย ${idDup.fullName}`);
      return false;
    }

    // 2. Check ID Card Number
    const rawCard = formData.idCardNumber.replace(/\D/g, '');
    const cardDup = existing.find(e => (e.idCardNumber || '').replace(/\D/g, '') === rawCard && e.id !== initialData?.id);
    if (cardDup) {
      setDuplicateWarning(`เลขบัตรประชาชนนี้ถูกลงทะเบียนไว้แล้วในชื่อ ${cardDup.fullName} (ID: ${cardDup.employeeId})`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setDuplicateWarning(null);
    
    const cardClean = formData.idCardNumber.replace(/\D/g, '');
    if (cardClean.length !== 13) return setError("เลขบัตรประชาชนไม่ครบ 13 หลัก");
    if (formData.employeeId.length !== 4) return setError("รหัสพนักงานต้องมี 4 หลัก");

    setIsSaving(true);
    try {
      // Perform Uniqueness Validations
      const isUnique = await validateUniqueness();
      if (!isUnique) {
        setIsSaving(false);
        return;
      }

      // Final Face Uniqueness Check recommendation if not done
      if (faceUniqueness.status === null && employeeImage && !isEditMode) {
        const confirmAi = window.confirm("คุณยังไม่ได้ตรวจสอบความซ้ำซ้อนของใบหน้าด้วย AI ต้องการดำเนินการก่อนบันทึกหรือไม่? (เพื่อความปลอดภัยสูงสุด)");
        if (confirmAi) {
            setIsSaving(false);
            handleCheckFaceUniqueness();
            return;
        }
      }

      if (faceUniqueness.status === false && !isEditMode) {
        setError("ไม่สามารถบันทึกได้: พบบุคคลหน้าซ้ำในระบบ โปรดตรวจสอบความถูกต้อง");
        setIsSaving(false);
        return;
      }

      const qrCodeData = await QRCode.toDataURL(cardClean, { margin: 1, width: 200 });
      const payload = { ...formData, birthDateISO: formData.birthDate, idCardImage, employeeImage, FlagImage_A: flagImageA, qrCode: qrCodeData, updatedAt: new Date().toISOString(), aiVerified: faceMatch.status, faceUniquenessStatus: faceUniqueness.status };
      await onSave(formData.employeeId, payload);
      onClose();
    } catch (err: any) { 
        setError("บันทึกไม่สำเร็จ: " + err.message); 
    }
    finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  const getBirthDateParts = (isoDate: string) => {
    if (!isoDate) return { day: '', month: '', year: '' };
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return { day: '', month: '', year: '' };
    return { day: d.getDate().toString(), month: (d.getMonth() + 1).toString(), year: (d.getFullYear() + 543).toString() };
  };

  const { day: selDay, month: selMonth, year: selYear } = getBirthDateParts(formData.birthDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-orange-50/80 backdrop-blur-xl rounded-none md:rounded-3xl shadow-2xl w-full max-w-5xl h-full md:h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-white/40">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-orange-100/50 bg-white/40 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-600 text-white rounded-xl shadow-lg">
              {isEditMode ? <Edit className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-black text-xl text-orange-900 leading-tight">{isEditMode ? 'แก้ไขข้อมูลพนักงาน' : 'ลงทะเบียนพนักงานใหม่'}</h3>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Enhanced Identity & Document Processing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-transparent space-y-10">
          {error && <div className="p-4 bg-red-50/80 backdrop-blur-md border-l-4 border-red-500 text-red-700 rounded-lg flex items-center gap-3"><XCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-bold">{error}</span></div>}
          {duplicateWarning && <div className="p-4 bg-amber-50/80 backdrop-blur-md border-l-4 border-amber-500 text-amber-800 rounded-lg flex items-center gap-3 shadow-md"><AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" /><div className="flex flex-col"><span className="text-xs font-black uppercase tracking-widest text-amber-600">พบบัญชีซ้ำในระบบ</span><span className="text-sm font-bold">{duplicateWarning}</span></div></div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Section 1: ID & Basic */}
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-orange-100/50 pb-3">
                  <div className="flex items-center gap-2"><Hash className="w-5 h-5 text-orange-500" /><h4 className="font-bold text-slate-800">1. ข้อมูลประจำตัวและสังกัด</h4></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">รหัสพนักงาน (4 หลัก)</label>
                    <input type="text" name="employeeId" value={formData.employeeId} onChange={handleInputChange} maxLength={4} disabled={isEditMode} className={`w-full p-3 border rounded-xl focus:ring-4 focus:ring-orange-100 font-mono text-lg font-black transition-all ${isEditMode ? 'bg-slate-100 text-slate-500' : 'bg-white border-orange-200'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">สถานะภาพการทำงาน</label>
                    <select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-bold bg-white appearance-none">
                      {EMPLOYMENT_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">คำนำหน้า และชื่อ-นามสกุล</label>
                    <div className="flex gap-2">
                      <select name="title" value={formData.title} onChange={handleInputChange} className="w-24 p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-bold bg-white">
                        <option value="นาย">นาย</option><option value="นาง">นาง</option><option value="น.ส.">น.ส.</option>
                      </select>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="flex-1 p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-bold" placeholder="ชื่อ-นามสกุล (ตามบัตรประชาชน)" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">ชื่อเล่น (Nickname)</label>
                    <div className="relative">
                      <Smile className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                      <input type="text" name="nickname" value={formData.nickname} onChange={handleInputChange} className="w-full pl-10 pr-4 p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-bold" placeholder="ระบุชื่อเล่น" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">แผนก (Section/Dept)</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                      <select name="department" value={formData.department} onChange={handleInputChange} className="w-full pl-10 pr-10 p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-bold bg-white appearance-none">
                        <option value="">-- เลือกแผนก --</option>
                        {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Verification */}
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-orange-100/50 pb-3">
                  <div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-orange-500" /><h4 className="font-bold text-slate-800">2. ข้อมูลเพื่อการตรวจสอบตัวตน</h4></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">เลขบัตรประชาชน (13 หลัก)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                      <input type="text" name="idCardNumber" value={formData.idCardNumber} onChange={handleInputChange} className="w-full pl-10 pr-4 p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-mono text-lg font-bold tracking-widest" placeholder="X-XXXX-XXXXX-XX-X" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">เบอร์โทรศัพท์ติดต่อ</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                      <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full pl-10 pr-4 p-3 border border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-100 font-mono text-lg font-bold" placeholder="0XX-XXX-XXXX" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-wider">วันเกิด (Date of Birth)</label>
                    <div className="flex gap-2">
                      <select value={selDay} onChange={(e) => handleDatePartChange('day', e.target.value)} className="flex-1 p-3 border border-orange-200 rounded-xl font-bold bg-white"><option value="" disabled>วัน</option>{dayOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                      <select value={selMonth} onChange={(e) => handleDatePartChange('month', e.target.value)} className="flex-1 p-3 border border-orange-200 rounded-xl font-bold bg-white"><option value="" disabled>เดือน</option>{THAI_MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}</select>
                      <select value={selYear} onChange={(e) => handleDatePartChange('year', e.target.value)} className="flex-1 p-3 border border-orange-200 rounded-xl font-bold bg-white"><option value="" disabled>พ.ศ.</option>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar: Media & AI */}
            <div className="space-y-6">
               {/* Portrait Capture */}
               <div className="bg-white/60 p-5 rounded-3xl border border-white/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                     <h5 className="text-[11px] font-black text-orange-400 uppercase tracking-widest">รูปถ่ายพนักงาน</h5>
                     <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${flagImageA === FLAG_HAS_IMAGE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{flagImageA}</span>
                  </div>
                  <div className="aspect-square bg-white border-2 border-dashed border-orange-200 rounded-2xl overflow-hidden relative group">
                    {employeeImage ? <img src={employeeImage} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-200 gap-2"><ImageIcon className="w-12 h-12 opacity-30" /><p className="text-[10px] font-bold">ยังไม่มีรูปถ่าย</p></div>}
                    <div className="absolute inset-0 bg-orange-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                       <button onClick={() => startCamera('employee')} className="p-3 bg-white text-orange-600 rounded-full shadow-xl active:scale-90 transition-transform"><Camera className="w-6 h-6" /></button>
                       <label className="px-4 py-1.5 bg-white/20 hover:bg-white/40 text-white text-[10px] font-black uppercase tracking-widest rounded-lg cursor-pointer border border-white/30 backdrop-blur-md">อัปโหลดภาพ<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setEmployeeImage)} /></label>
                    </div>
                  </div>
                  {employeeImage && (
                    <div className="space-y-2">
                        <button onClick={handleCheckFaceUniqueness} disabled={!!aiVerifying} className="w-full py-2.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-purple-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                           {aiVerifying === 'uniqueness' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                           ตรวจสอบความซ้ำซ้อนใบหน้า (AI)
                        </button>
                        {faceUniqueness.status !== null && (
                            <div className={`p-3 rounded-xl border flex gap-3 ${faceUniqueness.status ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                {faceUniqueness.status ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                                <div><p className="text-[11px] font-black uppercase">{faceUniqueness.status ? 'Uniqueness Pass' : 'Duplicate Detected'}</p><p className="text-[10px] font-bold leading-tight opacity-70">{faceUniqueness.reasoning}</p></div>
                            </div>
                        )}
                        <button onClick={() => { setEmployeeImage(null); setFaceUniqueness({status: null, reasoning: ''}); }} className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-3.5 h-3.5" /> ลบรูปภาพ</button>
                    </div>
                  )}
               </div>

               {/* ID Card Capture */}
               <div className="bg-white/60 p-5 rounded-3xl border border-white/60 shadow-sm space-y-4">
                  <h5 className="text-[11px] font-black text-orange-400 uppercase tracking-widest">รูปถ่ายบัตรประชาชน</h5>
                  <div className="aspect-[1.58/1] bg-white border-2 border-dashed border-orange-200 rounded-2xl overflow-hidden relative group">
                    {idCardImage ? <img src={idCardImage} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-200 gap-2"><CreditCard className="w-12 h-12 opacity-30" /><p className="text-[10px] font-bold">รอการสแกนบัตร</p></div>}
                    <div className="absolute inset-0 bg-orange-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                       <button onClick={() => startCamera('idCard')} className="p-3 bg-white text-orange-600 rounded-full shadow-xl active:scale-90 transition-transform"><Camera className="w-6 h-6" /></button>
                       <label className="px-4 py-1.5 bg-white/20 hover:bg-white/40 text-white text-[10px] font-black uppercase tracking-widest rounded-lg cursor-pointer border border-white/30 backdrop-blur-md">อัปโหลดภาพ<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setIdCardImage)} /></label>
                    </div>
                  </div>
                  {idCardImage && (
                    <div className="space-y-3">
                       <button onClick={handleAiVerifyId} disabled={!!aiVerifying} className="w-full py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                         {aiVerifying === 'id' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                         ตรวจสอบความชัดเจน (AI)
                       </button>
                       {idQuality.status && (
                         <div className={`p-3 rounded-xl border flex gap-3 ${idQuality.status === 'Pass' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                            {idQuality.status === 'Pass' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                            <div><p className="text-[11px] font-black uppercase">{idQuality.status === 'Pass' ? 'Verify Passed' : 'Verify Failed'}</p><p className="text-[10px] font-bold leading-tight opacity-70">{idQuality.msg}</p></div>
                         </div>
                       )}
                    </div>
                  )}
               </div>

               {/* Face Matching AI */}
               {idCardImage && employeeImage && (
                 <div className="bg-indigo-900 p-6 rounded-[32px] shadow-2xl text-white space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-5 opacity-10"><Zap className="w-20 h-20" /></div>
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Sparkles className="w-5 h-5 text-yellow-300" /></div>
                       <h5 className="font-black text-sm uppercase tracking-widest">Face Matching AI</h5>
                    </div>
                    <button onClick={handleAiFaceMatch} disabled={!!aiVerifying} className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                       {aiVerifying === 'face' ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                       เริ่มตรวจสอบใบหน้า
                    </button>
                    {faceMatch.status !== null && (
                      <div className={`p-4 rounded-2xl border-2 animate-scale-in ${faceMatch.status ? 'bg-emerald-500/20 border-emerald-400' : 'bg-rose-500/20 border-rose-400'}`}>
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase opacity-60">Match Score</span>
                            <span className="text-2xl font-black">{faceMatch.score}%</span>
                         </div>
                         <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div className={`h-full transition-all duration-1000 ${faceMatch.status ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${faceMatch.score}%` }}></div>
                         </div>
                         <p className="text-[11px] font-bold leading-relaxed">{faceMatch.reasoning}</p>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-orange-100 bg-white/80 sticky bottom-0 z-20 flex justify-between items-center">
           <div className="hidden md:flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg"><QrCode className="w-5 h-5 text-slate-400" /></div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-tight">Digital QR Code และข้อมูลเข้ารหัส<br/>จะถูกสร้างอัตโนมัติเมื่อกดบันทึก</p>
                <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ข้อมูลทั้งหมดถูกตรวจสอบความซ้ำซ้อนแล้ว</p>
              </div>
           </div>
           <div className="flex gap-4 w-full md:w-auto">
              <button onClick={onClose} className="flex-1 md:flex-none px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">ยกเลิก</button>
              <button onClick={handleSubmit} disabled={isSaving || !!aiVerifying} className="flex-1 md:flex-none px-16 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-orange-200 hover:bg-orange-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
                 {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 บันทึกข้อมูลพนักงาน
              </button>
           </div>
        </div>

        {/* Floating Camera Overlay */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
             <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center"><Camera className="w-6 h-6" /></div>
                  <div className="text-white">
                    <h4 className="font-black text-sm uppercase tracking-widest">Digital Scanner</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Capturing for {activeCameraField === 'employee' ? 'Portrait' : 'ID Document'}</p>
                  </div>
                </div>
                <button onClick={stopCamera} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"><X className="w-8 h-8" /></button>
             </div>
             <div className="flex-1 flex items-center justify-center bg-slate-950 relative">
                <video ref={videoRef} autoPlay playsInline muted className={`max-w-full max-h-full ${currentFacingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                {activeCameraField === 'idCard' && (
                  <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
                     <div className="w-full max-w-xl aspect-[1.58/1] border-2 border-white/50 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] relative">
                        <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-orange-500/50 animate-scan-y shadow-[0_0_15px_rgba(249,115,22,0.8)]"></div></div>
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">วางบัตรให้อยู่ในกรอบเพื่อความคมชัด</div>
                     </div>
                  </div>
                )}
                {activeCameraField === 'employee' && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-72 h-72 border-2 border-white/30 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"></div>
                   </div>
                )}
             </div>
             <div className="p-12 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6">
                <div className="flex items-center gap-8">
                   <button onClick={() => initCameraStream(currentFacingMode === 'user' ? 'environment' : 'user')} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-90 backdrop-blur-md"><RefreshCcw className="w-7 h-7" /></button>
                   <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-8 border-orange-600 shadow-[0_0_30px_rgba(249,115,22,0.4)] active:scale-90 transition-transform"></button>
                   <div className="w-[60px]"></div>
                </div>
                <div className="flex gap-3">
                   <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${currentFacingMode === 'user' ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/20'}`}><Smartphone className="inline w-3 h-3 mr-2" /> User Cam</div>
                   <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${currentFacingMode === 'environment' ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/20'}`}><Tablet className="inline w-3 h-3 mr-2" /> Environment</div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};