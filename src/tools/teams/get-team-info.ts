import type { Team } from '@mattermost/types/teams';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = z.strictObject({ team_id: idSchema.describe('Team ID') });
type GetTeamInfoInput = z.infer<typeof inputSchema>;

export const GetTeamInfoOutputSchema = z.strictObject({
    teamId: idSchema.describe('The team ID'),
    displayName: z.string().describe('The team display name'),
    name: z.string().describe('The team url-friendly name'),
    description: z.string().optional().describe('The team description'),
    type: z.enum(['O', 'I']).describe('The team type. O: Open, I: Invite Only'),
});
export type GetTeamInfoOutput = z.infer<typeof GetTeamInfoOutputSchema>;

export class GetTeamInfoTool extends Tool<
    GetTeamInfoInput,
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
    { team_id }: GetTeamInfoInput,
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
