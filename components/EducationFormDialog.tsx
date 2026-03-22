import React, { useState, useEffect, useRef } from 'react';
import { X, GraduationCap, School, BookOpen, Calendar, Award, Image as ImageIcon, Upload, Camera, FileText } from 'lucide-react';
import { getSingleDocument, setDocumentWithId } from '../services/firebase';
import { EducationData } from '../types';

interface EducationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

const EDUCATION_LEVELS = [
  "ประถมศึกษา",
  "มัธยมศึกษา",
  "อุดมศึกษา (ปริญญาตรี/โท/เอก)",
  "ปวช.",
  "ปวส.",
  "กศน.",
  "อื่นๆ"
];

// Generate last 10 years + current year (Thai BE)
const currentYearBE = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => (currentYearBE - i).toString());

const INITIAL_DATA: EducationData = {
  employeeId: '',
  highestLevel: '',
  institution: '',
  facultyMajor: '',
  graduationYear: '',
  skills: '',
  certificateImage: ''
};

export const EducationFormDialog: React.FC<EducationFormDialogProps> = ({ isOpen, onClose, employeeId, employeeName }) => {
  const [formData, setFormData] = useState<EducationData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadData();
    }
    return () => stopCamera();
  }, [isOpen, employeeId]);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, isCameraOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const doc = await getSingleDocument('education', employeeId);
      if (doc) {
        setFormData(doc as unknown as EducationData);
      } else {
        setFormData({ ...INITIAL_DATA, employeeId });
      }
    } catch (err) {
      console.error("Failed to load education data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, certificateImage: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setVideoStream(stream);
    } catch (err) {
      console.error("Camera access denied", err);
      setIsCameraOpen(false);
      alert("ไม่สามารถเปิดกล้องได้");
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      setFormData(prev => ({ ...prev, certificateImage: dataUrl }));
      stopCamera();
    }
  };

  const handleSave = async () => {
    if (!formData.highestLevel) {
        alert("กรุณาระบุระดับการศึกษาสูงสุด");
        return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        employeeId,
        updatedAt: new Date().toISOString()
      };
      await setDocumentWithId('education', employeeId, payload);
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col my-8 animate-fade-in-up max-h-[90vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-amber-900">
                  ข้อมูลการศึกษาและทักษะ
                </h3>
                <p className="text-xs text-amber-700">
                  Education & Skills for: <span className="font-semibold">{employeeName}</span> ({employeeId})
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full text-amber-600 hover:text-amber-800 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 overflow-y-auto space-y-6">
            
            {/* Section 1: Education Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400" /> 
                    2. ระดับการศึกษาสูงสุด
                  </label>
                  <select 
                    name="highestLevel"
                    value={formData.highestLevel} 
                    onChange={handleInputChange}
                    className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white text-slate-700 outline-none"
                  >
                    <option value="">-- เลือกระดับการศึกษา --</option>
                    {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <School className="w-4 h-4 text-slate-400" /> 
                    3. ชื่อสถานศึกษา
                  </label>
                  <input 
                    type="text"
                    name="institution"
                    value={formData.institution} 
                    onChange={handleInputChange}
                    placeholder="เช่น มหาวิทยาลัย..."
                    className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white text-slate-700 outline-none placeholder-slate-400"
                  />
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" /> 
                    4. คณะ / เอกสาขาวิชา
                  </label>
                  <input 
                    type="text"
                    name="facultyMajor"
                    value={formData.facultyMajor} 
                    onChange={handleInputChange}
                    placeholder="เช่น บริหารธุรกิจ / การตลาด"
                    className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white text-slate-700 outline-none placeholder-slate-400"
                  />
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" /> 
                    5. จบปีการศึกษา (พ.ศ.)
                  </label>
                  <select 
                    name="graduationYear"
                    value={formData.graduationYear} 
                    onChange={handleInputChange}
                    className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white text-slate-700 outline-none"
                  >
                    <option value="">-- เลือกปีการศึกษา --</option>
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">ย้อนหลังไม่เกิน 10 ปี จากปัจจุบัน</p>
               </div>
            </div>

            <div className="border-t border-slate-100"></div>

            {/* Split Section: Skills (Left) and Image (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section 2: Skills */}
                <div className="flex flex-col">
                   <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                     <Award className="w-4 h-4 text-slate-400" /> 
                     6. ทักษะ / ประสบการณ์ (Skills)
                   </label>
                   <textarea 
                     name="skills"
                     value={formData.skills} 
                     onChange={handleInputChange}
                     placeholder="ระบุความสามารถพิเศษ, โปรแกรมที่ใช้ได้, หรือประสบการณ์ทำงาน..."
                     className="w-full p-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white text-slate-700 outline-none placeholder-slate-400 resize-none leading-relaxed flex-1 min-h-[220px]"
                   />
                </div>

                {/* Section 3: Certificate Image */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
                   <label className="block text-sm font-bold text-slate-700 mb-3 text-center flex items-center justify-center gap-2">
                     <FileText className="w-4 h-4" /> 7. สำเนาเอกสารวุฒิการศึกษา
                   </label>
                   
                   <div className="flex-1 bg-white border-2 border-dashed border-slate-300 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative group min-h-[160px]">
                     {formData.certificateImage ? (
                       <img src={formData.certificateImage} alt="Certificate" className="w-full h-full object-contain" />
                     ) : (
                       <div className="flex flex-col items-center gap-2 text-slate-400">
                         <ImageIcon className="w-8 h-8 opacity-50" />
                         <span className="text-xs">ยังไม่มีรูปภาพ</span>
                       </div>
                     )}
                   </div>

                   <div className="flex justify-center gap-3">
                      <button 
                        onClick={startCamera} 
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Camera className="w-4 h-4"/> ถ่ายรูป
                      </button>
                      <label className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-4 h-4"/> อัปโหลด
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                   </div>
                </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-lg shadow-amber-200 flex items-center gap-2 transition-all disabled:opacity-70">
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลการศึกษา'}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
           <div className="p-4 flex justify-between items-center text-white bg-black/50 absolute top-0 w-full z-10">
              <span className="font-bold">ถ่ายภาพเอกสาร</span>
              <button onClick={stopCamera}><X className="w-6 h-6"/></button>
           </div>
           <div className="flex-1 flex items-center justify-center bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full" />
           </div>
           <div className="p-8 flex justify-center bg-black">
              <button onClick={takePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-400"></button>
           </div>
        </div>
      )}
    </>
  );
};