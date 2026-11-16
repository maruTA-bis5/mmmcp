import { McpServer } from '@modelcontextprotocol/server';

import type { Config } from './config.js';
import * as packageInfo from './generated/package-info.json' with { type: 'json' };
import type { MattermostClient } from './mattermost/client.js';
import { registerTools } from './modes/mode-guard.js';

export function createServer(client: MattermostClient, config: Config): McpServer {
    const serverInfo = {
        name: 'mmmcp',
        version: packageInfo.default.version,
    };
    client.setUserAgent(`${serverInfo.name}/${serverInfo.version} (Node.js ${process.version})`);

    const server = new McpServer(
        {
            name: serverInfo.name,
            version: serverInfo.version,
        },
        {
            instructions: createServerInstructions(config.mattermost.url),
        },
    );

    registerTools(server, client, config.readonly);

    if (config.logLevel === 'debug') {
        console.error('Mattermost MCP server connected over stdio.');
    }
    return server;
}

function createServerInstructions(mattermostUrl: string): string {
    return [
        `This server is connected to Mattermost at ${mattermostUrl}.`,
        'Use this server only for URLs with the same origin (scheme, host, and port) whose path is exactly the configured path or is below it.',
        'A path below the configured path must have a slash boundary after that path; sibling paths that only share a prefix are outside scope (for example, /mattermost2 when the configured path is /mattermost).',
        "Use this server's existing tools when they support the requested operation.",
        'These instructions describe intended routing and do not enforce it or guarantee client/model compliance.',
    ].join(' ');
}
