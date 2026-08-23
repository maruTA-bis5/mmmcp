import { randomUUID } from 'node:crypto';
import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { type GetTeamInfoOutput, GetTeamInfoTool } from '../../../../src/tools/teams/get-team-info.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'get_team_info tool',
    toolTest(
        client => new GetTeamInfoTool(client),
        context => {
            it('should return details for a Mattermost team', async () => {
                const client = await MattermostClient.create({
                    url: getMattermostUrl(),
                    auth: { token: getAdminAccessToken() },
                });
                const suffix = randomUUID().replaceAll('-', '');
                const team = await client.api.createTeam({
                    id: '',
                    create_at: 0,
                    update_at: 0,
                    delete_at: 0,
                    display_name: `Integration Team ${suffix}`,
                    name: `integration-team-${suffix}`,
                    description: 'Integration test team',
                    email: '',
                    type: 'O',
                    company_name: '',
                    allowed_domains: '',
                    invite_id: '',
                    allow_open_invite: true,
                    scheme_id: '',
                    group_constrained: false,
                } satisfies Team);
                try {
                    const user = await client.api.getUserByUsername('general');
                    await client.api.addToTeam(team.id, user.id);
                    const expected: GetTeamInfoOutput = {
                        teamId: team.id,
                        displayName: team.display_name,
                        name: team.name,
                        description: team.description,
                        type: team.type,
                    };
                    const toolResult = await context.mcpClient.callTool({
                        name: 'get_team_info',
                        arguments: { team_id: team.id },
                    });

                    expectToolResultIsError(toolResult).toBeFalsy();
                    expect(toolResult.structuredContent).toEqual(expected);
                } finally {
                    await client.api.deleteTeam(team.id);
                }
            });
        },
    ),
);
