import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export type SyncStatus = 'Synced' | 'Ahead' | 'Behind' | 'Diverged' | 'Unknown' | 'NoRemote';

export interface GitInfo {
  remoteUrl: string | null;
  branch: string | null;
  syncStatus: SyncStatus;
}

export async function getGitInfo(dirPath: string): Promise<GitInfo> {
  try {
    const gitOptions = { cwd: dirPath, timeout: 5000 }; // 5s timeout

    // 1. Get Branch
    let branch: string | null = null;
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', gitOptions);
      branch = stdout.trim();
    } catch {
      // Not a git repo or no commits yet
      return { remoteUrl: null, branch: null, syncStatus: 'Unknown' };
    }

    // 2. Get Remote URL
    let remoteUrl: string | null = null;
    try {
      const { stdout } = await execAsync('git remote get-url origin', gitOptions);
      remoteUrl = stdout.trim();
    } catch {
      // No remote origin
      return { remoteUrl: null, branch, syncStatus: 'NoRemote' };
    }

    // 3. Check Sync Status
    let syncStatus: SyncStatus = 'Unknown';
    try {
      // Fetch specifically from origin for the current branch
      await execAsync(`git fetch origin ${branch}`, { ...gitOptions, timeout: 10000 });
      
      const { stdout: localHash } = await execAsync(`git rev-parse HEAD`, gitOptions);
      const { stdout: remoteHash } = await execAsync(`git rev-parse origin/${branch}`, gitOptions);
      const { stdout: baseHash } = await execAsync(`git merge-base HEAD origin/${branch}`, gitOptions);

      const local = localHash.trim();
      const remote = remoteHash.trim();
      const base = baseHash.trim();

      if (local === remote) {
        syncStatus = 'Synced';
      } else if (local === base) {
        syncStatus = 'Behind';
      } else if (remote === base) {
        syncStatus = 'Ahead';
      } else {
        syncStatus = 'Diverged';
      }
    } catch (error) {
       // Could fail if no network or upstream not set
       // Try a simpler check if fetch failed, or just return Unknown
       console.error(`Failed to check sync status for ${dirPath}:`, error);
    }

    return { remoteUrl, branch, syncStatus };

  } catch (error) {
    console.error(`Error processing git info for ${dirPath}:`, error);
    return { remoteUrl: null, branch: null, syncStatus: 'Unknown' };
  }
}
