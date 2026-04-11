import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function summarizeTask(task: any) {
  const prompt = `请作为高效的行政助手，对以下任务进行简明扼要的总结（提炼核心目标、关键时间和行动点，控制在100字以内）：
  任务名称：${task.name}
  任务描述：${task.description}
  最新进展：${task.currentUpdate || '无'}
  出差信息：${task.tripInfo ? JSON.stringify(task.tripInfo) : '无'}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (e) {
    console.error("Failed to summarize task", e);
    return null;
  }
}
export async function estimateTravelTime(tripInfo: any, userLocation?: string) {
  const locationContext = userLocation ? `用户的当前位置坐标为：${userLocation}。` : '';
  const prompt = `请作为高效的行政助手，根据以下出差信息，帮我预估行程时间。
  目的地：${tripInfo.destination || '未知'}
  交通方式：${tripInfo.transport || '未知'}
  航班号/车次：${tripInfo.flightNo || '未知'}
  ${locationContext}
  
  请利用搜索工具（Google Search）查询航班的飞行时间、或者从当前位置到机场/目的地的通勤时间。
  请用一句话简明扼要地总结行程时间预估（例如：“飞行时间约2小时15分钟，从当前位置到机场预计需要45分钟。”）。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text;
  } catch (e) {
    console.error("Failed to estimate travel time", e);
    return null;
  }
}

export async function processNaturalLanguageTask(input: string, userLocation?: string) {
  const locationContext = userLocation ? `\n用户的当前位置坐标为：${userLocation}。请在计算通勤时间时使用此位置作为起点。` : '\n如果用户未提供当前位置，请在 estimatedTravelTime 中提示“由于未获取到当前位置，无法计算通勤时间”。';

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: input,
    config: {
      tools: [{ googleSearch: {} }],
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
          "driverPickupLocation": "司机在哪里接（如果提到，例如：机场T3航站楼、公司楼下等）",
          "driverPhone": "司机手机号（如果提到，例如：13812345678）",
          "flightNo": "航班号（如果提到航班信息，如 MU5101）",
          "flightTime": "起降时间与机场（如果提到相关信息）",
          "estimatedTravelTime": "行程时间预估（请利用搜索工具，计算航班的飞行时间、从当前位置到机场的通勤时间，或者城市间出差的通勤时间，并用一句话总结）"
        }
      }
      
      重要提示：
      1. 请务必仔细提取“司机手机号”(driverPhone) 和“接车地点”(driverPickupLocation)，只要用户在描述中提及了电话号码或接送的具体位置，就必须填入对应的字段中。
      2. 如果用户提供了出差行程（如航班号、目的地等），请务必使用搜索工具（Google Search）查询并计算行程时间（如飞行时长、到机场时间、两地通勤时间等），填入 estimatedTravelTime 字段。${locationContext}
      3. 当前日期是：${new Date().toLocaleDateString()}
      
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
              driverPickupLocation: { type: Type.STRING },
              driverPhone: { type: Type.STRING },
              flightNo: { type: Type.STRING },
              flightTime: { type: Type.STRING },
              estimatedTravelTime: { type: Type.STRING }
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
