import type { Channel } from '@mattermost/types/channels';
import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';

import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { channel_id: idSchema.describe('Channel ID') };

export const GetChannelInfoOutputSchema = z.strictObject({
    channelId: idSchema.describe('The channel ID'),
    teamId: idSchema.describe('The team ID that owns the channel'),
    displayName: z.string().describe('The channel display name'),
    name: z.string().describe('The channel name'),
    type: z.string().describe('The channel type'),
    purpose: z.string().describe('The channel purpose'),
    header: z.string().describe('The channel header'),
});
export type GetChannelInfoOutput = z.infer<typeof GetChannelInfoOutputSchema>;

export class GetChannelInfoTool extends Tool<
    typeof inputSchema,
    GetChannelInfoOutput,
    StructuredToolResult<GetChannelInfoOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_channel_info',
            description: 'Get details for a Mattermost channel.',
            inputSchema,
            outputSchema: GetChannelInfoOutputSchema,
            handler: getChannelInfo,
        });
    }
}

async function getChannelInfo(
    client: MattermostClient,
    { channel_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<StructuredToolResult<GetChannelInfoOutput>> {
    const channel: Channel = await client.api.getChannel(channel_id);
    const output: GetChannelInfoOutput = {
        channelId: channel.id,
        teamId: channel.team_id,
        displayName: channel.display_name,
        name: channel.name,
        type: channel.type,
        purpose: channel.purpose,
        header: channel.header,
    };
    return toolStructuredResult(output);
}
