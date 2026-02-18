import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from './logger.js';

const logger = createLogger('FS');

export async function isGitRepo(dirPath: string): Promise<boolean> {
    try {
        const gitPath = path.join(dirPath, '.git');
        const stats = await fs.stat(gitPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

export async function detectTechStack(dirPath: string): Promise<string | null> {
    try {
        const files = await fs.readdir(dirPath);
        const techStack: string[] = [];

        if (files.includes('package.json')) {
            try {
                const pkgJson = JSON.parse(await fs.readFile(path.join(dirPath, 'package.json'), 'utf-8'));
                if (pkgJson.dependencies?.next) techStack.push('Next.js');
                else if (pkgJson.dependencies?.react) techStack.push('React');
                else if (pkgJson.dependencies?.vue) techStack.push('Vue');
                else techStack.push('Node.js');
                
                if (pkgJson.devDependencies?.typescript || pkgJson.dependencies?.typescript) techStack.push('TypeScript');
            } catch (e) {
                logger.warn(`Failed to parse package.json in ${dirPath}`, e);
            }
        }
        
        if (files.includes('requirements.txt') || files.includes('pyproject.toml')) techStack.push('Python');
        if (files.includes('Cargo.toml')) techStack.push('Rust');
        if (files.includes('go.mod')) techStack.push('Go');
        if (files.includes('mcp.json') || files.some(f => f.startsWith('mcp-'))) techStack.push('MCP');

        return techStack.length > 0 ? techStack.join(', ') : null;
    } catch (error) {
        logger.error(`Error detecting tech stack in ${dirPath}`, error);
        return null;
    }
}
