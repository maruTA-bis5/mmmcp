import type { ServerChannel } from '@mattermost/types/channels';
import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';

import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = z.strictObject({ team_id: idSchema.describe('Team ID') });
type GetUserChannelsInput = z.infer<typeof inputSchema>;

const ChannelSchema = z.strictObject({
    channelId: idSchema.describe('The channel ID'),
    displayName: z.string().describe('The channel display name'),
    name: z.string().describe('The channel name'),
    type: z.string().describe('The channel type'),
});
export const GetUserChannelsOutputSchema = z.strictObject({
    channels: z.array(ChannelSchema).describe('Channels available to the authenticated user'),
});
export type GetUserChannelsOutput = z.infer<typeof GetUserChannelsOutputSchema>;

export class GetUserChannelsTool extends Tool<
    GetUserChannelsInput,
    GetUserChannelsOutput,
    StructuredToolResult<GetUserChannelsOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_user_channels',
            description: 'List channels available to the authenticated user in a team.',
            inputSchema,
            outputSchema: GetUserChannelsOutputSchema,
            handler: getUserChannels,
        });
    }
}

async function getUserChannels(
    client: MattermostClient,
    { team_id }: GetUserChannelsInput,
): Promise<StructuredToolResult<GetUserChannelsOutput>> {
    const channels: ServerChannel[] = await client.api.getMyChannels(team_id);
    const output: GetUserChannelsOutput = {
        channels: channels.map(channel => ({
            channelId: channel.id,
            displayName: channel.display_name,
            name: channel.name,
            type: channel.type,
        })),
    };
    return toolStructuredResult(output);
}
