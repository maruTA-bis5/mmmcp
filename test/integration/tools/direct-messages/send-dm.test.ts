import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { SendDmTool } from '../../../../src/tools/direct-messages/send-dm.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('send_dm tool', () => {
    it('should send a direct message to a Mattermost user', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const userClient = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getUserAccessToken() },
        });
        const user = await userClient.api.getMe();
        const me = await client.api.getMe();
        const channel = await client.api.createDirectChannel([me.id, user.id]);
        const message = `Integration direct message ${Date.now().toString(36)}`;

        try {
            const sendDmTool = new SendDmTool(client);
            const input = {
                user_id: user.id,
                message,
            };

            const result: ToolResult = await execute(() => sendDmTool.definition.handler(client, input));

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const posts = await client.api.getPosts(channel.id, 0, 100);
            const post = Object.values(posts.posts).find(item => item.message === input.message);
            expect(post).toBeDefined();
            expect(JSON.parse(result.content[0]?.text ?? '')).toMatchObject({
                id: post?.id,
                channel_id: channel.id,
                user_id: me.id,
                message: input.message,
            });
        } finally {
            const posts = await client.api.getPosts(channel.id, 0, 100);
            const post = Object.values(posts.posts).find(item => item.message === message);
            if (post) {
                await client.api.deletePost(post.id);
            }
        }
    });
});