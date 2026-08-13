import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { CreateChannelTool } from '../../../../src/tools/channels/create-channel.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('create_channel tool', () => {
    it('should create a Mattermost channel', async () => {
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
            const createChannelTool = new CreateChannelTool(client);

            const input = {
                team_id: team.id,
                name: `integration-channel-${suffix}`,
                display_name: `Integration Channel ${suffix}`,
                type: 'O',
            };
            const result: ToolResult = await execute(() => createChannelTool.definition.handler(client, input));
            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const channel = await client.api.getChannelByName(team.id, input.name);
            expect(result.content[0]?.text).toEqual(`Channel ID: ${channel.id}
Team ID: ${channel.team_id}
Display Name: ${channel.display_name}
Name: ${channel.name}
Type: ${channel.type}
Header: ${channel.header}
Purpose: ${channel.purpose}`);
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});
