import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolServer } from '../shared.js';

const inputSchema = { team_id: idSchema.describe('Team ID'), ...paginationSchema };

export function registerGetTeamMembersTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'get_team_members',
        {
            description: 'List members of a Mattermost team.',
            inputSchema,
        },
        async ({ team_id, page, per_page }: z.infer<z.ZodObject<typeof inputSchema>>) =>
            execute(() => client.api.getTeamMembers(team_id, page, per_page)),
    );
}
