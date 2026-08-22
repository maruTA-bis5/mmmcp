import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { GetChannelInfoTool } from '../../../../src/tools/channels/get-channel-info.js';
import { execute, PlainToolResultSchema, type ToolResult } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('get_channel_info tool', () => {
    it('should return details for a Mattermost channel', async () => {
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
            const channel = await client.api.createChannel({
                team_id: team.id,
                name: `integration-channel-${suffix}`,
                display_name: `Integration Channel ${suffix}`,
                type: 'O',
            });
            const getChannelInfoTool = new GetChannelInfoTool(client);

            const result: ToolResult = await execute(() =>
                getChannelInfoTool.definition.handler(client, { channel_id: channel.id }),
            );
            expect(PlainToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const expectedContent = `Channel ID: ${channel.id}
Team ID: ${channel.team_id}
Display Name: ${channel.display_name}
Name: ${channel.name}
Type: ${channel.type}
Purpose: ${channel.purpose}
Header: ${channel.header}`;
            expect(result.content[0]?.text).toEqual(expectedContent);
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});
