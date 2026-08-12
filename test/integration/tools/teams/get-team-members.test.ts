import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { GetTeamMembersTool } from '../../../../src/tools/teams/get-team-members.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('get_team_members tool', () => {
    it('should return members of a Mattermost team', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const suffix = Date.now().toString(36);
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
            const getTeamMembersTool = new GetTeamMembersTool(client);
            const result: ToolResult = await execute(() =>
                getTeamMembersTool.definition.handler(client, { team_id: team.id }),
            );

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const members = await client.api.getTeamMembers(team.id);
            const expectedContent = members
                .map(member => `User ID: ${member.user_id}\nTeam ID: ${member.team_id}\nRoles: ${member.roles}`)
                .join('\n\n');
            expect(result.content[0]?.text).toEqual(expectedContent);
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});
