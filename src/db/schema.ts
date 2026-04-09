import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  departments: text('departments', { mode: 'json' }).$type<string[]>(),
  projectLead: text('projectLead'),
  teamMembers: text('teamMembers', { mode: 'json' }).$type<string[]>(),
  liaisonDepartments: text('liaisonDepartments', { mode: 'json' }).$type<string[]>(),
  status: text('status').default('pending'),
  currentUpdate: text('currentUpdate'),
  tripInfo: text('tripInfo', { mode: 'json' }).$type<any>(),
  deletedAt: integer('deletedAt', { mode: 'timestamp' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  department: text('department').notNull(),
  profile: text('profile', { mode: 'json' }).$type<any>(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const liaisonDepartmentsConfig = sqliteTable('liaison_departments_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});
