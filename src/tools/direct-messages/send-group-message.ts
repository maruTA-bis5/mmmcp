import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
    user_ids: z
        .array(idSchema)
        .min(2)
        .max(7)
        .describe(
            'Recipient user IDs; provide at least two recipients. The authenticated user is included automatically. Do not duplicate IDs.',
        ),
    message: z.string().min(1).describe('Message in Mattermost Markdown'),
    root_id: idSchema.optional().describe('Optional root post ID for a reply'),
});

export function registerSendGroupMessageTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'send_group_message',
        {
            description: 'Send a group direct message. The authenticated user is included automatically.',
            inputSchema,
        },
        async ({ user_ids, message, root_id }: z.infer<typeof inputSchema>) =>
            execute(async () => {
                const me = await client.api.getMe();
                const channel = await client.api.createGroupChannel(uniqueUserIds([me.id, ...user_ids]));
                return client.api.createPost({
                    channel_id: channel.id,
                    message,
                    ...(root_id === undefined ? {} : { root_id }),
                });
            }),
    );
}

function uniqueUserIds(userIds: string[]): string[] {
    return [...new Set(userIds)];
}
