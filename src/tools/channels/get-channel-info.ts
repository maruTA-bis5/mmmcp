import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = { channel_id: idSchema.describe('Channel ID') };

export function registerGetChannelInfoTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'get_channel_info',
        {
            description: 'Get details for a Mattermost channel.',
            inputSchema,
        },
        async ({ channel_id }: z.infer<z.ZodObject<typeof inputSchema>>) =>
            execute(() => client.api.getChannel(channel_id)),
    );
}
