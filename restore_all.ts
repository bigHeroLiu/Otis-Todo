import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('database.sqlite');

try {
  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      departments TEXT,
      projectLead TEXT,
      teamMembers TEXT,
      liaisonDepartments TEXT,
      status TEXT,
      currentUpdate TEXT,
      tripInfo TEXT,
      meetingInfo TEXT,
      visibleToChairman INTEGER DEFAULT 1,
      deletedAt TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      sortOrder INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT,
      profile TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS liaison_departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT
    );
  `);

  // Load tasks
  const tasksData = JSON.parse(fs.readFileSync('restore_data.json', 'utf8'));
  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (
      id, name, description, departments, projectLead, teamMembers, 
      liaisonDepartments, status, currentUpdate, tripInfo, meetingInfo, 
      deletedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const task of tasksData) {
      insertTask.run(
        task.id.toString(),
        task.name,
        task.description,
        JSON.stringify(task.departments),
        task.projectLead,
        JSON.stringify(task.teamMembers),
        JSON.stringify(task.liaisonDepartments),
        task.status,
        task.currentUpdate,
        JSON.stringify(task.tripInfo),
        JSON.stringify(task.meetingInfo),
        task.deletedAt,
        task.createdAt,
        task.updatedAt
      );
    }
  })();
  console.log(`Restored ${tasksData.length} tasks.`);

  // Seed Members
  const members = [
    { name: "刘海涛", department: "家族办公室" },
    { name: "谢佩琪", department: "投资部" },
    { name: "刘希", department: "法务部" },
    { name: "杨智鑫", department: "投资者关系部" },
    { name: "黄靖", department: "法务部" },
    { name: "刘晨", department: "投资部" },
    { name: "贾涵涛", department: "投资部" },
    { name: "苏丽玲", department: "投资部" },
    { name: "黄玲玲", department: "投资者关系部" },
    { name: "陈倩", department: "法务部" }
  ];

  const insertMember = db.prepare('INSERT OR IGNORE INTO members (id, name, department, createdAt) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    members.forEach(m => {
      const id = Math.random().toString(36).substr(2, 9);
      insertMember.run(id, m.name, m.department, new Date().toISOString());
    });
  })();
  console.log('Restored members.');

  // Seed Liaison Depts
  const depts = ["投资部", "法务部", "财务部", "工程部", "AI部门", "美国工厂"];
  const insertDept = db.prepare('INSERT OR IGNORE INTO liaison_departments (id, name, createdAt) VALUES (?, ?, ?)');
  db.transaction(() => {
    depts.forEach(d => {
      const id = Math.random().toString(36).substr(2, 9);
      insertDept.run(id, d, new Date().toISOString());
    });
  })();
  console.log('Restored liaison departments.');

} catch (err) {
  console.error('Restoration failed:', err);
}
