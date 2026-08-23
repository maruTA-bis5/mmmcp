import { type CallToolResult, Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as vitest from 'vitest';
import { MattermostClient } from '../../../src/mattermost/client.js';
import { registerTool, type Tool } from '../../../src/tools/tool.js';
import { getMattermostUrl, getUserAccessToken } from '../testShared.js';

function createMcpServer<I, T, O>(tool: Tool<I, T, O>): McpServer {
    const server = new McpServer({ name: `${tool.definition.name}-testserver`, version: '1.0.0' });
    registerTool(server, tool);
    return server;
}

export interface ToolTestContext {
    mcpClient: Client;
    mattermostClient: MattermostClient;
}

export function toolTest<I, T, O>(
    createToolFn: (mattermostClient: MattermostClient) => Tool<I, T, O>,
    testFn: (context: ToolTestContext) => void,
) {
    return () => {
        const context = {} as ToolTestContext;
        let transport: StreamableHTTPClientTransport | undefined;

        vitest.beforeAll(async () => {
            context.mattermostClient = await MattermostClient.create({
                url: getMattermostUrl(),
                auth: { token: getUserAccessToken() },
            });
            const tool = createToolFn(context.mattermostClient);
            const handler = createMcpHandler(() => createMcpServer(tool));
            transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
                fetch: (url, init) => handler.fetch(new Request(url, init)),
            });
            context.mcpClient = new Client(
                { name: `${tool.definition.name}-testclient`, version: '1.0.0' },
                { versionNegotiation: { mode: 'auto' } },
            );
            await context.mcpClient.connect(transport);
        });

        vitest.afterAll(async () => {
            await context.mcpClient.close();
            await transport?.close();
        });

        testFn(context);
    };
}

export function expectToolResultIsError(toolResult: CallToolResult): vitest.Assertion<boolean | undefined> {
    const c = toolResult.content?.find(c => c.type === 'text');
    if (c) {
        return vitest.expect(toolResult.isError, `Tool error: ${c.text}`);
    }
    return vitest.expect(toolResult.isError);
}
