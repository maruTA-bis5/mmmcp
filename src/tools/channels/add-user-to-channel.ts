import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    channel_id: idSchema.describe('Channel ID'),
    user_id: idSchema.describe('User ID'),
    post_root_id: idSchema.optional().describe('Optional thread root post ID'),
};

export class AddUserToChannelTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'add_user_to_channel',
            description: 'Add a user to a Mattermost channel.',
            inputSchema,
            handler: addUserToChannel,
        });
    }
}

async function addUserToChannel(
    client: MattermostClient,
    { channel_id, user_id, post_root_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.addToChannel(user_id, channel_id, post_root_id));
}
