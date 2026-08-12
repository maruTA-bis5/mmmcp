import type { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { channel_id: idSchema.describe('Channel ID') };

export class GetChannelInfoTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_channel_info',
            description: 'Get details for a Mattermost channel.',
            inputSchema,
            handler: getChannelInfo,
        });
    }
}

async function getChannelInfo(
    client: MattermostClient,
    { channel_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getChannel(channel_id));
}
