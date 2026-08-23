import type { ServerChannel } from '@mattermost/types/channels';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = z.strictObject({
    team_id: idSchema.describe('Team ID'),
    name: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9][a-z0-9-_]*$/, 'Must use lowercase letters, numbers, hyphens, and underscores')
        .describe('URL-safe channel name'),
    display_name: z.string().min(1).max(64).describe('Human-readable channel name'),
    type: z.enum(['O', 'P']).describe('O for public; P for private'),
    header: z.string().max(1024).optional().describe('Optional channel header'),
    purpose: z.string().max(250).optional().describe('Optional channel purpose'),
});
type CreateChannelInput = z.infer<typeof inputSchema>;

export const CreateChannelOutputSchema = z.strictObject({
    channelId: idSchema.describe('The created channel ID'),
});
export type CreateChannelOutput = z.infer<typeof CreateChannelOutputSchema>;

export class CreateChannelTool extends Tool<
    CreateChannelInput,
    CreateChannelOutput,
    StructuredToolResult<CreateChannelOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'create_channel',
            description: 'Create a public or private Mattermost channel.',
            inputSchema,
            outputSchema: CreateChannelOutputSchema,
            handler: createChannel,
        });
    }
}

async function createChannel(
    client: MattermostClient,
    { team_id, name, display_name, type, header, purpose }: CreateChannelInput,
): Promise<StructuredToolResult<CreateChannelOutput>> {
    const channel: ServerChannel = await client.api.createChannel({
        team_id,
        name,
        display_name,
        type,
        ...(header === undefined ? {} : { header }),
        ...(purpose === undefined ? {} : { purpose }),
    });
    return toolStructuredResult({ channelId: channel.id });
}
