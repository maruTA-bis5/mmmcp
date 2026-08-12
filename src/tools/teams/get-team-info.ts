import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export class GetTeamInfoTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_team_info',
            description: 'Get details for a Mattermost team.',
            inputSchema,
            handler: getTeamInfo,
        });
    }
}

async function getTeamInfo(
    client: MattermostClient,
    { team_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(() => client.api.getTeam(team_id));
}
