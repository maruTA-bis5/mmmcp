import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
    post_id: idSchema.describe('Root or reply post ID'),
    fetch_threads: z.boolean().optional().describe('Include thread metadata'),
});

export function registerReadThreadTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'read_thread',
        {
            description: 'Read the thread containing a Mattermost post.',
            inputSchema,
        },
        async ({ post_id, fetch_threads }: z.infer<typeof inputSchema>) =>
            execute(() => client.api.getPostThread(post_id, fetch_threads)),
    );
}
