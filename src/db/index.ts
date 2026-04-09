import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sqlite.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

// Initialize database
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    departments TEXT,
    projectLead TEXT,
    teamMembers TEXT,
    liaisonDepartments TEXT,
    status TEXT DEFAULT 'pending',
    currentUpdate TEXT,
    tripInfo TEXT,
    deletedAt INTEGER,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    profile TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS liaison_departments_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
`);

// Seed liaison departments if empty
const count = sqlite.prepare('SELECT COUNT(*) as count FROM liaison_departments_config').get() as { count: number };
if (count.count === 0) {
  const defaultDepts = [
    '投资部', '法务部', '审计部', '家族办公室', '投资者关系部',
    '财务部', '人力资源部', '运营中心', '国内营销', '加盟部',
    '出口事业部', '海外电商', '联营中心', '总裁办', '审核办',
    '基建部', '反贪腐和调查部', '生产中心', '瑞迈', '美国工厂',
    '越南工厂', '墨西哥工厂', '西安工厂', '天津工厂', '吴江工厂',
    '武汉工厂', '重庆工厂', '元开酒店', '前海酒店', '井木装饰'
  ];
  
  const insert = sqlite.prepare('INSERT INTO liaison_departments_config (name) VALUES (?)');
  const insertMany = sqlite.transaction((depts: string[]) => {
    for (const dept of depts) insert.run(dept);
  });
  insertMany(defaultDepts);
}
