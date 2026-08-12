import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { ReadChannelTool } from '../../../../src/tools/posts/read-channel.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('read_channel tool', () => {
    it('should return recent posts in a Mattermost channel', async () => {
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
        const channel = await client.api.createChannel({
            team_id: team.id,
            name: `integration-channel-${suffix}`,
            display_name: `Integration Channel ${suffix}`,
            type: 'O',
        });
        await client.api.createPost({ channel_id: channel.id, message: `Integration post ${suffix}` });
        try {
            const readChannelTool = new ReadChannelTool(client);
            const result: ToolResult = await execute(() =>
                readChannelTool.definition.handler(client, { channel_id: channel.id }),
            );

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const posts = await client.api.getPosts(channel.id);
            expect(result.content[0]?.text).toEqual(JSON.stringify(posts, null, 2));
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});