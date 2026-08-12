import { z } from 'zod';
import type { Post, PaginatedPostList } from '@mattermost/types/posts';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    post_id: idSchema.describe('Root or reply post ID'),
    fetch_threads: z.boolean().optional().describe('Include thread metadata'),
};

export class ReadThreadTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'read_thread',
            description: 'Read the thread containing a Mattermost post.',
            inputSchema,
            handler: readThread,
        });
    }
}

async function readThread(
    client: MattermostClient,
    { post_id, fetch_threads }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getPostThread(post_id, fetch_threads));
}
