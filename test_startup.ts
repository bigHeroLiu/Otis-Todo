import express from 'express';
import Database from 'better-sqlite3';

const app = express();
try {
  const db = new Database('test.sqlite');
  console.log('Database initialized successfully');
  app.get('/health', (req, res) => res.send('ok'));
  const server = app.listen(3001, '0.0.0.0', () => {
    console.log('Test server listening on 3001');
    process.exit(0);
  });
} catch (err) {
  console.error('Test server failed:', err);
  process.exit(1);
}
