import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "明天我要出差去上海，航班是 MU5101。需要张师傅在虹桥机场接我，电话13812345678。",
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `你是一个高效的行政助手。你的任务是从用户的口语化描述中提取待办事项信息，并以 JSON 格式返回。
      
      返回的 JSON 结构如下：
      {
        "name": "任务简短标题",
        "description": "任务详细描述",
        "status": "pending",
        "tripInfo": {
          "destination": "目的地",
          "dates": "出差日期",
          "transport": "飞机",
          "flightNo": "航班号",
          "estimatedTravelTime": "行程时间预估（请利用搜索工具，计算航班的飞行时间，并用一句话总结）"
        }
      }`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          status: { type: Type.STRING },
          tripInfo: {
            type: Type.OBJECT,
            properties: {
              destination: { type: Type.STRING },
              dates: { type: Type.STRING },
              transport: { type: Type.STRING },
              flightNo: { type: Type.STRING },
              estimatedTravelTime: { type: Type.STRING }
            }
          }
        }
      }
    }
  });

  console.log(response.text);
}

test();
