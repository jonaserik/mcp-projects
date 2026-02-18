import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from 'zod';
import path from 'path';

describe('MCP Server Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: ["dist/index.js"],
      stderr: "pipe" // Capture stderr to verify no leaks? Or just let it flow.
    });
    client = new Client(
      { name: "test-client", version: "1.0.0" }, 
      { capabilities: {} }
    );
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('should list projects with pagination', async () => {
    const result = await client.callTool({
      name: "list_projects",
      arguments: { limit: 10, offset: 0 }
    });

    // @ts-ignore
    const content = JSON.parse(result.content[0].text);
    
    // Define expected schema
    const ProjectSchema = z.object({
        name: z.string(),
        path: z.string(),
    }).passthrough();

    const ResponseSchema = z.object({
        data: z.array(ProjectSchema),
        pagination: z.object({
            limit: z.number(),
            offset: z.number(),
            total: z.number(),
            has_more: z.boolean()
        })
    });

    // Validate structure (Hardening)
    expect(() => ResponseSchema.parse(content)).not.toThrow();
    expect(content.pagination.limit).toBe(10);
  });

  it('should validate tool arguments', async () => {
    const result = await client.callTool({
        name: "list_projects",
        // @ts-ignore
        arguments: { limit: "invalid" }
    });
    expect(result.isError).toBe(true);
  });

  it('should read project summary resource', async () => {
    const resource = await client.readResource({ uri: "projects://summary" });
    // @ts-ignore
    const content = JSON.parse(resource.contents[0].text);
    
    const SummarySchema = z.object({
        total_projects: z.number(),
        active_last_7_days: z.number(),
        generated_at: z.string().datetime()
    });

    expect(() => SummarySchema.parse(content)).not.toThrow();
  });

  it('should list and get prompts', async () => {
    // Static content is perfect for snapshots
    const prompts = await client.listPrompts();
    prompts.prompts.sort((a, b) => a.name.localeCompare(b.name));
    expect(prompts).toMatchSnapshot();

    const promptResult = await client.getPrompt({
        name: "analyze-projects",
        arguments: { path: "/test/path" }
    });
    
    expect(promptResult).toMatchSnapshot();
  });
});
