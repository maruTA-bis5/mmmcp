import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    channel_id: idSchema.describe('Channel ID'),
    message: z.string().min(1).describe('Post message in Mattermost Markdown'),
    root_id: idSchema.optional().describe('Optional root post ID for a reply'),
};

export class CreatePostTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'create_post',
            description: 'Create a post in a Mattermost channel or thread.',
            inputSchema,
            handler: createPost,
        });
    }
}

async function createPost(
    client: MattermostClient,
    { channel_id, message, root_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() =>
        client.api.createPost({
            channel_id,
            message,
            ...(root_id === undefined ? {} : { root_id }),
        }),
    );
}
