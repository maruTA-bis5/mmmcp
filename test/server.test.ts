import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { describe, expect, it } from 'vitest';

import type { Config } from '../src/config.js';
import { MattermostClient } from '../src/mattermost/client.js';
import { createServer } from '../src/server.js';

describe('MCP server instructions', () => {
    it('returns the configured Mattermost URL and routing scope during initialization', async () => {
        const mattermostUrl = 'https://example.com/mattermost';
        const config: Config = {
            mattermost: { url: mattermostUrl, auth: { token: 'test-token' } },
            readonly: false,
            logLevel: 'error',
        };
        const server = createServer(new MattermostClient({ url: mattermostUrl, token: 'test-token' }), config);
        const handler = createMcpHandler(() => server);
        const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
            fetch: (url, init) => handler.fetch(new Request(url, init)),
        });
        const client = new Client({ name: 'instructions-test-client', version: '1.0.0' });

        try {
            await client.connect(transport);

            const instructions = client.getInstructions();
            expect(instructions).toContain(mattermostUrl);
            expect(instructions).toContain('same origin (scheme, host, and port)');
            expect(instructions).toContain('path is exactly the configured path or is below it');
            expect(instructions).toContain('/mattermost2');
            expect(instructions).toContain('existing tools');
            expect(instructions).toContain('do not enforce it');
        } finally {
            await client.close();
            await transport.close();
        }
    });
});
