import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { AddUserToChannelTool } from '../../../../src/tools/channels/add-user-to-channel.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('add_user_to_channel tool', () => {
    it('should add a user to a Mattermost channel', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const userClient = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getUserAccessToken() },
        });
        const suffix = Date.now().toString(36);
        const team = await client.api.createTeam({
            id: '',
            create_at: 0,
            update_at: 0,
            delete_at: 0,
            display_name: `Integration Team ${suffix}`,
            name: `integration-team-${suffix}`,
            description: '',
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
            const user = await userClient.api.getMe();
            await client.api.addToTeam(team.id, user.id);
            const channel = await client.api.createChannel({
                team_id: team.id,
                name: `integration-channel-${suffix}`,
                display_name: `Integration Channel ${suffix}`,
                type: 'O',
            });
            const addUserToChannelTool = new AddUserToChannelTool(client);
            const input = { channel_id: channel.id, user_id: user.id };

            const result: ToolResult = await execute(() => addUserToChannelTool.definition.handler(client, input));

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            expect(JSON.parse(result.content[0]?.text ?? '')).toMatchObject({
                channel_id: channel.id,
                user_id: user.id,
            });
            const members = await client.api.getChannelMembers(channel.id, 0, 100);
            expect(members.some(member => member.user_id === user.id)).toBe(true);
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});