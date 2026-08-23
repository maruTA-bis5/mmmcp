import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
    channel_id: idSchema.describe('Channel ID'),
    message: z.string().min(1).describe('Post message in Mattermost Markdown'),
    root_id: idSchema.optional().describe('Optional root post ID for a reply'),
});

export function registerCreatePostTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'create_post',
        {
            description: 'Create a post in a Mattermost channel or thread.',
            inputSchema,
        },
        async ({ channel_id, message, root_id }: z.infer<typeof inputSchema>) =>
            execute(() =>
                client.api.createPost({
                    channel_id,
                    message,
                    ...(root_id === undefined ? {} : { root_id }),
                }),
            ),
    );
}
