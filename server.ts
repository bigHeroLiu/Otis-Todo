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

// Set up OpenAI compatible generic client. Can point to Ollama, LM Studio, etc. via OPENAI_BASE_URL
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// Configure the model name used locally or from open AI
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

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
  const tasks = rows.map((row: any) => ({
    ...row,
    departments: JSON.parse(row.departments || '[]'),
    teamMembers: JSON.parse(row.teamMembers || '[]'),
    liaisonDepartments: JSON.parse(row.liaisonDepartments || '[]'),
    tripInfo: row.tripInfo ? JSON.parse(row.tripInfo) : null,
    meetingInfo: row.meetingInfo ? JSON.parse(row.meetingInfo) : null,
    visibleToChairman: !!row.visibleToChairman
  }));
  res.json(tasks);
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
  const systemPrompt = `你是一个高效的行政助手。你的任务是从用户的口语化描述中提取待办事项信息，并以 JSON 格式返回。
      
  返回的 JSON 结构如下：
  {
    "name": "任务简短标题",
    "description": "任务详细描述",
    "projectLead": "负责人姓名（如果提到，否则留空）",
    "departments": ["所属部门关键字，可选值：legal, investment, audit, family_office, ir, personal"],
    "status": "pending",
    "tripInfo": {
      "destination": "目的地",
      "dates": "出差日期（如：4月15日）",
      "transport": "交通方式，必须从以下选项中严格选择一个：飞机、高铁、公司司机、自驾、其他",
      "needsDriver": true 或 false (如果描述中提到需要司机、接送等，设为 true),
      "driverName": "司机姓名（如果提到）",
      "driverPickupLocation": "司机在哪里接（如果提到，例如：机场T3航站楼、公司楼下等）",
      "driverPhone": "司机手机号（如果提到，例如：13812345678）",
      "flightNo": "航班号（如果提到航班信息，如 MU5101）",
      "flightTime": "起降时间与机场（如果提到相关信息）",
      "estimatedTravelTime": "行程时间预估"
    }
  }
  
  重要提示：
  1. 请务必仔细提取“司机手机号”(driverPhone) 和“接车地点”(driverPickupLocation)。
  2. 如果用户提供了出差行程，请预估行程时间并填入 estimatedTravelTime 字段。
  3. 当前日期是：${new Date().toLocaleDateString()}
  
  请确保输出是纯 JSON，不要带 markdown 代码块。`;

  try {
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ],
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Ensure transport is valid enum
    if (data.tripInfo && data.tripInfo.transport) {
      const validTransports = ["飞机", "高铁", "公司司机", "自驾", "其他"];
      if (!validTransports.includes(data.tripInfo.transport)) {
        data.tripInfo.transport = "其他";
      }
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
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    res.json({ text: completion.choices[0].message.content });
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
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    res.json({ text: completion.choices[0].message.content });
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
