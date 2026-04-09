import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { db } from './src/db';
import { tasks, members, liaisonDepartmentsConfig } from './src/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/tasks', async (req, res) => {
    try {
      const allTasks = await db.select().from(tasks).where(isNull(tasks.deletedAt)).orderBy(desc(tasks.createdAt));
      res.json(allTasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const newTask = await db.insert(tasks).values(req.body).returning();
      res.json(newTask[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:id', async (req, res) => {
    try {
      const { id, createdAt, deletedAt, ...updateData } = req.body;
      const updatedTask = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedTask[0]);
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const deletedTask = await db.update(tasks)
        .set({ deletedAt: new Date() })
        .where(eq(tasks.id, parseInt(req.params.id)))
        .returning();
      res.json(deletedTask[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  app.get('/api/tasks/trash', async (req, res) => {
    try {
      const { isNotNull } = await import('drizzle-orm');
      const trashedTasks = await db.select().from(tasks).where(isNotNull(tasks.deletedAt)).orderBy(desc(tasks.deletedAt));
      res.json(trashedTasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trashed tasks' });
    }
  });

  app.delete('/api/tasks/:id/permanent', async (req, res) => {
    try {
      await db.delete(tasks).where(eq(tasks.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to permanently delete task' });
    }
  });

  app.post('/api/tasks/:id/restore', async (req, res) => {
    try {
      const restoredTask = await db.update(tasks)
        .set({ deletedAt: null })
        .where(eq(tasks.id, parseInt(req.params.id)))
        .returning();
      res.json(restoredTask[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to restore task' });
    }
  });

  app.get('/api/members', async (req, res) => {
    try {
      const allMembers = await db.select().from(members).orderBy(desc(members.createdAt));
      res.json(allMembers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  app.post('/api/members', async (req, res) => {
    try {
      const newMember = await db.insert(members).values(req.body).returning();
      res.json(newMember[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create member' });
    }
  });

  app.put('/api/members/:id', async (req, res) => {
    try {
      const { id, createdAt, ...updateData } = req.body;
      const updatedMember = await db.update(members)
        .set(updateData)
        .where(eq(members.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedMember[0]);
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  });

  app.delete('/api/members/:id', async (req, res) => {
    try {
      await db.delete(members).where(eq(members.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete member' });
    }
  });

  app.get('/api/liaison-departments', async (req, res) => {
    try {
      const depts = await db.select().from(liaisonDepartmentsConfig);
      res.json(depts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch liaison departments' });
    }
  });

  app.post('/api/liaison-departments', async (req, res) => {
    try {
      const newDept = await db.insert(liaisonDepartmentsConfig).values(req.body).returning();
      res.json(newDept[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create liaison department' });
    }
  });

  app.delete('/api/liaison-departments/:id', async (req, res) => {
    try {
      await db.delete(liaisonDepartmentsConfig).where(eq(liaisonDepartmentsConfig.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete liaison department' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
