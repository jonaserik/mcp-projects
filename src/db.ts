import { db, BaseDatabase } from './lib/database.js';
import type { Database } from './lib/database.js';

export type { Database };

export interface Project {
  id?: number;
  name: string;
  path: string;
  status: string;
  is_git: boolean;
  tech_stack: string | null;
  last_scanned: string;
  description?: string | null;
  remote_url?: string | null;
  sync_status?: string | null;
  branch_name?: string | null;
  last_activity_date?: string | null;
}

export interface ActivityStat {
  id?: number;
  project_id: number;
  date: string;
  changes_count: number;
}

export function upsertProject(project: Project) {
  const sqlite = getDatabase();
  const stmt = sqlite.prepare(`
    INSERT INTO projects (
      name, path, status, is_git, tech_stack, last_scanned,
      description, remote_url, sync_status, branch_name, last_activity_date
    )
    VALUES (
      @name, @path, @status, @is_git, @tech_stack, @last_scanned,
      @description, @remote_url, @sync_status, @branch_name, @last_activity_date
    )
    ON CONFLICT(path) DO UPDATE SET
      name = excluded.name,
      status = excluded.status,
      is_git = excluded.is_git,
      tech_stack = excluded.tech_stack,
      last_scanned = excluded.last_scanned,
      description = excluded.description,
      remote_url = excluded.remote_url,
      sync_status = excluded.sync_status,
      branch_name = excluded.branch_name,
      last_activity_date = excluded.last_activity_date
  `);
  stmt.run({
    ...project,
    is_git: project.is_git ? 1 : 0,
    description: project.description || null,
    remote_url: project.remote_url || null,
    sync_status: project.sync_status || null,
    branch_name: project.branch_name || null,
    last_activity_date: project.last_activity_date || null
  });
}

export function insertActivityStats(projectId: number, stats: { date: string, count: number }[]) {
  const sqlite = getDatabase();
  const insert = sqlite.prepare(`
    INSERT INTO activity_stats (project_id, date, changes_count)
    VALUES (@project_id, @date, @count)
    ON CONFLICT(project_id, date) DO UPDATE SET
      changes_count = excluded.changes_count
  `);

  const insertMany = sqlite.transaction((stats: { date: string, count: number }[]) => {
    for (const stat of stats) {
      insert.run({
        project_id: projectId,
        date: stat.date,
        count: stat.count
      });
    }
  });

  insertMany(stats);
}

export function getProjectByPath(path: string): Project | undefined {
  const sqlite = getDatabase();
  // @ts-ignore
  return sqlite.prepare('SELECT * FROM projects WHERE path = ?').get(path);
}

function migrateTable(sqlite: Database.Database) {
    const columns = [
        'description TEXT',
        'remote_url TEXT',
        'sync_status TEXT',
        'branch_name TEXT',
        'last_activity_date DATETIME' 
    ];
    
    for (const col of columns) {
        try {
            sqlite.prepare(`ALTER TABLE projects ADD COLUMN ${col}`).run();
        } catch (error) {
            // Column likely exists, ignore
        }
    }
}

export function initDatabase() {
  db.init(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active',
      is_git BOOLEAN DEFAULT 0,
      tech_stack TEXT,
      last_scanned DATETIME,
      description TEXT,
      remote_url TEXT,
      sync_status TEXT,
      branch_name TEXT,
      last_activity_date DATETIME
    );

    CREATE TABLE IF NOT EXISTS decision_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      decision_text TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS activity_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      date TEXT NOT NULL,
      changes_count INTEGER DEFAULT 0,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      UNIQUE(project_id, date)
    );
  `, migrateTable);
}

export function getDatabase(): Database.Database {
  return db.get();
}

export function closeDatabase() {
  db.close();
}
