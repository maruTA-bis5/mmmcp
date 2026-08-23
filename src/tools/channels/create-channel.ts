import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
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

export function registerCreateChannelTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'create_channel',
        {
            description: 'Create a public or private Mattermost channel.',
            inputSchema,
        },
        async ({ team_id, name, display_name, type, header, purpose }: z.infer<typeof inputSchema>) =>
            execute(() =>
                client.api.createChannel({
                    team_id,
                    name,
                    display_name,
                    type,
                    ...(header === undefined ? {} : { header }),
                    ...(purpose === undefined ? {} : { purpose }),
                }),
            ),
    );
}
