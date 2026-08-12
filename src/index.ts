#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { parseConfig } from './config.js';
import * as packageInfo from './generated/package-info.json' with { type: 'json' };
import { MattermostClient } from './mattermost/client.js';
import { registerTools } from './modes/mode-guard.js';

const LOGOUT_TIMEOUT_MS = 5000;

function createServer(client: MattermostClient): McpServer {
    const serverInfo = {
        name: 'mmmcp',
        version: packageInfo.default.version,
    };
    client.setUserAgent(`${serverInfo.name}/${serverInfo.version} (Node.js ${process.version})`);

    const server = new McpServer({
        name: serverInfo.name,
        version: serverInfo.version,
    });

    registerTools(server, client, config.readonly);

    if (config.logLevel === 'debug') {
        console.error('Mattermost MCP server connected over stdio.');
    }
    return server;
}

const config = parseConfig();
const client = await MattermostClient.create(config.mattermost);
let shuttingDown = false;

async function shutdown(exitCode?: number): Promise<void> {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    try {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
            await Promise.race([
                client.logout(),
                new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error('Mattermost logout timed out.'));
                    }, LOGOUT_TIMEOUT_MS);
                }),
            ]);
        } finally {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        }
    } catch (error) {
        console.error('Failed to log out from Mattermost.', error);
    } finally {
        if (exitCode !== undefined) {
            process.exitCode = exitCode;
        }
    }
}

process.once('SIGINT', () => {
    void shutdown(130);
});
process.once('SIGTERM', () => {
    void shutdown(143);
});
process.once('beforeExit', () => {
    void shutdown();
});

serveStdio(() => createServer(client));
