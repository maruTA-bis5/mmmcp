import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export class GetUserChannelsTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_user_channels',
            description: 'List channels available to the authenticated user in a team.',
            inputSchema,
            handler: getUserChannels,
        });
    }
}

async function getUserChannels(
    client: MattermostClient,
    { team_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getMyChannels(team_id));
}
