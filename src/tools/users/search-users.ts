import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = z.object({
    term: z.string().min(1).describe('User search text'),
    team_id: idSchema.optional().describe('Restrict results to a team'),
    not_in_team_id: idSchema.optional().describe('Exclude users already in a team'),
    in_channel_id: idSchema.optional().describe('Restrict results to a channel'),
    group_constrained: z.boolean().optional().describe('Apply group constraints'),
    allow_inactive: z.boolean().optional().describe('Include inactive users'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum results'),
});

export function registerSearchUsersTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'search_users',
        {
            description: 'Search Mattermost users by name, username, nickname, or email.',
            inputSchema,
        },
        async ({ term, ...options }: z.infer<typeof inputSchema>) =>
            execute(() => client.api.searchUsers(term, options)),
    );
}
