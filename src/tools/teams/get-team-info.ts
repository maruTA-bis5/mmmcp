import type { Team } from '@mattermost/types/teams';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export const GetTeamInfoOutputSchema = z.strictObject({
    teamId: idSchema.describe('The team ID'),
    displayName: z.string().describe('The team display name'),
    name: z.string().describe('The team name'),
    description: z.string().describe('The team description'),
    type: z.string().describe('The team type'),
});
export type GetTeamInfoOutput = z.infer<typeof GetTeamInfoOutputSchema>;

export class GetTeamInfoTool extends Tool<
    typeof inputSchema,
    GetTeamInfoOutput,
    StructuredToolResult<GetTeamInfoOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_team_info',
            description: 'Get details for a Mattermost team.',
            inputSchema,
            outputSchema: GetTeamInfoOutputSchema,
            handler: getTeamInfo,
        });
    }
}

async function getTeamInfo(
    client: MattermostClient,
    { team_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<StructuredToolResult<GetTeamInfoOutput>> {
    const team: Team = await client.api.getTeam(team_id);
    const output: GetTeamInfoOutput = {
        teamId: team.id,
        displayName: team.display_name,
        name: team.name,
        description: team.description,
        type: team.type,
    };
    return toolStructuredResult(output);
}
