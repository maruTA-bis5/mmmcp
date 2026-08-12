import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { channel_id: idSchema.describe('Channel ID'), ...paginationSchema };

export class GetChannelMembersTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_channel_members',
            description: 'List members of a Mattermost channel.',
            inputSchema,
            handler: getChannelMembers,
        });
    }
}

async function getChannelMembers(
    client: MattermostClient,
    { channel_id, page, per_page }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getChannelMembers(channel_id, page, per_page));
}
