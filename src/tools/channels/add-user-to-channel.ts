import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';
import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
    channel_id: idSchema.describe('Channel ID'),
    user_id: idSchema.describe('User ID'),
    post_root_id: idSchema.optional().describe('Optional thread root post ID'),
});

export function registerAddUserToChannelTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'add_user_to_channel',
        {
            description: 'Add a user to a Mattermost channel.',
            inputSchema,
        },
        async ({ channel_id, user_id, post_root_id }: z.infer<typeof inputSchema>) =>
            execute(() => client.api.addToChannel(user_id, channel_id, post_root_id)),
    );
}
