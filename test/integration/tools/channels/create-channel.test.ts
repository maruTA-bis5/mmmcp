import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { type CreateChannelOutput, CreateChannelTool } from '../../../../src/tools/channels/create-channel.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'create_channel tool',
    toolTest(
        client => new CreateChannelTool(client),
        context => {
            it('should create a Mattermost channel and return only the channel id', async () => {
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
                    const input = {
                        team_id: team.id,
                        name: `integration-channel-${suffix}`,
                        display_name: `Integration Channel ${suffix}`,
                        type: 'O',
                    };
                    const toolResult = await context.mcpClient.callTool({
                        name: 'create_channel',
                        arguments: input,
                    });

                    expectToolResultIsError(toolResult).toBeFalsy();
                    const channel = await client.api.getChannelByName(team.id, input.name);
                    const expected: CreateChannelOutput = { channelId: channel.id };
                    expect(toolResult.structuredContent).toEqual(expected);
                } finally {
                    await client.api.deleteTeam(team.id);
                }
            });
        },
    ),
);
