#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initDatabase, closeDatabase, getDatabase } from "./db.js";
import { createLogger } from "./lib/logger.js";

const logger = createLogger('Main');

// Initialize database before starting server
try {
  initDatabase();
} catch (error) {
  logger.error("Failed to initialize database", error);
  process.exit(1);
}

// Create MCP server instance
const server = new McpServer({
  name: "mcp-projects",
  version: "1.0.0",
});

import { scanDirectory } from "./scanner.js";
import { analyzeProjectActivity } from "./activity.js";

// Tool to scan directory for projects
server.tool(
  "scan_projects",
  "Scans a directory for projects (Node,.js, Python, etc) and updates the database.",
  {
    root_path: z.string().optional().describe("Root path to scan. Defaults to current working directory.")
  },
  async ({ root_path }) => {
    const root = root_path || process.cwd();
    try {
      const projects = await scanDirectory(root);
      
      // Trigger activity analysis for all scanned projects
      logger.info(`Starting activity analysis for ${projects.length} projects...`);
      for (const project of projects) {
          await analyzeProjectActivity(project.path);
      }
      
      return {
        content: [{ 
          type: "text", 
          text: `Scanned and analyzed ${projects.length} projects in ${root}:\n${projects.map(p => `- ${p.name} (${p.tech_stack})`).join('\n')}` 
        }]
      };
    } catch (error) {
       // Check if error is an instance of Error
       const errorMessage = error instanceof Error ? error.message : String(error);
       logger.error(`Error scanning directory`, error);
       return {
        content: [{ type: "text", text: `Error scanning directory: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool to manually trigger activity analysis
server.tool(
    "analyze_project_activity",
    "Analyzes activity (git commits, file modifications) for a specific project or all projects.",
    {
        project_path: z.string().optional().describe("Path to the project to analyze. If omitted, analyzes all tracked projects.")
    },
    async ({ project_path }) => {
        const db = getDatabase();
        if (project_path) {
            await analyzeProjectActivity(project_path);
            return {
                content: [{ type: "text", text: `Analyzed activity for project at ${project_path}` }]
            };
        } else {
            const projects = db.prepare('SELECT path FROM projects').all() as { path: string }[];
            for (const p of projects) {
                await analyzeProjectActivity(p.path);
            }
            return {
                content: [{ type: "text", text: `Analyzed activity for all ${projects.length} projects.` }]
            };
        }
    }
);

// Tool to list projects
server.tool(
  "list_projects",
  "List all tracked projects from the database.",
  {},
  async () => {
    const db = getDatabase();
    const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();
    return {
      content: [{ type: "text", text: JSON.stringify(projects, null, 2) }]
    };
  }
);

// Tool to get project health (Git status)
server.tool(
  "get_project_health",
  "Returns a health check of projects, focusing on git synchronization status.",
  {},
  async () => {
    const db = getDatabase();

    // Use an interface for the query result
    interface UnsyncedProject {
      name: string;
      path: string;
      sync_status: string;
      branch_name: string | null;
    }

    const unsynced = db.prepare(`
        SELECT name, path, sync_status, branch_name 
        FROM projects 
        WHERE is_git = 1 
          AND sync_status NOT IN ('Synced', 'Unknown', 'NoRemote', 'null') 
          AND sync_status IS NOT NULL
        ORDER BY name
    `).all() as UnsyncedProject[];
    
    const count = unsynced.length;
    
    let report = `Project Health Report\n`;
    report += `=====================\n`;
    report += `Projects requiring attention: ${count}\n\n`;
    
    if (count === 0) {
        report += "All git projects are in sync with their remotes!";
    } else {
        // @ts-ignore
        for (const p of unsynced) {
            report += `- [${p.name}] (${p.branch_name}): ${p.sync_status}\n`;
        }
    }

    return {
      content: [{ type: "text", text: report }]
    };
  }
);

// Tool to get engagement report
server.tool(
    "get_engagement_report",
    "Returns a report of Most Active and Dormant projects.",
    {},
    async () => {
        const db = getDatabase();

        // Most Active: Projects with activity in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr = sevenDaysAgo.toISOString().split('T')[0];

        interface ActiveProject {
            name: string;
            total_changes: number;
            last_activity: string;
        }

        const mostActive = db.prepare(`
            SELECT p.name, SUM(s.changes_count) as total_changes, p.last_activity_date as last_activity
            FROM projects p
            JOIN activity_stats s ON p.id = s.project_id
            WHERE s.date >= ?
            GROUP BY p.id
            ORDER BY total_changes DESC
            LIMIT 10
        `).all(dateStr) as ActiveProject[];

        // Dormant: Last activity > 30 days ago OR null
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        interface DormantProject {
            name: string;
            last_activity_date: string | null;
            path: string;
        }

        const dormant = db.prepare(`
            SELECT name, last_activity_date, path
            FROM projects
            WHERE (last_activity_date < ? OR last_activity_date IS NULL)
            ORDER BY last_activity_date ASC
            LIMIT 20
        `).all(thirtyDaysAgo.toISOString()) as DormantProject[];

        let report = "# Engagement Report\n\n";
        
        report += "## Most Active (Last 7 Days)\n";
        if (mostActive.length === 0) {
            report += "No activity recorded in the last 7 days.\n";
        } else {
            for (const p of mostActive) {
                report += `- **${p.name}**: ${p.total_changes} changes (Last active: ${p.last_activity})\n`;
            }
        }
        report += "\n";

        report += "## Dormant Projects (No activity > 30 days)\n";
        if (dormant.length === 0) {
            report += "No dormant projects found.\n";
        } else {
            for (const p of dormant) {
                const date = p.last_activity_date ? new Date(p.last_activity_date).toLocaleDateString() : "Never";
                report += `- **${p.name}**: ${date}\n`;
            }
        }

        return {
            content: [{ type: "text", text: report }]
        };
    }
);

async function main() {
  // Create STDIO transport for communication
  const transport = new StdioServerTransport();

  // Connect server to transport (handles handshake automatically)
  await server.connect(transport);

  logger.info("MCP server running on STDIO");
}

function gracefulShutdown() {
  logger.info("Received shutdown signal. Closing server and database...");
  server.close();
  closeDatabase();
  process.exit(0);
}

// Handle shutdown signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
