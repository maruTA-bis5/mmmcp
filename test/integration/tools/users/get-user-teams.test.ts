import { describe, expect, it } from 'vitest';
import { type GetUserTeamsOutput, GetUserTeamsTool } from '../../../../src/tools/users/get-user-teams.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'get_user_teams tool',
    toolTest(
        client => new GetUserTeamsTool(client),
        context => {
            it('should return team memberships for the authenticated user', async () => {
                const memberships = await context.mattermostClient.api.getMyTeamMembers();
                const teamsById = new Map(
                    await Promise.all(
                        memberships.map(async membership => {
                            const team = await context.mattermostClient.api.getTeam(membership.team_id);
                            return [membership.team_id, team] as const;
                        }),
                    ),
                );

                const toolResult = await context.mcpClient.callTool({
                    name: 'get_user_teams',
                    arguments: {},
                });

                expectToolResultIsError(toolResult).toBeFalsy();
                const expected: GetUserTeamsOutput = {
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
                expect(toolResult.structuredContent).toMatchObject(expected);
            });
        },
    ),
);
