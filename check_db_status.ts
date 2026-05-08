import Database from 'better-sqlite3';

try {
  const db = new Database('database.sqlite');
  const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get() as {count: number};
  const memberCount = db.prepare('SELECT count(*) as count FROM members').get() as {count: number};
  const deptCount = db.prepare('SELECT count(*) as count FROM liaison_departments').get() as {count: number};
  
  console.log('Database Status:');
  console.log('- Total tasks:', taskCount.count);
  console.log('- Total members:', memberCount.count);
  console.log('- Total depts:', deptCount.count);
  
} catch (err) {
  console.error('Database check failed:', err);
}
