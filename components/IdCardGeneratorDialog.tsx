
import React, { useState, useMemo, useEffect } from 'react';
import { X, CreditCard, Printer, Check, Search, User, Building2, QrCode, FileCheck, Save, FileDown, ImageIcon, Loader2, Download, FileType, Filter, Activity, Info, Maximize2, Minimize2 } from 'lucide-react';
import { FirestoreDoc } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface IdCardGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: FirestoreDoc[];
  departments: string[];
  initialSelectedIds?: string[];
}

/**
 * มาตรฐาน CR80 (54mm x 86mm) 
 */
const CARD_WIDTH_PX = 204; 
const CARD_HEIGHT_PX = 325;
const CARD_WIDTH_MM = 54;
const CARD_HEIGHT_MM = 86;

const STATUS_OPTIONS = [
  "ยังทำงานอยู่",
  "ทดลองงาน",
  "พักงาน",
  "ลาออกแล้ว"
];

export const IdCardGeneratorDialog: React.FC<IdCardGeneratorDialogProps> = ({ 
  isOpen, 
  onClose, 
  employees, 
  departments,
  initialSelectedIds = []
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); 
  const [isExporting, setIsExporting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync selected IDs when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
    }
  }, [isOpen, initialSelectedIds]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.employeeId?.includes(searchTerm);
      
      const matchesDept = selectedDept === '' || emp.department === selectedDept;
      const matchesStatus = selectedStatus === '' || emp.employmentStatus === selectedStatus;
      
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, selectedDept, selectedStatus]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedIds([]);
    } else {
      const newIds = filteredEmployees.map(emp => emp.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...newIds])));
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 500);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const saveCardToLocal = async (empId: string, empName: string, firestoreId: string) => {
    const cardElement = document.getElementById(`card-render-${firestoreId}`);
    if (!cardElement) return;

    setProcessingId(firestoreId);
    try {
      const cardContainer = cardElement.querySelector('.id-card-container') as HTMLElement;
      if (!cardContainer) throw new Error("Card container not found");

      // Use a more stable rendering approach
      const canvas = await html2canvas(cardContainer, {
        useCORS: true,
        scale: 3, 
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        imageTimeout: 15000
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [CARD_WIDTH_MM, CARD_HEIGHT_MM]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');

      const fileName = `ID_CARD_${empId}_${empName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองอีกครั้ง");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/70 backdrop-blur-md overflow-hidden text-left text-slate-900">
      <div className={`bg-white shadow-2xl flex flex-col transition-all duration-300 border border-slate-200 ${
        isFullscreen 
          ? 'fixed inset-0 w-full h-full rounded-none z-[60]' 
          : 'rounded-2xl w-full max-w-6xl h-[92vh]'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 ${isFullscreen ? 'rounded-none' : 'rounded-t-2xl'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800">ระบบสร้างบัตรพนักงานมาตรฐาน (ID Card Center)</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">CR80 • 54x86mm • Lossless PDF Export</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen} 
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 transition-all shadow-sm"
              title={isFullscreen ? "ลดขนาดหน้าจอ" : "ขยายเต็มหน้าจอ"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-80 border-r border-slate-100 flex flex-col bg-white no-print">
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ค้นหาพนักงาน</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อหรือรหัส..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">กรองรายแผนก</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none appearance-none cursor-pointer font-bold text-slate-700"
                  >
                    <option value="">ทุกแผนก</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">สถานะภาพการทำงาน</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <select 
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm focus:ring-2 outline-none appearance-none cursor-pointer font-bold transition-all ${
                      selectedStatus ? 'bg-rose-50 border-rose-200 text-rose-700 focus:ring-rose-100' : 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-indigo-100'
                    }`}
                  >
                    <option value="">ทุกสถานะ (All Status)</option>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSelectAll}
                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl border border-indigo-100 transition-all shadow-sm active:scale-95"
              >
                {selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมดที่กรองไว้'}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-left border-t bg-slate-50/50">
              {filteredEmployees.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic opacity-60">ไม่พบข้อมูลพนักงานที่ตรงเงื่อนไข</p>
                </div>
              ) : (
                filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => toggleSelect(emp.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all border ${
                      selectedIds.includes(emp.id) 
                        ? 'bg-white border-indigo-600 shadow-md ring-1 ring-indigo-600/10' 
                        : 'border-transparent hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      selectedIds.includes(emp.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                    }`}>
                      {selectedIds.includes(emp.id) && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0 shadow-inner">
                      {emp.employeeImage ? (
                        <img src={emp.employeeImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-2 text-slate-300" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-slate-800 truncate">{emp.fullName}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{emp.department || 'No Dept'}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                        <span className={`text-[8px] font-black uppercase ${emp.employmentStatus === 'ลาออกแล้ว' ? 'text-rose-500' : 'text-emerald-500'}`}>{emp.employmentStatus}</span>
                      </div>
                      <div className="text-[10px] font-mono text-indigo-500 font-black tracking-widest">{emp.employeeId}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Content: ID Cards Preview */}
          <div className="flex-1 bg-slate-200 p-8 overflow-y-auto flex flex-col items-center custom-scrollbar">
            {selectedIds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileCheck className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-black text-center text-lg uppercase tracking-widest">เลือกพนักงานที่ต้องการสร้างบัตร<br/><span className="text-sm font-bold opacity-60">ระบบจะแสดงผลและอนุญาตให้บันทึกเป็น PDF มาตรฐาน</span></p>
              </div>
            ) : (
              <div id="id-card-print-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 justify-items-center print:block print:bg-white text-left">
                {selectedIds.map(id => {
                  const emp = employees.find(e => e.id === id);
                  if (!emp) return null;
                  const isProcessing = processingId === emp.id;
                  return (
                    <div key={id} className="flex flex-col items-center gap-4 animate-scale-in">
                      <div id={`card-render-${emp.id}`} className="capture-wrapper shadow-2xl rounded-[10px]">
                        <ProfessionalIdCard data={emp} />
                      </div>
                      <button 
                        onClick={() => saveCardToLocal(emp.employeeId, emp.fullName, emp.id)}
                        disabled={!!processingId}
                        className="no-print flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl active:scale-95 disabled:bg-slate-400 disabled:text-white border border-white/50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileType className="w-4 h-4 text-rose-500" />
                        )}
                        {isProcessing ? 'กำลังสร้างไฟล์...' : 'บันทึก PDF (54x86 mm)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center px-8 no-print gap-4">
          <div className="flex items-center gap-6">
             <div className="text-sm font-black text-slate-400 uppercase tracking-widest">
                คัดเลือกแล้ว <span className="text-indigo-600 text-2xl mx-1">{selectedIds.length}</span> ใบ
             </div>
             <div className="h-6 w-px bg-slate-100"></div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <Info className="w-4 h-4" /> 
                รองรับการพิมพ์ลงบนบัตรพลาสติก PVC มาตรฐาน CR80
             </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-8 py-3 text-xs font-black text-slate-500 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest">ปิดหน้าต่าง</button>
            <button 
              disabled={selectedIds.length === 0 || isExporting}
              onClick={handleExportPDF}
              className="flex-1 md:flex-none px-12 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
              พิมพ์ทันที (A4 Layout)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* 
  INTERNAL COMPONENT: Professional ID Card 
*/
const ProfessionalIdCard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="id-card-container relative bg-white rounded-[10px] overflow-hidden print:shadow-none print:m-4 border border-slate-200 shadow-lg"
      style={{
        width: `${CARD_WIDTH_PX}px`,
        height: `${CARD_HEIGHT_PX}px`,
        minWidth: `${CARD_WIDTH_PX}px`,
        minHeight: `${CARD_HEIGHT_PX}px`,
        fontFamily: '"Inter", "Sarabun", sans-serif',
        pageBreakInside: 'avoid',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: 'white'
      }}
    >
      {/* Header Section (Navy) */}
      <div className="absolute top-0 left-0 w-full h-[140px] bg-[#0a1128] flex flex-col items-center z-0">
        {/* Hole Punch Slot */}
        <div className="absolute top-3 w-12 h-2.5 bg-white rounded-full opacity-100"></div>
        
        {/* Company Logo & Name */}
        <div className="mt-12 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
              <Building2 className="w-3 h-3 text-[#0a1128]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-wider uppercase">Fireview Corporation</span>
          </div>
          <div className="text-[5.5px] text-blue-200/80 font-bold tracking-[0.25em] uppercase">Employee Identification</div>
        </div>
      </div>

      {/* Profile Image */}
      <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-10">
        <div className="w-[108px] h-[108px] rounded-full border-[6px] border-white bg-white shadow-sm overflow-hidden flex items-center justify-center">
          {data.employeeImage ? (
            <img src={data.employeeImage} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <User className="w-14 h-14 text-slate-200" />
          )}
        </div>
      </div>

      {/* Employee Details */}
      <div className="absolute top-[205px] w-full flex flex-col items-center px-4 z-10">
        <h2 className="text-[15px] font-bold text-slate-800 leading-tight mb-0.5">{data.fullName}</h2>
        <p className="text-[11px] text-slate-500 font-medium">{data.department || 'จัดซื้อ'}</p>
      </div>

      {/* Employee ID - Large and Spaced */}
      <div className="absolute top-[245px] w-full flex justify-center z-10">
        <div className="text-[28px] font-bold text-slate-900 tracking-[0.35em] pl-[0.35em]">
          {data.employeeId || '2079'}
        </div>
      </div>

      {/* Footer Section */}
      <div className="absolute bottom-4 w-full px-5 flex items-end justify-between z-10">
        {/* Signature Area */}
        <div className="flex flex-col items-start">
          <div className="w-16 border-t border-dashed border-slate-300 mb-1"></div>
          <span className="text-[4.5px] text-slate-400 font-bold uppercase tracking-tighter">HR Manager Signature</span>
          <div className="flex items-center gap-0.5 mt-0.5">
            <Check className="w-2 h-2 text-emerald-500" />
            <span className="text-[4px] text-slate-300 font-bold uppercase">Authorized</span>
          </div>
        </div>

        {/* Date & QR Code */}
        <div className="flex items-end gap-2">
          <div className="text-[6px] text-slate-400 font-bold mb-1">
            {new Date().toLocaleDateString('th-TH')}
          </div>
          <div className="w-9 h-9 bg-white border border-slate-100 p-0.5 rounded-sm shadow-sm">
            {data.qrCode ? (
              <img src={data.qrCode} alt="" className="w-full h-full" style={{ imageRendering: 'pixelated' }} crossOrigin="anonymous" />
            ) : (
              <QrCode className="w-full h-full text-slate-100" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
