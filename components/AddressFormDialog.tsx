import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Home, Image as ImageIcon, Upload, Camera, ExternalLink, Loader2, RefreshCw, Mail } from 'lucide-react';
import { getCoordinatesFromAddress } from '../services/geminiService';
import { getSingleDocument, setDocumentWithId } from '../services/firebase';
import { AddressData } from '../types';

// --- FULL 77 THAI PROVINCES ---
const PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", 
  "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", 
  "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", 
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", 
  "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", 
  "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", 
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", 
  "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
].sort();

// --- MOCK DATA FOR CASCADING DROPDOWNS & POSTAL CODES ---
const THAI_ADDRESS_DATA: Record<string, Record<string, string[]>> = {
  "กรุงเทพมหานคร": {
    "เขตพระนคร": ["พระบรมมหาราชวัง", "วังบูรพาภิรมย์", "วัดราชบพิธ", "สำราญราษฎร์", "ศาลเจ้าพ่อเสือ", "เสาชิงช้า", "บวรนิเวศ", "ตลาดยอด", "ชนะสงคราม", "บ้านพานถม", "บางขุนพรหม", "วัดสามพระยา"],
    "เขตดุสิต": ["ดุสิต", "วชิรพยาบาล", "สวนจิตรลดา", "สี่แยกมหานาค", "ถนนนครไชยศรี"],
    "เขตปทุมวัน": ["รองเมือง", "วังใหม่", "ปทุมวัน", "ลุมพินี"],
    "เขตบางรัก": ["มหาพฤฒาราม", "สีลม", "สุริยวงศ์", "บางรัก", "สี่พระยา"],
    "เขตห้วยขวาง": ["ห้วยขวาง", "บางกะปิ", "สามเสนนอก"],
    "เขตคลองเตย": ["คลองเตย", "คลองตัน", "พระโขนง"],
    "เขตจตุจักร": ["ลาดยาว", "เสนานิคม", "จันทรเกษม", "จอมพล", "จตุจักร"],
  },
  "เชียงใหม่": {
    "เมืองเชียงใหม่": ["ศรีภูมิ", "พระสิงห์", "หายยา", "ช้างม่อย", "ช้างคลาน", "วัดเกต", "ช้างเผือก", "สุเทพ", "แม่เหียะ", "ป่าแดด", "หนองหอย", "ท่าศาลา", "หนองป่าครั่ง", "ฟ้าฮ่าม", "ป่าตัน", "สันผีเสื้อ"],
    "แม่ริม": ["ริมใต้", "ริมเหนือ", "สันโป่ง", "ขี้เหล็ก", "สะลวง", "ห้วยทราย", "แม่แรม", "โป่งแยง", "แม่สา", "ดอนแก้ว", "เหมืองแก้ว"],
    "หางดง": ["หางดง", "หนองแก๋ว", "หารแก้ว", "หนองตอง", "ขุนคง", "สบแม่ข่า", "บ้านแหวน", "สันผักหวาน", "หนองควาย", "บ้านปง", "น้ำแพร่"],
  },
  "ขอนแก่น": {
    "เมืองขอนแก่น": ["ในเมือง", "สำราญ", "โคกสี", "ท่าพระ", "บ้านทุ่ม", "เมืองเก่า", "พระลับ", "สาวะถี", "บ้านหว้า", "บ้านค้อ", "แดงใหญ่", "ดอนช้าง", "ดอนหัน", "ศิลา", "บ้านเป็ด", "หนองตูม", "บึงเนียม", "โนนท่อน"],
    "บ้านไผ่": ["บ้านไผ่", "ในเมือง", "เมืองเพีย", "บ้านลาน", "แคนเหนือ", "ภูเหล็ก", "ป่าปอ", "หินตั้ง", "หนองน้ำใส", "หัวหนอง"],
  },
  "ภูเก็ต": {
    "เมืองภูเก็ต": ["ตลาดใหญ่", "ตลาดเหนือ", "เกาะแก้ว", "รัษฎา", "วิชิต", "ฉลอง", "ราไวย์", "กะรน"],
    "กะทู้": ["กะทู้", "ป่าตอง", "กมลา"],
    "ถลาง": ["เทพกระษัตรี", "ศรีสุนทร", "เชิงทะเล", "ป่าคลอก", "ไม้ขาว", "สาคู"],
  },
  "ชลบุรี": {
      "เมืองชลบุรี": ["บางปลาสร้อย", "มะขามหย่ง", "บ้านโขด", "แสนสุข", "บ้านสวน", "หนองรี", "นาป่า", "หนองข้างคอก", "ดอนหัวฬ่อ", "หนองไม้แดง", "บางทราย", "คลองตำหรุ", "เหมือง", "บ้านปึก", "ห้วยกะปิ", "เสม็ด", "อ่างศิลา", "สำนักบก"],
      "ศรีราชา": ["ศรีราชา", "สุรศักดิ์", "ทุ่งสุขลา", "บึง", "หนองขาม", "เขาคันทรง", "บางพระ", "บ่อวิน"],
      "บางละมุง": ["บางละมุง", "หนองปรือ", "หนองปลาไหล", "โป่ง", "เขาไม้แก้ว", "ห้วยใจ", "ตะเคียนเตี้ย", "นาเกลือ"],
  }
};

// Mock Postal Codes for the districts above
const DISTRICT_POSTAL_CODES: Record<string, string> = {
  "เขตพระนคร": "10200",
  "เขตดุสิต": "10300",
  "เขตปทุมวัน": "10330",
  "เขตบางรัก": "10500",
  "เขตห้วยขวาง": "10310",
  "เขตคลองเตย": "10110",
  "เขตจตุจักร": "10900",
  "เมืองเชียงใหม่": "50000",
  "แม่ริม": "50180",
  "หางดง": "50230",
  "เมืองขอนแก่น": "40000",
  "บ้านไผ่": "40110",
  "เมืองภูเก็ต": "83000",
  "กะทู้": "83120",
  "ถลาง": "83110",
  "เมืองชลบุรี": "20000",
  "ศรีราชา": "20110",
  "บางละมุง": "20150"
};

interface AddressFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

const INITIAL_ADDRESS_DATA: AddressData = {
  employeeId: '',
  province: '',
  district: '',
  subDistrict: '',
  postalCode: '',
  houseNumber: '',
  villageInfo: '',
  latitude: '',
  longitude: '',
  houseRegistrationImage: '',
  mapImage: ''
};

export const AddressFormDialog: React.FC<AddressFormDialogProps> = ({ isOpen, onClose, employeeId, employeeName }) => {
  const [formData, setFormData] = useState<AddressData>(INITIAL_ADDRESS_DATA);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<'houseReg' | 'map' | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if selected province has cascading data
  const hasCascadingData = formData.province && THAI_ADDRESS_DATA[formData.province];
  // Check if selected district has cascading data
  const hasSubDistrictData = hasCascadingData && formData.district && THAI_ADDRESS_DATA[formData.province][formData.district];

  // Fetch existing address on open
  useEffect(() => {
    if (isOpen && employeeId) {
      loadAddressData();
    }
    return () => stopCamera();
  }, [isOpen, employeeId]);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, isCameraOpen]);

  const loadAddressData = async () => {
    setLoading(true);
    try {
      const doc = await getSingleDocument('addresses', employeeId);
      if (doc) {
        setFormData(doc as unknown as AddressData);
      } else {
        setFormData({ ...INITIAL_ADDRESS_DATA, employeeId });
      }
    } catch (err) {
      console.error("Failed to load address", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const province = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      province, 
      district: '', 
      subDistrict: '',
      postalCode: ''
    }));
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const district = e.target.value;
    // Attempt to find postal code from mock data
    const suggestedPostalCode = DISTRICT_POSTAL_CODES[district] || '';
    
    setFormData(prev => ({ 
      ...prev, 
      district, 
      subDistrict: '',
      postalCode: suggestedPostalCode
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'postalCode') {
      // Validate 5 digits only
      const numeric = value.replace(/\D/g, '').slice(0, 5);
      setFormData(prev => ({ ...prev, [name]: numeric }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGenerateCoordinates = async () => {
    if (!formData.province || !formData.district || !formData.subDistrict) {
      alert("กรุณากรอกข้อมูล จังหวัด อำเภอ และตำบล ให้ครบถ้วนก่อนค้นหาพิกัด");
      return;
    }
    
    setAiLoading(true);
    const fullAddress = `บ้านเลขที่ ${formData.houseNumber} ${formData.villageInfo} ${formData.subDistrict} ${formData.district} ${formData.province} ${formData.postalCode}`;
    
    try {
      const coords = await getCoordinatesFromAddress(fullAddress);
      setFormData(prev => ({
        ...prev,
        latitude: coords.lat.toString(),
        longitude: coords.lng.toString()
      }));
    } catch (err) {
      alert("ไม่สามารถค้นหาพิกัดได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'houseRegistrationImage' | 'mapImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, [field]: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Camera Functions ---
  const startCamera = async (target: 'houseReg' | 'map') => {
    setActiveCameraTarget(target);
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
    setActiveCameraTarget(null);
  };

  const takePhoto = () => {
    if (videoRef.current && activeCameraTarget) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      if (activeCameraTarget === 'houseReg') {
        setFormData(prev => ({ ...prev, houseRegistrationImage: dataUrl }));
      } else {
        setFormData(prev => ({ ...prev, mapImage: dataUrl }));
      }
      stopCamera();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        employeeId,
        updatedAt: new Date().toISOString()
      };
      // Use setDocumentWithId to keep ID consistent with Employee ID
      await setDocumentWithId('addresses', employeeId, payload);
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
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-purple-50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-purple-900">
                  จัดการที่อยู่พนักงาน
                </h3>
                <p className="text-xs text-purple-600">
                  Address Management for: <span className="font-semibold">{employeeName}</span> ({employeeId})
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full text-purple-400 hover:text-purple-700 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 overflow-y-auto space-y-8">
            
            {/* Section 1: Location Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* 1.1 Geographic Selectors - Row 1 */}
               <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Province Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">2. จังหวัด</label>
                    <select 
                      value={formData.province} 
                      onChange={handleProvinceChange}
                      className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 outline-none"
                    >
                      <option value="">-- เลือกจังหวัด --</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* District Selector or Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">3. อำเภอ/เขต</label>
                    {hasCascadingData ? (
                       <select 
                        value={formData.district} 
                        onChange={handleDistrictChange}
                        disabled={!formData.province}
                        className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 disabled:bg-slate-50 disabled:opacity-50 outline-none"
                      >
                        <option value="">-- เลือกอำเภอ --</option>
                        {Object.keys(THAI_ADDRESS_DATA[formData.province]).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))
                        }
                      </select>
                    ) : (
                      <input 
                        type="text"
                        name="district"
                        value={formData.district} 
                        onChange={handleDistrictChange}
                        disabled={!formData.province}
                        placeholder="กรอกชื่ออำเภอ/เขต"
                        className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 disabled:bg-slate-50 disabled:opacity-50 outline-none placeholder-slate-400"
                      />
                    )}
                  </div>
               </div>

               {/* 1.2 Geographic Selectors - Row 2 */}
               <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sub-District Selector or Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">4. ตำบล/แขวง</label>
                    {hasSubDistrictData ? (
                      <select 
                        name="subDistrict"
                        value={formData.subDistrict} 
                        onChange={handleInputChange}
                        disabled={!formData.district}
                        className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 disabled:bg-slate-50 disabled:opacity-50 outline-none"
                      >
                        <option value="">-- เลือกตำบล --</option>
                        {THAI_ADDRESS_DATA[formData.province][formData.district].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))
                        }
                      </select>
                    ) : (
                      <input 
                        type="text"
                        name="subDistrict"
                        value={formData.subDistrict} 
                        onChange={handleInputChange}
                        disabled={!formData.district}
                        placeholder="กรอกชื่อตำบล/แขวง"
                        className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 disabled:bg-slate-50 disabled:opacity-50 outline-none placeholder-slate-400"
                      />
                    )}
                  </div>

                   {/* Postal Code Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-4 h-4 text-slate-400" />
                      10. รหัสไปรษณีย์
                    </label>
                    <input 
                      type="text" 
                      name="postalCode"
                      value={formData.postalCode} 
                      onChange={handleInputChange}
                      disabled={!formData.district}
                      maxLength={5}
                      inputMode="numeric"
                      placeholder="เช่น 10200"
                      className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 disabled:bg-slate-50 disabled:opacity-50 outline-none placeholder-slate-400 font-mono tracking-widest"
                    />
                  </div>
               </div>

               {/* 1.3 Specifics */}
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">5. เลขที่บ้าน</label>
                  <input 
                    type="text" 
                    name="houseNumber"
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 outline-none placeholder-slate-400"
                    placeholder="เช่น 123/45"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">6. หมู่ที่ / หมู่บ้าน / ซอย</label>
                  <input 
                    type="text" 
                    name="villageInfo"
                    value={formData.villageInfo}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 outline-none placeholder-slate-400"
                    placeholder="เช่น หมู่ 1 บ้านหนอง..."
                  />
               </div>
            </div>

            <div className="border-t border-slate-100"></div>

            {/* Section 2 & 3 Combined: Map and Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Left Column: Coordinates & Map */}
               <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" /> 
                    7. แผนที่ตั้ง (Coordinates)
                  </h4>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Latitude</label>
                       <input type="text" value={formData.latitude} readOnly className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 outline-none" />
                    </div>
                    <div className="flex-1">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitude</label>
                       <input type="text" value={formData.longitude} readOnly className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 outline-none" />
                    </div>
                    <button onClick={handleGenerateCoordinates} disabled={aiLoading} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all text-xs whitespace-nowrap">
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />} AI ค้นหาพิกัด
                    </button>
                  </div>
                  
                  {/* Interactive Map */}
                  <div className="w-full h-56 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative flex items-center justify-center">
                    {formData.latitude && formData.longitude ? (
                      <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&hl=th&z=16&output=embed`}
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-2">
                         <MapPin className="w-8 h-8 opacity-20" />
                         <span className="text-xs font-medium">ยังไม่มีพิกัดแผนที่ (กด AI ค้นหาพิกัด)</span>
                      </div>
                    )}
                  </div>
               </div>

               {/* Right Column: Documents */}
               <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-600" /> 
                    8. เอกสารแนบ
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                     {/* House Registration */}
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                       <label className="block text-[10px] font-bold text-slate-700 mb-2 text-center uppercase">สำเนาทะเบียนบ้าน</label>
                       <div className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative min-h-[120px]">
                         {formData.houseRegistrationImage ? (
                           <img src={formData.houseRegistrationImage} alt="House Reg" className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-slate-300 text-[10px] flex flex-col items-center gap-1">
                             <ImageIcon className="w-6 h-6 opacity-50" /> No Image
                           </span>
                         )}
                       </div>
                       <div className="flex flex-col xl:flex-row justify-center gap-1.5">
                          <button onClick={() => startCamera('houseReg')} className="flex-1 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"><Camera className="w-3 h-3"/> ถ่ายรูป</button>
                          <label className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors">
                            <Upload className="w-3 h-3"/> อัปโหลด
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'houseRegistrationImage')} />
                          </label>
                       </div>
                     </div>

                     {/* Map Image */}
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                       <label className="block text-[10px] font-bold text-slate-700 mb-2 text-center uppercase">แผนผังสถานที่</label>
                       <div className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative min-h-[120px]">
                         {formData.mapImage ? (
                           <img src={formData.mapImage} alt="Map" className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-slate-300 text-[10px] flex flex-col items-center gap-1">
                             <MapPin className="w-6 h-6 opacity-50" /> No Image
                           </span>
                         )}
                       </div>
                       <div className="flex flex-col xl:flex-row justify-center gap-1.5">
                          <button onClick={() => startCamera('map')} className="flex-1 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"><Camera className="w-3 h-3"/> ถ่ายรูป</button>
                          <label className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors">
                            <Upload className="w-3 h-3"/> อัปโหลด
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'mapImage')} />
                          </label>
                       </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
              ปิด
            </button>
            <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-lg shadow-purple-200 flex items-center gap-2 transition-all">
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลที่อยู่'}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
           <div className="p-4 flex justify-between items-center text-white bg-black/50 absolute top-0 w-full z-10">
              <span className="font-bold">Take Photo</span>
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