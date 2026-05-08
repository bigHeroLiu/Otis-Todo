import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export function seedDatabaseIfEmpty(db: Database.Database) {
  try {
    const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get() as { count: number };
    if (taskCount.count > 0) {
      console.log('Database already populated. Skipping seed.');
      return;
    }

    console.log('Database is empty. Populating with permanent seed data...');
    const seedPath = path.join(process.cwd(), 'src/seedData.json');
    if (!fs.existsSync(seedPath)) {
      console.warn('Seed data file not found at:', seedPath);
      return;
    }

    const tasksData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    
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
        const id = Math.random().toString(36).substring(2, 11);
        insertMember.run(id, m.name, m.department, new Date().toISOString());
      });
    })();

    // Seed Depts
    const depts = ["投资部", "法务部", "财务部", "工程部", "AI部门", "美国工厂"];
    const insertDept = db.prepare('INSERT OR IGNORE INTO liaison_departments (id, name, createdAt) VALUES (?, ?, ?)');
    db.transaction(() => {
      depts.forEach(d => {
        const id = Math.random().toString(36).substring(2, 11);
        insertDept.run(id, d, new Date().toISOString());
      });
    })();

    // Seed Tasks
    const insertTask = db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, name, description, departments, projectLead, teamMembers, 
        liaisonDepartments, status, currentUpdate, tripInfo, meetingInfo, 
        deletedAt, visibleToChairman, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          task.tripInfo ? JSON.stringify(task.tripInfo) : null,
          task.meetingInfo ? JSON.stringify(task.meetingInfo) : null,
          task.deletedAt || null,
          (task.visibleToChairman !== false) ? 1 : 0,
          task.createdAt || null,
          task.updatedAt || null
        );
      }
    })();

    console.log(`Successfully seeded ${tasksData.length} tasks!`);
  } catch (err) {
    console.error('Failed to seed database:', err);
  }
}
