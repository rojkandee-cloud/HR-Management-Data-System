
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { FirestoreDoc, GeminiInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const optimizeDataForAI = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => optimizeDataForAI(item));
  } else if (typeof data === 'object' && data !== null) {
    const newData: any = {};
    for (const key in data) {
      if (key.toLowerCase().includes('image') || key.toLowerCase().includes('signature') || key.toLowerCase().includes('qrcode')) {
         newData[key] = "[Removed for Privacy]";
      } else {
         newData[key] = optimizeDataForAI(data[key]);
      }
    }
    return newData;
  }
  return data;
};

// --- AI for Login Face Match (Strict 90% Threshold) ---
export const verifyLoginFace = async (liveCaptureBase64: string, storedPortraitBase64: string): Promise<{ match: boolean, confidence: number, reasoning: string }> => {
  const prompt = `
    TASK: CRITICAL BIOMETRIC LOGIN VERIFICATION.
    Compare the "LIVE CAPTURE" image with the "REGISTERED PORTRAIT".
    Identify if they are the exact same person.
    
    RULES:
    1. Be extremely strict.
    2. Output a confidence score from 0 to 100.
    3. Return "match": true ONLY if confidence is 90 or higher.
    
    Response format (JSON only):
    {
      "match": boolean,
      "confidence": number,
      "reasoning": "ภาษาไทย"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: "--- REGISTERED PORTRAIT ---" },
          { inlineData: { data: storedPortraitBase64.split(',')[1], mimeType: 'image/jpeg' } },
          { text: "--- LIVE CAPTURE ---" },
          { inlineData: { data: liveCaptureBase64.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    // Ensure the 90% rule is enforced at code level as well
    if (result.confidence < 90) {
      result.match = false;
    }
    return result;
  } catch (error) {
    console.error("Biometric Login Error:", error);
    throw error;
  }
};

// --- AI for Face Uniqueness Check ---
export const checkFaceUniqueness = async (
  newPortraitBase64: string, 
  existingPortraits: { id: string, name: string, image: string }[]
): Promise<{ isDuplicate: boolean, matchId?: string, matchName?: string, confidence: number, reasoning: string }> => {
  const gallery = existingPortraits.filter(p => p.image && p.image.startsWith('data:image')).slice(0, 50);
  if (gallery.length === 0) return { isDuplicate: false, confidence: 0, reasoning: "No existing data to compare." };

  const prompt = `
    You are a high-security Biometric Verification Expert.
    Task: Compare the "New Subject" image against the "Gallery" of existing employees.
    Determine if the person in the "New Subject" image is already present in the "Gallery".
    
    Response format (JSON only):
    {
      "isDuplicate": boolean,
      "matchId": "Employee ID if matched",
      "matchName": "Employee Name if matched",
      "confidence": 0-100,
      "reasoning": "Explain why in Thai"
    }
  `;

  const parts: any[] = [
    { text: prompt },
    { text: "--- New Subject ---" },
    { inlineData: { data: newPortraitBase64.split(',')[1], mimeType: 'image/jpeg' } }
  ];

  gallery.forEach((item, idx) => {
    parts.push({ text: `--- Gallery Person ${idx + 1} (ID: ${item.id}, Name: ${item.name}) ---` });
    parts.push({ inlineData: { data: item.image.split(',')[1], mimeType: 'image/jpeg' } });
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Face Check Error:", error);
    throw error;
  }
};

// --- Image Analysis Functions ---
export const verifyIdentityMatch = async (portraitBase64: string, idCardBase64: string): Promise<{ match: boolean, confidence: number, reasoning: string }> => {
  const prompt = `
    ในฐานะผู้เชี่ยวชาญด้านพิสูจน์ตัวตน (Identity Verification Expert)
    กรุณาเปรียบเทียบใบหน้าในรูปถ่ายพนักงาน (Portrait) และรูปในบัตรประชาชน (ID Card)
    ตรวจสอบว่าเป็นบุคคลเดียวกันหรือไม่ โดยพิจารณาจากโครงสร้างใบหน้า
    ตอบกลับเป็น JSON เท่านั้น: { "match": boolean, "confidence": 0-100, "reasoning": "ภาษาไทย" }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: portraitBase64.split(',')[1], mimeType: 'image/jpeg' } },
        { inlineData: { data: idCardBase64.split(',')[1], mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || '{}');
};

export const checkDocumentQuality = async (imageBase64: string, docType: string): Promise<{ quality: 'Pass' | 'Fail', suggestions: string[] }> => {
  const prompt = `
    ตรวจสอบคุณภาพของรูปถ่ายเอกสารประเภท: ${docType}
    พิจารณา:
    1. ความคมชัด (Blurriness)
    2. แสงสว่าง (Brightness)
    3. การจัดวาง (Alignment/Crop)
    4. ความครบถ้วนของข้อมูล
    ตอบกลับเป็น JSON: { "quality": "Pass/Fail", "suggestions": ["คำแนะนำภาษาไทย"] }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || '{}');
};

export const getCoordinatesFromAddress = async (address: string): Promise<{ lat: number, lng: number }> => {
  const prompt = `ในฐานะผู้เชี่ยวชาญด้านภูมิศาสตร์และแผนที่ กรุณาระบุพิกัดละติจูด (lat) และลองจิจูด (lng) สำหรับที่อยู่นี้ในประเทศไทย: "${address}"
  หากไม่แน่ใจให้ระบุพิกัดที่ใกล้เคียงที่สุด
  ตอบกลับเป็น JSON: { "lat": number, "lng": number }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER }
        },
        required: ["lat", "lng"]
      }
    }
  });

  return JSON.parse(response.text || '{"lat": 13.7563, "lng": 100.5018}');
};

const updateEmployeeFieldTool: FunctionDeclaration = {
  name: 'updateEmployeeField',
  parameters: {
    type: Type.OBJECT,
    description: 'Update a specific field for an employee.',
    properties: {
      employeeId: { type: Type.STRING },
      fieldName: { type: Type.STRING },
      newValue: { type: Type.STRING }
    },
    required: ['employeeId', 'fieldName', 'newValue']
  }
};

export const askCrossCollectionQuestion = async (
  allCollections: Record<string, FirestoreDoc[]>, 
  question: string
): Promise<GenerateContentResponse> => {
  let contextString = "";
  for (const [colName, docs] of Object.entries(allCollections)) {
    const cleanDocs = optimizeDataForAI(docs.slice(0, 200)); 
    contextString += `\n--- Collection: ${colName} ---\n${JSON.stringify(cleanDocs)}\n`;
  }

  const prompt = `คุณคือ FireView Smart Agent v3.5.0 (OpenClaw Powered)\nข้อมูลองค์กรปัจจุบัน:\n${contextString}\nคำสั่งผู้ใช้งาน: "${question}"`;

  try {
    return await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ functionDeclarations: [updateEmployeeFieldTool] }],
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
  } catch (error) {
    throw error;
  }
};

export const askAiForLineSharing = async (
  allCollections: Record<string, FirestoreDoc[]>, 
  question: string
): Promise<string> => {
  let contextString = "";
  for (const [colName, docs] of Object.entries(allCollections)) {
    const cleanDocs = optimizeDataForAI(docs.slice(0, 150)); 
    contextString += `\n--- หมวดหมู่ข้อมูล: ${colName} ---\n${JSON.stringify(cleanDocs)}\n`;
  }

  const prompt = `คุณคือผู้ช่วยบริหารจัดการข้อมูลทรัพยากรบุคคลอัจฉริยะ (LINE Report Assistant)
หน้าที่ของคุณคือสรุปข้อมูลตามคำสั่งของผู้ใช้งานเพื่อส่งต่อในแอปพลิเคชัน LINE

ข้อมูลดิบจากระบบ FireView:
${contextString}

คำถามหรือหัวข้อที่ต้องการสรุป: "${question}"

ข้อกำหนดในการตอบกลับ:
1. สรุปเป็นภาษาไทยที่กระชับและได้ใจความสำคัญ
2. ตกแต่งด้วย Emoji เพื่อให้น่าอ่านบนหน้าจอมือถือ
3. หากเป็นข้อมูลตัวเลขหรือสถิติ ให้แสดงผลในรูปแบบที่เปรียบเทียบง่าย
4. ไม่ต้องแสดงคำเกริ่นนำของ AI (เช่น "นี่คือสรุปของคุณ...") ให้แสดงเฉพาะเนื้อหาที่จะนำไปแชร์ได้ทันที`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "ขออภัย ไม่สามารถประมวลผลข้อมูลเพื่อแชร์ได้ในขณะนี้";
  } catch (error) {
    console.error("askAiForLineSharing Error:", error);
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Engine";
  }
};
