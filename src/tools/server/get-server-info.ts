import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';
import { type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { type EmptyInput, Tool } from '../tool.js';

export const GetServerInfoOutputSchema = z.strictObject({
    serverUrl: z.string().describe('The Mattermost server URL'),
    version: z.string().describe('The Mattermost server version'),
});
export type GetServerInfoOutput = z.infer<typeof GetServerInfoOutputSchema>;

export class GetServerInfoTool extends Tool<
    EmptyInput,
    GetServerInfoOutput,
    StructuredToolResult<GetServerInfoOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_server_info',
            description: 'Get Mattermost server information including URL and version.',
            inputSchema: z.strictObject({}),
            outputSchema: GetServerInfoOutputSchema,
            handler: getServerInfo,
        });
    }
}

async function getServerInfo(client: MattermostClient): Promise<StructuredToolResult<GetServerInfoOutput>> {
    // Get server URL and version from the client
    const serverUrl = client.getUrl();
    const version = client.getServerVersion();

    if (!version) {
        throw new Error('Server version is not available');
    }

    const output: GetServerInfoOutput = {
        serverUrl,
        version,
    };

    return toolStructuredResult(output);
}
