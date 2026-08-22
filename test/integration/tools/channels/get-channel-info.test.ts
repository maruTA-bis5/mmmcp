import { randomUUID } from 'node:crypto';
import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { type GetChannelInfoOutput, GetChannelInfoTool } from '../../../../src/tools/channels/get-channel-info.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'get_channel_info tool',
    toolTest(
        client => new GetChannelInfoTool(client),
        context => {
            it('should return details for a Mattermost channel', async () => {
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
                    const user = await client.api.getUserByUsername('general');
                    await client.api.addToTeam(team.id, user.id);
                    const channel = await client.api.createChannel({
                        team_id: team.id,
                        name: `integration-channel-${suffix}`,
                        display_name: `Integration Channel ${suffix}`,
                        type: 'O',
                    });
                    const expected: GetChannelInfoOutput = {
                        channelId: channel.id,
                        teamId: channel.team_id,
                        displayName: channel.display_name,
                        name: channel.name,
                        type: channel.type,
                        purpose: channel.purpose,
                        header: channel.header,
                    };
                    const toolResult = await context.mcpClient.callTool({
                        name: 'get_channel_info',
                        arguments: { channel_id: channel.id },
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
