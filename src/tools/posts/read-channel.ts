import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    channel_id: idSchema.describe('Channel ID'),
    ...paginationSchema,
    fetch_threads: z.boolean().optional().describe('Include thread metadata'),
};

export class ReadChannelTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'read_channel',
            description: 'Read recent posts in a Mattermost channel.',
            inputSchema,
            handler: readChannel,
        });
    }
}

async function readChannel(
    client: MattermostClient,
    { channel_id, page, per_page, fetch_threads }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getPosts(channel_id, page, per_page, fetch_threads));
}
