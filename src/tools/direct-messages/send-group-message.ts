import type { Post } from '@mattermost/types/posts';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    user_ids: z.array(idSchema).min(2).max(8).describe('Recipient user IDs; provide at least two recipients'),
    message: z.string().min(1).describe('Message in Mattermost Markdown'),
    root_id: idSchema.optional().describe('Optional root post ID for a reply'),
};

export class SendGroupMessageTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'send_group_message',
            description: 'Send a group direct message. The authenticated user is included automatically.',
            inputSchema,
            handler: sendGroupMessage,
        });
    }
}

async function sendGroupMessage(
    client: MattermostClient,
    { user_ids, message, root_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(async () => {
        const me = await client.api.getMe();
        const channel = await client.api.createGroupChannel(uniqueUserIds([me.id, ...user_ids]));
        const post: Post = await client.api.createPost({
            channel_id: channel.id,
            message,
            ...(root_id === undefined ? {} : { root_id }),
        });
        return toolTextResult(`Post ID: ${post.id}
Channel ID: ${post.channel_id}
User ID: ${post.user_id}
Message: ${post.message}
Root ID: ${post.root_id}`);
    });
}

function uniqueUserIds(userIds: string[]): string[] {
    return [...new Set(userIds)];
}
