import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { team_id: idSchema.describe('Team ID'), ...paginationSchema };

export class GetTeamMembersTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_team_members',
            description: 'List members of a Mattermost team.',
            inputSchema,
            handler: getTeamMembers,
        });
    }
}

async function getTeamMembers(
    client: MattermostClient,
    { team_id, page, per_page }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getTeamMembers(team_id, page, per_page));
}
