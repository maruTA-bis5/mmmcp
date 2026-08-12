import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { CreatePostTool } from '../../../../src/tools/posts/create-post.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('create_post tool', () => {
    it('should create a Mattermost post', async () => {
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
            const createPostTool = new CreatePostTool(client);
            const input = {
                channel_id: channel.id,
                message: `Integration post ${suffix}`,
            };

            const result: ToolResult = await execute(() => createPostTool.definition.handler(client, input));

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const posts = await client.api.getPosts(channel.id, 0, 100);
            const post = Object.values(posts.posts).find(item => item.message === input.message);
            expect(post).toBeDefined();
            expect(JSON.parse(result.content[0]?.text ?? '')).toMatchObject({
                id: post?.id,
                channel_id: channel.id,
                message: input.message,
            });
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});