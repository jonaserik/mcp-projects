import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe('Golden Protocol Test', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: ["dist/index.js"],
      stderr: "ignore" 
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

  it('should list tools and match snapshot', async () => {
    const tools = await client.listTools();
    // Sort tools by name to ensure deterministic snapshots
    tools.tools.sort((a, b) => a.name.localeCompare(b.name));
    expect(tools).toMatchSnapshot();
  });

  it('should list resources and match snapshot', async () => {
    try {
      const resources = await client.listResources();
      resources.resources.sort((a, b) => a.uri.localeCompare(b.uri));
      expect(resources).toMatchSnapshot();
    } catch (error: any) {
      if (error?.code === -32601) {
        expect('Method not found (Capability disabled)').toMatchSnapshot();
      } else {
        throw error;
      }
    }
  });

  it('should list prompts and match snapshot', async () => {
    try {
      const prompts = await client.listPrompts();
      prompts.prompts.sort((a, b) => a.name.localeCompare(b.name));
      expect(prompts).toMatchSnapshot();
    } catch (error: any) {
      if (error?.code === -32601) {
        expect('Method not found (Capability disabled)').toMatchSnapshot();
      } else {
        throw error;
      }
    }
  });
});
