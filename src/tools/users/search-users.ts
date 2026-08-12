import { z } from 'zod';
import type { UserProfile } from '@mattermost/types/users';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    term: z.string().min(1).describe('User search text'),
    team_id: idSchema.optional().describe('Restrict results to a team'),
    not_in_team_id: idSchema.optional().describe('Exclude users already in a team'),
    in_channel_id: idSchema.optional().describe('Restrict results to a channel'),
    group_constrained: z.boolean().optional().describe('Apply group constraints'),
    allow_inactive: z.boolean().optional().describe('Include inactive users'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum results'),
};

export class SearchUsersTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'search_users',
            description: 'Search Mattermost users by name, username, nickname, or email.',
            inputSchema,
            handler: searchUsers,
        });
    }
}

async function searchUsers(
    client: MattermostClient,
    { term, ...options }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.searchUsers(term, options));
}
