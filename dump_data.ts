import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('database.sqlite');
const tasks = db.prepare('SELECT * FROM tasks').all();
const parsedTasks = tasks.map((row: any) => ({
  ...row,
  departments: JSON.parse(row.departments || '[]'),
  teamMembers: JSON.parse(row.teamMembers || '[]'),
  liaisonDepartments: JSON.parse(row.liaisonDepartments || '[]'),
  visibleToChairman: row.visibleToChairman === 1,
  tripInfo: row.tripInfo ? JSON.parse(row.tripInfo) : null,
  meetingInfo: row.meetingInfo ? JSON.parse(row.meetingInfo) : null
}));

fs.writeFileSync('src/seedData.json', JSON.stringify(parsedTasks, null, 2));
console.log('Successfully backed up database to src/seedData.json');
