import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export function registerGetUserChannelsTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'get_user_channels',
        {
            description: 'List channels available to the authenticated user in a team.',
            inputSchema,
        },
        async ({ team_id }: z.infer<z.ZodObject<typeof inputSchema>>) =>
            execute(() => client.api.getMyChannels(team_id)),
    );
}
