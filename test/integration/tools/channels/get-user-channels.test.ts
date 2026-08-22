import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { GetUserChannelsTool } from '../../../../src/tools/channels/get-user-channels.js';
import { execute, PlainToolResultSchema, type ToolResult } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('get_user_channels tool', () => {
    it('should return channels available to the authenticated user in a team', async () => {
        const adminClient = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const userClient = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getUserAccessToken() },
        });
        const user = await adminClient.api.getUserByUsername('general');
        const suffix = Date.now().toString(36);
        let teamId: string | undefined;

        try {
            const team = await adminClient.api.createTeam({
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
            teamId = team.id;
            await adminClient.api.addToTeam(team.id, user.id);
            await adminClient.api.createChannel({
                team_id: team.id,
                name: `integration-channel-${suffix}`,
                display_name: `Integration Channel ${suffix}`,
                type: 'O',
            });
            const channels = await userClient.api.getMyChannels(team.id);
            const getUserChannelsTool = new GetUserChannelsTool(userClient);

            const result: ToolResult = await execute(() =>
                getUserChannelsTool.definition.handler(userClient, { team_id: team.id }),
            );

            expect(PlainToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const expectedContent = channels
                .map(
                    channel =>
                        `Channel ID: ${channel.id}\nDisplay Name: ${channel.display_name}\nName: ${channel.name}\nType: ${channel.type}`,
                )
                .join('\n\n');
            expect(result.content[0]?.text).toEqual(expectedContent);
        } finally {
            if (teamId) {
                await adminClient.api.deleteTeam(teamId);
            }
        }
    });
});
