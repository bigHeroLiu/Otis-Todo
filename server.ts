import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import OpenAI from 'openai';
import { config } from 'dotenv';

config(); // Load .env

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ROUTERHUB_API_KEY = "sk-rh-v1-Wcc3zkhVOgRlPyCScSfWFRx2pUYGHmLfmpkfBFhxKaU";

async function callGemini(systemPrompt: string, userPrompt: string, jsonMode = false) {
  const url = 'https://api.routerhub.ai/v1beta/models/gemini-2.5-pro:generateContent';
  
  const body: any = {
    contents: [
      { role: "user", parts: [{ text: userPrompt }] }
    ]
  };

  if (systemPrompt) {
    body.systemInstruction = {
      role: "system",
      parts: [{ text: systemPrompt }]
    };
  }

  if (jsonMode) {
    body.generationConfig = {
      responseMimeType: "application/json"
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ROUTERHUB_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RouterHub API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Initialize SQLite database
const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

// Setup tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    departments TEXT,
    projectLead TEXT,
    teamMembers TEXT,
    liaisonDepartments TEXT,
    status TEXT,
    currentUpdate TEXT,
    tripInfo TEXT,
    meetingInfo TEXT,
    sortOrder INTEGER DEFAULT 0,
    deletedAt TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    visibleToChairman INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT,
    department TEXT,
    profile TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS liaison_departments (
    id TEXT PRIMARY KEY,
    name TEXT,
    createdAt TEXT
  );
`);

// Try to alter if missing
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN visibleToChairman INTEGER DEFAULT 0;`);
} catch(e) {}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN updatedAt TEXT;`);
} catch(e) {}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN meetingInfo TEXT;`);
} catch(e) {}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN sortOrder INTEGER DEFAULT 0;`);
} catch(e) {}

// Auto-seed data on boot to prevent appearing "empty" during preview lifecycle
import { seedDatabaseIfEmpty } from './src/databaseSeeder';
seedDatabaseIfEmpty(db);

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// API Routes

// --- Tasks ---
app.get('/api/tasks', (req, res) => {
  const { deleted } = req.query;
  let stmt;
  if (deleted === 'true') {
    stmt = db.prepare('SELECT * FROM tasks WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC');
  } else {
    stmt = db.prepare('SELECT * FROM tasks WHERE deletedAt IS NULL ORDER BY sortOrder ASC, createdAt DESC');
  }
  const rows = stmt.all();
  // Decode JSON
  try {
    const tasks = rows.map((row: any) => {
      const getParsed = (str: any) => {
        if (!str) return [];
        try {
          return JSON.parse(str);
        } catch (e) {
          console.error("Failed to parse JSON string:", str, typeof str);
          return [];
        }
      };
      
      const getParsedObj = (str: any) => {
        if (!str) return null;
        try {
          return JSON.parse(str);
        } catch (e) {
          console.error("Failed to parse JSON object:", str, typeof str);
          return null;
        }
      };

      return {
        ...row,
        departments: getParsed(row.departments),
        teamMembers: getParsed(row.teamMembers),
        liaisonDepartments: getParsed(row.liaisonDepartments),
        tripInfo: getParsedObj(row.tripInfo),
        meetingInfo: getParsedObj(row.meetingInfo),
        visibleToChairman: !!row.visibleToChairman
      };
    });
    res.json(tasks);
  } catch (err) {
    console.error("Error processing tasks:", err);
    res.status(500).json({ error: 'Failed to parse tasks' });
  }
});

app.post('/api/tasks', (req, res) => {
  const { id = generateId(), name, description, departments, projectLead, teamMembers, liaisonDepartments, status, currentUpdate, tripInfo, meetingInfo, deletedAt, visibleToChairman = false, createdAt = new Date().toISOString(), sortOrder = 0 } = req.body;
  const updatedAt = createdAt;
  const stmt = db.prepare(`
    INSERT INTO tasks (id, name, description, departments, projectLead, teamMembers, liaisonDepartments, status, currentUpdate, tripInfo, meetingInfo, sortOrder, deletedAt, visibleToChairman, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id, name, description, JSON.stringify(departments), projectLead, JSON.stringify(teamMembers), JSON.stringify(liaisonDepartments),
    status, currentUpdate, tripInfo ? JSON.stringify(tripInfo) : null, meetingInfo ? JSON.stringify(meetingInfo) : null, sortOrder, deletedAt || null, visibleToChairman ? 1 : 0, createdAt, updatedAt
  );
  res.json({ id });
});

app.post('/api/tasks/reorder', (req, res) => {
  const { orders } = req.body; // Expecting [{ id: string, sortOrder: number }]
  const updateStmt = db.prepare('UPDATE tasks SET sortOrder = ? WHERE id = ?');
  
  const transaction = db.transaction((rows) => {
    for (const row of rows) {
      updateStmt.run(row.sortOrder, row.id);
    }
  });

  transaction(orders);
  res.json({ success: true });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  const existingStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const existing = existingStmt.get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const body = req.body;
  
  // Create object with defaults back to existing row
  const updated = {
    name: body.name !== undefined ? body.name : existing.name,
    description: body.description !== undefined ? body.description : existing.description,
    departments: body.departments !== undefined ? JSON.stringify(body.departments) : existing.departments,
    projectLead: body.projectLead !== undefined ? body.projectLead : existing.projectLead,
    teamMembers: body.teamMembers !== undefined ? JSON.stringify(body.teamMembers) : existing.teamMembers,
    liaisonDepartments: body.liaisonDepartments !== undefined ? JSON.stringify(body.liaisonDepartments) : existing.liaisonDepartments,
    status: body.status !== undefined ? body.status : existing.status,
    currentUpdate: body.currentUpdate !== undefined ? body.currentUpdate : existing.currentUpdate,
    tripInfo: body.tripInfo !== undefined ? (body.tripInfo ? JSON.stringify(body.tripInfo) : null) : existing.tripInfo,
    meetingInfo: body.meetingInfo !== undefined ? (body.meetingInfo ? JSON.stringify(body.meetingInfo) : null) : existing.meetingInfo,
    sortOrder: body.sortOrder !== undefined ? body.sortOrder : existing.sortOrder,
    deletedAt: body.deletedAt !== undefined ? body.deletedAt : existing.deletedAt,
    visibleToChairman: body.visibleToChairman !== undefined ? (body.visibleToChairman ? 1 : 0) : existing.visibleToChairman,
    updatedAt: new Date().toISOString()
  };

  const stmt = db.prepare(`
    UPDATE tasks 
    SET name = ?, description = ?, departments = ?, projectLead = ?, teamMembers = ?, liaisonDepartments = ?, status = ?, currentUpdate = ?, tripInfo = ?, meetingInfo = ?, sortOrder = ?, deletedAt = ?, visibleToChairman = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(
    updated.name, updated.description, updated.departments, updated.projectLead, updated.teamMembers, updated.liaisonDepartments,
    updated.status, updated.currentUpdate, updated.tripInfo, updated.meetingInfo, updated.sortOrder, updated.deletedAt, updated.visibleToChairman, updated.updatedAt, id
  );
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// --- Members ---
app.get('/api/members', (req, res) => {
  const stmt = db.prepare('SELECT * FROM members ORDER BY createdAt DESC');
  const rows = stmt.all();
  const members = rows.map((row: any) => ({
    ...row,
    profile: row.profile ? JSON.parse(row.profile) : null
  }));
  res.json(members);
});

app.post('/api/members', (req, res) => {
  const { id = generateId(), name, department, profile, createdAt = new Date().toISOString() } = req.body;
  
  // if id already exists, update
  const exists = db.prepare('SELECT id FROM members WHERE id = ?').get(id);
  if (exists) {
    const stmt = db.prepare('UPDATE members SET name = ?, department = ?, profile = ? WHERE id = ?');
    stmt.run(name, department, profile ? JSON.stringify(profile) : null, id);
    res.json({ id });
  } else {
    const stmt = db.prepare('INSERT INTO members (id, name, department, profile, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, name, department, profile ? JSON.stringify(profile) : null, createdAt);
    res.json({ id });
  }
});

app.delete('/api/members/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM members WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- Liaison Depts ---
app.get('/api/depts', (req, res) => {
  const stmt = db.prepare('SELECT * FROM liaison_departments ORDER BY createdAt DESC');
  res.json(stmt.all());
});

app.post('/api/depts', (req, res) => {
  const { id = generateId(), name, createdAt = new Date().toISOString() } = req.body;
  const stmt = db.prepare('INSERT INTO liaison_departments (id, name, createdAt) VALUES (?, ?, ?)');
  stmt.run(id, name, createdAt);
  res.json({ id });
});

app.delete('/api/depts/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM liaison_departments WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- AI Endpoints ---

app.post('/api/ai/extract-task', async (req, res) => {
  const { input, userLocation } = req.body;
  
  // Extract context from DB for better AI matching
  const membersStmt = db.prepare('SELECT id, name, department FROM members');
  const members = membersStmt.all();
  
  const deptsStmt = db.prepare('SELECT id, name FROM liaison_departments');
  const depts = deptsStmt.all();
  
  const tasksStmt = db.prepare('SELECT id, name, status, projectLead FROM tasks WHERE deletedAt IS NULL');
  const tasks = tasksStmt.all();

  const contextData = JSON.stringify({
    currentMembers: members,
    currentDepartments: depts,
    currentTasks: tasks
  });

  const systemPrompt = `你是一个智能、高级的系统级 AI 侧边栏助理。你的任务是理解用户的自然语言输入，并根据意图自动采取行动（新增待办、更新待办、新增员工、更新员工等）。
  你可以查阅以下当前系统上下文，以便更准确地匹配人员或任务：
  ${contextData}

  你需要返回一个带有执行意图的 JSON：
  {
    "intent": "CREATE_TASK" | "UPDATE_TASK" | "CREATE_MEMBER" | "UPDATE_MEMBER" | "CREATE_DEPT" | "UNKNOWN",
    "message": "给用户的回复信息（用第一人称，语气专业、礼貌。如果是新增或更新操作，可以概括一下你打算执行的内容，询问用户是否确认执行。提示词需足够友好智能。）",
    
    // 如果意图是 CREATE_TASK 或 UPDATE_TASK：
    "taskData": {
      "id": "如果是 UPDATE_TASK，这里填匹配到的任务id",
      "name": "任务标题/事项简述",
      "description": "详细说明",
      "projectLead": "负责人的 id（优先使用上下文里的id，如果你能匹配到名字的话）或名字",
      "departments": ["Legal", "Investment", "Audit", "Family_Office", "IR", "Personal", "Other"],
      "status": "pending",
      "tripInfo": {
        "destination": "目的地",
        "dates": "出差日期",
        "transport": "飞机 / 高铁 / 公司司机 / 自驾 / 其他",
        "needsDriver": true/false,
        "driverName": "司机姓名",
        "driverPickupLocation": "接车地点",
        "driverPhone": "司机电话",
        "flightNo": "航班号",
        "flightTime": "航班时间"
      }
    },
    
    // 如果意图是 CREATE_MEMBER 或 UPDATE_MEMBER：
    "memberData": {
      "id": "如果是 UPDATE_MEMBER，这里填匹配到的成员id",
      "name": "员工姓名",
      "department": "所属部门",
      "profile": { // 这个字段是可选的
        "position": "职位",
        "phone": "电话",
        "email": "邮箱"
      }
    },

    // 如果意图是 CREATE_DEPT：
    "deptData": {
      "name": "部门名称"
    }
  }

  注意：
  1. 当前日期是：${new Date().toLocaleDateString()}
  2. 请一定务必仔细理解用户的意图，如果用户说“张三换了手机号”，说明是 UPDATE_MEMBER。如果用户说“安排王五跟进报销流程”，可能是 CREATE_TASK 或者 UPDATE_TASK（如果已有报销任务）。
  3. departments 的可选值尽量从系统预设的 keys (Legal 对应 法务部, Investment 对应 投资中心, Audit 对应 审计监察部, Family_Office 对应 家族办公室, IR 对应 投资者关系, Personal 对应 个人事务) 中猜一个。如果无法匹配，就填 "Other"。
  4. 如果是更新任务，只填用户提到需要改的字段到 taskData 里即可。
  5. 必须返回合法的 JSON，不要套 markdown。
  `;

  try {
    const jsonStr = await callGemini(systemPrompt, input, true);
    let data;
    try {
      data = JSON.parse(jsonStr || "{}");
    } catch(e) {
      const cleanJson = jsonStr.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      data = JSON.parse(cleanJson || "{}");
    }
    
    res.json(data);
  } catch (e) {
    console.error("AI Extraction failed", e);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

app.post('/api/ai/estimate-travel', async (req, res) => {
  const { tripInfo } = req.body;
  const prompt = `请作为高效的行政助手，根据以下出差信息，帮我预估行程时间。
  目的地：${tripInfo?.destination || '未知'}
  交通方式：${tripInfo?.transport || '未知'}
  航班号/车次：${tripInfo?.flightNo || '未知'}
  
  请用一句话简明扼要地总结行程时间预估（例如：“飞行时间约2小时15分钟，从机场到市中心预计需要45分钟。”）。`;

  try {
    const text = await callGemini('', prompt, false);

    res.json({ text });
  } catch (e) {
    console.error("AI Estimation failed", e);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

app.post('/api/ai/summarize-task', async (req, res) => {
  const { task } = req.body;
  const prompt = `请作为高效的行政助手，对以下任务进行简明扼要的总结（提炼核心目标、关键时间和行动点，控制在100字以内）：
  任务名称：${task?.name}
  任务描述：${task?.description}
  最新进展：${task?.currentUpdate || '无'}
  出差信息：${task?.tripInfo ? JSON.stringify(task.tripInfo) : '无'}`;

  try {
    const text = await callGemini('', prompt, false);

    res.json({ text });
  } catch (e) {
    console.error("AI Summarization failed", e);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// Boot and Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log('Starting Vite in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving from dist folder in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server is listenining on http://0.0.0.0:${PORT}`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error('FAILED to start server:', err);
  process.exit(1);
});
