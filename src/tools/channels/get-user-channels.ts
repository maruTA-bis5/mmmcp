import type { ServerChannel } from '@mattermost/types/channels';
import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export class GetUserChannelsTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_user_channels',
            description: 'List channels available to the authenticated user in a team.',
            inputSchema,
            handler: getUserChannels,
        });
    }
}

async function getUserChannels(
    client: MattermostClient,
    { team_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(async () => {
        const channels: ServerChannel[] = await client.api.getMyChannels(team_id);
        return toolTextResult(
            channels
                .map(
                    channel =>
                        `Channel ID: ${channel.id}\nDisplay Name: ${channel.display_name}\nName: ${channel.name}\nType: ${channel.type}`,
                )
                .join('\n\n'),
        );
    });
}
