import { exec } from 'child_process';
import util from 'util';
import { promises as fs, Stats } from 'fs';
import path from 'path';
import { Project, upsertProject, getProjectByPath, insertActivityStats } from './db.js';

const execAsync = util.promisify(exec);

async function getGitActivity(dirPath: string): Promise<{ lastActivity: string | null, stats: { date: string, count: number }[] }> {
  try {
    // Check if it's actually a git repo first
    try {
        await fs.access(path.join(dirPath, '.git'));
    } catch {
        return { lastActivity: null, stats: [] };
    }

    const { stdout } = await execAsync('git log --since="30 days ago" --pretty=format:"%ad" --date=short', { cwd: dirPath });
    const lines = stdout.split('\n').filter(line => line.trim() !== '');
    
    let lastActivity: string | null = null;
    let stats: { date: string, count: number }[] = [];

    if (lines.length > 0) {
        const statsMap = new Map<string, number>();
        for (const date of lines) {
            statsMap.set(date, (statsMap.get(date) || 0) + 1);
        }
        stats = Array.from(statsMap.entries()).map(([date, count]) => ({ date, count }));
        // Sort descending to find latest
        stats.sort((a, b) => b.date.localeCompare(a.date));
        lastActivity = stats[0].date;
    } else {
        // No commits in last 30 days, try to find last commit date ever
        try {
            const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%ad" --date=short', { cwd: dirPath });
            const date = lastCommit.trim();
            if (date) {
                lastActivity = date;
            }
        } catch {
            // No commits at all?
        }
    }

    return { lastActivity, stats };

  } catch (error) {
    console.error(`Error getting git activity in ${dirPath}:`, error);
    return { lastActivity: null, stats: [] };
  }
}

async function getFileActivity(dirPath: string): Promise<string | null> {
    let latestMtimeMs = 0;

    async function walk(currentPath: string) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const name = entry.name;
                // Skip hidden files/dirs and node_modules, .git, dist, build
                if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'build' || name === 'coverage') {
                    continue;
                }
                
                const fullPath = path.join(currentPath, name);
                
                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const stats = await fs.stat(fullPath);
                    if (stats.mtimeMs > latestMtimeMs) {
                        latestMtimeMs = stats.mtimeMs;
                    }
                }
            }
        } catch (error) {
            // Ignore access errors
        }
    }

    await walk(dirPath);
    
    if (latestMtimeMs === 0) return null;
    return new Date(latestMtimeMs).toISOString();
}

export async function analyzeProjectActivity(projectPath: string) {
    const project = getProjectByPath(projectPath);
    if (!project) {
        console.error(`Project not found in DB for path: ${projectPath}`);
        return;
    }

    let lastActivityDate: string | null = null;
    let stats: { date: string, count: number }[] = [];

    if (project.is_git) {
        const gitData = await getGitActivity(project.path);
        lastActivityDate = gitData.lastActivity;
        stats = gitData.stats;
    } else {
        lastActivityDate = await getFileActivity(project.path);
    }

    // Update Project
    if (lastActivityDate) {
        // Only update if changed or new
        if (project.last_activity_date !== lastActivityDate) {
             upsertProject({
                ...project,
                last_activity_date: lastActivityDate
            });
            console.error(`Updated last activity for ${project.name}: ${lastActivityDate}`);
        }
    }

    // Update Stats
    if (stats.length > 0 && project.id) {
        insertActivityStats(project.id, stats);
        console.error(`Inserted ${stats.length} activity stats for ${project.name}`);
    }
}
