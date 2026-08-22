import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
    channel_id: idSchema.describe('Channel ID'),
    ...paginationSchema,
    fetch_threads: z.boolean().optional().describe('Include thread metadata'),
});

export function registerReadChannelTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'read_channel',
        {
            description: 'Read recent posts in a Mattermost channel.',
            inputSchema,
        },
        async ({ channel_id, page, per_page, fetch_threads }: z.infer<typeof inputSchema>) =>
            execute(() => client.api.getPosts(channel_id, page, per_page, fetch_threads)),
    );
}
