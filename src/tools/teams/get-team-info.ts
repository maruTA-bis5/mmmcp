import type { Team } from '@mattermost/types/teams';
import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type PlainToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export class GetTeamInfoTool extends Tool<typeof inputSchema, string, PlainToolResult> {
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
): Promise<PlainToolResult> {
    return execute(async () => {
        const team: Team = await client.api.getTeam(team_id);
        return toolTextResult(`Team ID: ${team.id}
    Display Name: ${team.display_name}
    Name: ${team.name}
    Description: ${team.description}
    Type: ${team.type}`);
    });
}
