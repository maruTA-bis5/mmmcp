import type { Post } from '@mattermost/types/posts';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    user_id: idSchema.describe('Recipient user ID'),
    message: z.string().min(1).describe('Message in Mattermost Markdown'),
    root_id: idSchema.optional().describe('Optional root post ID for a reply'),
};

export class SendDmTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'send_dm',
            description: 'Send a direct message to one Mattermost user.',
            inputSchema,
            handler: sendDm,
        });
    }
}

async function sendDm(
    client: MattermostClient,
    { user_id, message, root_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(async () => {
        const me = await client.api.getMe();
        const channel = await client.api.createDirectChannel([me.id, user_id]);
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
