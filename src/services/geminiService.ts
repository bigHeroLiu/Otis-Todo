import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processNaturalLanguageTask(input: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: input,
    config: {
      systemInstruction: `你是一个高效的行政助手。你的任务是从用户的口语化描述中提取待办事项信息，并以 JSON 格式返回。
      
      返回的 JSON 结构如下：
      {
        "name": "任务简短标题",
        "description": "任务详细描述",
        "projectLead": "负责人姓名（如果提到，否则留空）",
        "departments": ["所属部门关键字，可选值：legal, investment, audit, family_office, ir, personal"],
        "status": "pending",
        "tripInfo": { // 如果是出差任务，请提供此字段；如果是会议或其他，请不要包含此字段
          "destination": "目的地",
          "dates": "出差日期（如：4月15日）",
          "transport": "交通方式，必须从以下选项中严格选择一个：飞机、高铁、公司司机、自驾、其他",
          "needsDriver": true 或 false (如果描述中提到需要司机、接送等，设为 true),
          "driverName": "司机姓名（如果提到）",
          "flightNo": "航班号（如果提到航班信息，如 MU5101）",
          "flightTime": "起降时间与机场（如果提到相关信息）"
        }
      }
      
      当前日期是：${new Date().toLocaleDateString()}
      
      请确保输出是合法的 JSON。`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          projectLead: { type: Type.STRING },
          departments: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          status: { type: Type.STRING },
          tripInfo: {
            type: Type.OBJECT,
            properties: {
              destination: { type: Type.STRING },
              dates: { type: Type.STRING },
              transport: { 
                type: Type.STRING,
                enum: ["飞机", "高铁", "公司司机", "自驾", "其他"]
              },
              needsDriver: { type: Type.BOOLEAN },
              driverName: { type: Type.STRING },
              flightNo: { type: Type.STRING },
              flightTime: { type: Type.STRING }
            }
          }
        },
        required: ["name", "description", "status"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    
    // 确保交通方式是合法的枚举值，否则回退到"其他"
    if (data.tripInfo && data.tripInfo.transport) {
      const validTransports = ["飞机", "高铁", "公司司机", "自驾", "其他"];
      if (!validTransports.includes(data.tripInfo.transport)) {
        data.tripInfo.transport = "其他";
      }
    }
    
    return data;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return null;
  }
}
