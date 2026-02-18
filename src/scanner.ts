import { promises as fs } from 'fs';
import path from 'path';
import { Project, upsertProject } from './db.js';
import { getGitInfo } from './git.js';
import { isGitRepo, detectTechStack } from './lib/fs.js';
import { createLogger } from './lib/logger.js';
import { validatePath } from './lib/security.js';

const logger = createLogger('Scanner');

export async function getProjectDescription(dirPath: string): Promise<string | null> {
  try {
    const readmePath = path.join(dirPath, 'README.md');
    // Try Uppercase first, then lowercase if needed, or just standard names
    // For simplicity, let's try standard 'README.md'
    try {
        await fs.access(readmePath);
    } catch {
        return null;
    }

    const content = await fs.readFile(readmePath, 'utf-8');
    const lines = content.split('\n');
    
    // Find first non-empty line that isn't a title
    let description = null;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('![')) {
            description = trimmed;
            break;
        }
    }
    return description;
  } catch (error) {
    return null;
  }
}

export async function scanDirectory(rootPath: string): Promise<Project[]> {
  const projects: Project[] = [];
  
  // Validate path before scanning
  // We allow scanning anything under the user's home directory as a safe default for local tools
  // In a stricter environment, this should be configurable via env vars
  await validatePath(rootPath, [process.env.HOME || process.cwd()]);

  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const projectPath = path.join(rootPath, entry.name);
        
        // Basic heuristic: it's a project if it has code/config files or is a git repo
        const isGit = await isGitRepo(projectPath);
        const techStack = await detectTechStack(projectPath);
        
        if (isGit || techStack) {
          // Deep inspection
          const description = await getProjectDescription(projectPath);
          const gitInfo = isGit ? await getGitInfo(projectPath) : { remoteUrl: null, branch: null, syncStatus: null };

          const project: Project = {
            name: entry.name,
            path: projectPath,
            status: 'active',
            is_git: isGit,
            tech_stack: techStack,
            last_scanned: new Date().toISOString(),
            description: description,
            remote_url: gitInfo.remoteUrl,
            branch_name: gitInfo.branch,
            sync_status: gitInfo.syncStatus
          };
          
          upsertProject(project);
          projects.push(project);
          logger.info(`Scanned project: ${entry.name} (${techStack}, ${gitInfo.syncStatus})`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error scanning directory ${rootPath}`, error);
    throw error;
  }
  
  return projects;
}
