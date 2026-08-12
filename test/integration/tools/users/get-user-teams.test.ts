import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { GetUserTeamsTool } from '../../../../src/tools/users/get-user-teams.js';
import { getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('get_user_teams tool', () => {
    it('should return team memberships for the authenticated user', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getUserAccessToken() },
        });
        const memberships = await client.api.getMyTeamMembers();
        const getUserTeamsTool = new GetUserTeamsTool(client);

        const result: ToolResult = await execute(() => getUserTeamsTool.definition.handler(client, {}));

        expect(ToolResultSchema.safeParse(result).success).toBe(true);
        expect(result.content).lengthOf(1);
        const expectedContent = memberships
            .map(membership => `Team ID: ${membership.team_id}\nRoles: ${membership.roles}`)
            .join('\n\n');
        expect(result.content[0]?.text).toEqual(expectedContent);
    });
});
