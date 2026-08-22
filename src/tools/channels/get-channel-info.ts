import type { Channel } from '@mattermost/types/channels';
import type { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type PlainToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { channel_id: idSchema.describe('Channel ID') };

export class GetChannelInfoTool extends Tool<typeof inputSchema, string, PlainToolResult> {
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
): Promise<PlainToolResult> {
    return execute(async () => {
        const channel: Channel = await client.api.getChannel(channel_id);
        return toolTextResult(`Channel ID: ${channel.id}
Team ID: ${channel.team_id}
Display Name: ${channel.display_name}
Name: ${channel.name}
Type: ${channel.type}
Purpose: ${channel.purpose}
Header: ${channel.header}`);
    });
}
