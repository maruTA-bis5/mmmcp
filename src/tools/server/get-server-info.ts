import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';
import { type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { type EmptyInput, Tool } from '../tool.js';

export const GetServerInfoOutputSchema = z.strictObject({
    mattermost_url: z.string().describe('The Mattermost server URL'),
    server_version: z.string().describe('The Mattermost server version'),
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
    const serverUrl = client.api.getUrl();
    const version = client.getServerVersion();

    if (!version) {
        throw new Error(`Could not connect to Mattermost (${serverUrl}). Reason: Server version is not available`);
    }

    const output: GetServerInfoOutput = {
        mattermost_url: serverUrl,
        server_version: version,
    };

    return toolStructuredResult(output);
}
