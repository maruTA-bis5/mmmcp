import { randomUUID } from 'node:crypto';
import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { type GetUserChannelsOutput, GetUserChannelsTool } from '../../../../src/tools/channels/get-user-channels.js';
import { getAdminAccessToken, getMattermostUrl, getUserAccessToken } from '../../testShared.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'get_user_channels tool',
    toolTest(
        client => new GetUserChannelsTool(client),
        context => {
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
                const suffix = randomUUID().replaceAll('-', '');
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
                    const expected: GetUserChannelsOutput = {
                        channels: channels.map(channel => ({
                            channelId: channel.id,
                            displayName: channel.display_name,
                            name: channel.name,
                            type: channel.type,
                        })),
                    };
                    const toolResult = await context.mcpClient.callTool({
                        name: 'get_user_channels',
                        arguments: { team_id: team.id },
                    });

                    expectToolResultIsError(toolResult).toBeFalsy();
                    expect(toolResult.structuredContent).toEqual(expected);
                } finally {
                    if (teamId) {
                        await adminClient.api.deleteTeam(teamId);
                    }
                }
            });
        },
    ),
);
