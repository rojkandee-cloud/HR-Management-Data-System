
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, QrCode, User, Lock, Loader2, ScanLine, ShieldAlert, RefreshCcw, X, CheckCircle2, MapPin } from 'lucide-react';
import jsQR from 'jsqr';
import { fetchCollectionData } from '../services/firebase';
import { FirestoreDoc } from '../types';

interface LoginOverlayProps {
  onLoginSuccess: (employee: FirestoreDoc) => void;
}

type AuthStep = 'start' | 'qr-scan' | 'verifying' | 'success';

export const LoginOverlay: React.FC<LoginOverlayProps> = React.memo(({ onLoginSuccess }) => {
  const [step, setStep] = useState<AuthStep>('start');
  const stepRef = useRef<AuthStep>('start');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<FirestoreDoc | null>(null);

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetAllStates = useCallback(() => {
    stopCamera();
    setStep('start');
    setError(null);
    setLoading(false);
    setMatchedEmployee(null);
  }, [stopCamera]);

  useEffect(() => {
    resetAllStates();
    return () => stopCamera();
  }, [resetAllStates, stopCamera]);

  const startQrScan = async () => {
    stopCamera(); 
    setStep('qr-scan');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationRef.current = requestAnimationFrame(tickQr);
      }
    } catch (err) {
      setError("ไม่สามารถเข้าถึงกล้องหลังเพื่อสแกนรหัสได้");
      setStep('start');
    }
  };

  const tickQr = () => {
    if (stepRef.current !== 'qr-scan') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code && code.data) {
          stopCamera();
          handleVerifyId(code.data);
          return;
        }
      }
    }
    animationRef.current = requestAnimationFrame(tickQr);
  };

  const handleVerifyId = async (qrData: string) => {
    setLoading(true);
    setError(null);
    setStep('verifying');
    try {
      const employees = await fetchCollectionData('employees');
      const cleanInput = qrData.replace(/\D/g, '');
      const found = employees.find(e => (e.idCardNumber || '').replace(/\D/g, '') === cleanInput && cleanInput.length >= 4);
      
      if (found) {
        setMatchedEmployee(found);
        setStep('success');
        setTimeout(() => onLoginSuccess(found), 1200);
      } else {
        setError("ไม่พบข้อมูลพนักงานที่ตรงกับหมายเลขนี้ในระบบ");
        setStep('start');
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการตรวจสอบฐานข้อมูล");
      setStep('start');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
        <div className="w-full h-full" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-scale-in">
        <div className="p-8 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12"><ShieldCheck className="w-32 h-32" /></div>
           <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-5">
                 <div className="bg-white p-2 rounded-2xl shadow-2xl ring-4 ring-indigo-500/20 shrink-0">
                    <img src="https://img2.pic.in.th/logo_2637c29d-fedb-4854-850e-6a929393e100_250_250.th.jpg" alt="Company Logo" className="w-14 h-14 object-contain" />
                 </div>
                 <div className="overflow-hidden">
                    <h2 className="text-xl font-black tracking-tight leading-none uppercase">Identify and Verification Login</h2>
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-1.5">บริษัท เหล็กฟ้าใส จำกัด</p>
                 </div>
              </div>
              <div className="flex items-start gap-2 pl-1 opacity-70">
                 <MapPin className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                 <p className="text-[9px] font-bold text-slate-300 leading-tight uppercase tracking-wider">
                    8 หมู่ 10 ถ.ราชสีมา-โชคชัย ต.ด่านเกวียน<br/>
                    อ.โชคชัย จ.นครราชสีมา 30190
                 </p>
              </div>
           </div>
           <div className="flex flex-col items-end relative z-10 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mb-1"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Core v7.0</span>
           </div>
        </div>

        <div className="p-8 flex-1 flex flex-col items-center justify-center min-h-[440px]">
           {error && (
             <div className="w-full mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-xl flex items-start gap-3 animate-shake">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                   <p className="text-xs font-black text-rose-800 uppercase">Verification Failed</p>
                   <p className="text-xs font-bold text-rose-600/80 leading-relaxed mt-0.5 whitespace-pre-wrap">{error}</p>
                </div>
             </div>
           )}

           {step === 'start' && (
             <div className="text-center space-y-8 animate-fade-in w-full">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner border border-slate-100">
                   <QrCode className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">เข้าสู่ระบบยืนยันตัวตน</h3>
                   <p className="text-sm font-bold text-slate-400 mt-2">กรุณาสแกนรหัสพนักงานหรือบัตรเพื่อเข้าใช้งาน</p>
                </div>
                <button 
                   onClick={startQrScan}
                   className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                   <ScanLine className="w-6 h-6" /> เริ่มสแกนรหัส
                </button>
             </div>
           )}

           {step === 'qr-scan' && (
             <div className="w-full text-center space-y-6 animate-fade-in flex flex-col items-center">
                <div className="relative aspect-square w-full max-w-[320px] rounded-[40px] border-8 border-slate-900 overflow-hidden bg-black shadow-2xl group">
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                   <canvas ref={canvasRef} className="hidden" />
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 border-2 border-indigo-500/40 rounded-3xl relative">
                         <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                         <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                         <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                         <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
                         <div className="absolute inset-x-0 h-1 bg-red-500/80 animate-scan-y shadow-[0_0_15px_rgba(239,68,68,0.8)] z-10"></div>
                      </div>
                   </div>
                </div>
                <button onClick={resetAllStates} className="text-xs font-black text-rose-500 uppercase py-2 px-4 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">ยกเลิกสแกน</button>
             </div>
           )}

           {step === 'verifying' && (
             <div className="text-center space-y-6 py-10 animate-fade-in">
                <div className="relative">
                   <div className="w-32 h-32 border-4 border-indigo-100 rounded-full mx-auto"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                   </div>
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">กำลังตรวจสอบข้อมูล</h3>
                   <p className="text-sm font-bold text-slate-400 mt-2">เชื่อมต่อฐานข้อมูลความปลอดภัยส่วนกลาง...</p>
                </div>
             </div>
           )}

           {step === 'success' && matchedEmployee && (
             <div className="text-center space-y-6 py-10 animate-scale-in">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-50 border-4 border-white">
                   <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-4">ยืนยันตัวตนสำเร็จ</h3>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 text-left max-w-[280px] mx-auto shadow-inner">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                         {matchedEmployee.employeeImage ? <img src={matchedEmployee.employeeImage} className="w-full h-full object-cover" /> : <User className="w-6 h-6 m-3 text-slate-200" />}
                      </div>
                      <div className="overflow-hidden">
                         <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Welcome back</p>
                         <h4 className="text-sm font-black text-slate-800 truncate uppercase">{matchedEmployee.fullName}</h4>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">FIREVIEW SECURITY FRAMEWORK v7.0</p>
        </div>
      </div>
      <style>{`
        @keyframes scan-y {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan-y {
          animation: scan-y 2.5s infinite linear;
        }
      `}</style>
    </div>
  );
});
