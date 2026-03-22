
export interface FirestoreDoc {
  id: string;
  [key: string]: any;
}

export interface CollectionData {
  name: string;
  docs: FirestoreDoc[];
}

export interface GeminiInsight {
  summary: string;
  keyTrends: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
}

export interface AttendanceRecord extends FirestoreDoc {
  logCode: string; // XX-XXXX
  employeeId: string;
  employeeName: string;
  action: 'เข้าทำงาน' | 'ออกงาน' | 'เริ่ม_OT' | 'เลิก_OT';
  timestamp: string; // ISO
  workStatus: 'ทำงานปกติ' | 'นอกเวลาปกติ (รออนุมัติ)';
  remarks: string; // เช่น เข้าสาย, ออกก่อนเวลา
  date: string; // YYYY-MM-DD for easier filtering
}

export interface AddressData {
  employeeId: string;
  province: string;
  district: string; // Amphoe
  subDistrict: string; // Tambon
  postalCode: string; // Zip Code (5 digits)
  houseNumber: string;
  villageInfo: string; // Moo, Village, Soi
  latitude: string;
  longitude: string;
  houseRegistrationImage: string; // Base64
  mapImage: string; // Base64
  updatedAt?: string;
}

export interface EducationData {
  employeeId: string;
  highestLevel: string; // Primary, Secondary, etc.
  institution: string;
  facultyMajor: string;
  graduationYear: string; // Thai Year (BE)
  skills: string;
  certificateImage: string; // Base64
  updatedAt?: string;
}

export interface WorkPermissionData {
  employeeId: string;
  workingCode: string; // Auto-generated
  position: string;
  expertiseLevel: string;
  department: string;
  jobDescriptionUrl: string;
  updatedAt?: string;
  employeeImage?: string; // New field for caching employee image
}

export interface WorkProfileData {
  employeeId: string;
  startDate: string; // ISO Date
  position: string; // Job Responsibilities
  department: string;
  employmentType: string;
  salary: number; 
  employmentStatus: string; // Active or Resigned
  bankAccountNumber?: string; // 10 digits with format XXX-X-XXXXX-X
  updatedAt?: string;
}

export interface DepartmentData {
  id?: string;
  departmentId: string;     // รหัส department
  name: string;             // ชื่อ department
  headOfDepartment: string; // ชื่อหัวหน้า ผู้บังคับบัญชา
  targetHeadcount: number;  // เป้าหมายอัตรากำลังคน
  updatedAt?: string;
}

export interface JobPositionData {
  id?: string;
  departmentId: string; // Foreign Key to Department
  title: string;        // ชื่อตำแหน่งงาน
  targetHeadcount: number; // จำนวนอัตรากำลัง
  jobDescriptionUrl: string; // ลักษณะงานรับผิดชอบ (Link URL)
  status?: string;      // สถานะจัดการ: เต็มอัตรา, อัตรายังว่าง, รอขยายอัตรา
  updatedAt?: string;
}

export interface LeaveRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  totalDuration: string; // "X วัน Y ชม."
  leaveType: 'Sick' | 'Maternity' | 'Personal';
  leaveReason?: string; // Required if Personal
  signature: string; // Base64
  status: 'Pending' | 'Approved' | 'Rejected';
  approverComment?: string; // Reason for rejection
  approvedAt?: string;
  createdAt: string;
}

export interface HolidayData extends FirestoreDoc {
  date: string; // ISO Date (YYYY-MM-DD)
  title: string;
  type: 'HD1' | 'HD2' | 'HD3'; // HD1 is auto-calculated weekends
  description?: string;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
