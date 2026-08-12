import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = {
    user_id: idSchema.describe('Recipient user ID'),
    message: z.string().min(1).describe('Message in Mattermost Markdown'),
    root_id: idSchema.optional().describe('Optional root post ID for a reply'),
};

export function registerSendDmTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'send_dm',
        {
            description: 'Send a direct message to one Mattermost user.',
            inputSchema,
        },
        async ({ user_id, message, root_id }: z.infer<z.ZodObject<typeof inputSchema>>) =>
            execute(async () => {
                const me = await client.api.getMe();
                const channel = await client.api.createDirectChannel([me.id, user_id]);
                return client.api.createPost({
                    channel_id: channel.id,
                    message,
                    ...(root_id === undefined ? {} : { root_id }),
                });
            }),
    );
}
