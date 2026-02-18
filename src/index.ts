#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initDatabase, closeDatabase, getDatabase } from "./db.js";
import { createLogger } from "./lib/logger.js";
import { withErrorHandling } from "./lib/errors.js";

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
  withErrorHandling("scan_projects", async ({ root_path }) => {
    const root = root_path || process.cwd();
    // validatePath is called inside scanDirectory
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
  })
);

// Tool to manually trigger activity analysis
server.tool(
    "analyze_project_activity",
    "Analyzes activity (git commits, file modifications) for a specific project or all projects.",
    {
        project_path: z.string().optional().describe("Path to the project to analyze. If omitted, analyzes all tracked projects.")
    },
    withErrorHandling("analyze_project_activity", async ({ project_path }) => {
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
    })
);

// Tool to list projects (Paginated)
server.tool(
  "list_projects",
  "List tracked projects from the database with pagination.",
  {
    limit: z.number().optional().default(20).describe("Number of projects to return (default: 20, max: 50)"),
    offset: z.number().optional().default(0).describe("Offset for pagination (default: 0)")
  },
  withErrorHandling("list_projects", async ({ limit, offset }) => {
    const db = getDatabase();
    // Enforce max limit for performance
    const safeLimit = Math.min(limit, 50);
    
    const projects = db.prepare('SELECT * FROM projects ORDER BY name LIMIT ? OFFSET ?').all(safeLimit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
            data: projects,
            pagination: {
                limit: safeLimit,
                offset,
                total: total.count,
                has_more: offset + safeLimit < total.count
            }
        }, null, 2) 
      }]
    };
  })
);

// Tool to get project health (Git status)
server.tool(
  "get_project_health",
  "Returns a health check of projects, focusing on git synchronization status.",
  {},
  withErrorHandling("get_project_health", async () => {
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
  })
);

// Tool to get engagement report
server.tool(
    "get_engagement_report",
    "Returns a report of Most Active and Dormant projects.",
    {},
    withErrorHandling("get_engagement_report", async () => {
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
    })
);

// Resource: Project Summary
server.resource(
  "projects-summary",
  "projects://summary",
  async (uri: URL) => {
    const db = getDatabase();
    const total = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const active = db.prepare(`
        SELECT COUNT(DISTINCT project_id) as count 
        FROM activity_stats 
        WHERE date >= date('now', '-7 days')
    `).get() as { count: number };

    const summary = {
        total_projects: total.count,
        active_last_7_days: active.count,
        generated_at: new Date().toISOString()
    };

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(summary, null, 2)
      }]
    };
  }
);

// Prompt: Analyze Projects
server.prompt(
    "analyze-projects",
    "Analyze the projects in the current workspace.",
    {
        path: z.string().optional().describe("Optional path to analyze")
    },
    ({ path }) => {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `Please analyze the projects in ${path || "the current directory"}. First, list the projects to get an overview, then scan them to update the database, and finally provide an engagement report.`
                    }
                }
            ]
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
