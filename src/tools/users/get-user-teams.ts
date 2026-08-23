import type { TeamMembership } from '@mattermost/types/teams';
import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';

import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = z.strictObject({});
type GetUserTeamsInput = z.infer<typeof inputSchema>;

const TeamMembershipSchema = z.strictObject({
    teamId: idSchema.describe('The team ID'),
    roles: z.string().describe('Roles of the authenticated user in the team'),
    name: z.string().describe('The team url-friendly name'),
    displayName: z.string().describe('The team display name'),
});
export const GetUserTeamsOutputSchema = z.strictObject({
    teams: z.array(TeamMembershipSchema).describe('Team memberships for the authenticated user'),
});
export type GetUserTeamsOutput = z.infer<typeof GetUserTeamsOutputSchema>;

export class GetUserTeamsTool extends Tool<
    GetUserTeamsInput,
    GetUserTeamsOutput,
    StructuredToolResult<GetUserTeamsOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_user_teams',
            description: 'List team memberships for the authenticated Mattermost user.',
            inputSchema,
            outputSchema: GetUserTeamsOutputSchema,
            handler: getUserTeams,
        });
    }
}

async function getUserTeams(
    client: MattermostClient,
    _input: GetUserTeamsInput,
): Promise<StructuredToolResult<GetUserTeamsOutput>> {
    const memberships: TeamMembership[] = await client.api.getMyTeamMembers();
    const teamsById = new Map(
        await Promise.all(
            memberships.map(async membership => {
                const team = await client.api.getTeam(membership.team_id);
                return [membership.team_id, team] as const;
            }),
        ),
    );
    const output: GetUserTeamsOutput = {
        teams: memberships.map(membership => {
            const team = teamsById.get(membership.team_id);
            return {
                teamId: membership.team_id,
                roles: membership.roles,
                name: team?.name ?? '',
                displayName: team?.display_name ?? '',
            };
        }),
    };
    return toolStructuredResult(output);
}
