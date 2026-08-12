import { Client4 } from '@mattermost/client';
import type { UserProfile } from '@mattermost/types/users';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { SendGroupMessageTool } from '../../../../src/tools/direct-messages/send-group-message.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('send_group_message tool', () => {
    it('should send a group direct message', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const userClient = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getUserAccessToken() },
        });
        const me = await client.api.getMe();
        const user = await userClient.api.getMe();
        const adminApi = new Client4();
        adminApi.setUrl(getMattermostUrl());
        adminApi.setToken(getAdminAccessToken());
        const suffix = Date.now().toString(36);
        const groupUser = await adminApi.createUser(newUserProfile(`group-${suffix}`, suffix), '', '');
        const channel = await client.api.createGroupChannel([me.id, user.id, groupUser.id]);
        const message = `Integration group message ${suffix}`;

        try {
            const sendGroupMessageTool = new SendGroupMessageTool(client);
            const input = {
                user_ids: [user.id, groupUser.id],
                message,
            };

            const result: ToolResult = await execute(() =>
                sendGroupMessageTool.definition.handler(client, input),
            );

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
            const members = await client.api.getChannelMembers(channel.id, 0, 100);
            expect(members.map(member => member.user_id)).toEqual(
                expect.arrayContaining([me.id, user.id, groupUser.id]),
            );
        } finally {
            const posts = await client.api.getPosts(channel.id, 0, 100);
            const post = Object.values(posts.posts).find(item => item.message === message);
            if (post) {
                await client.api.deletePost(post.id);
            }
            await adminApi.updateUserActive(groupUser.id, false);
        }
    });
});

function newUserProfile(username: string, suffix: string): UserProfile {
    return {
        id: '',
        username,
        password: `${username}-password`,
        nickname: `${username}-nickname`,
        first_name: 'Integration',
        last_name: `Group ${suffix}`,
        email: `${username}@example.com`,
        position: '',
        mfa_active: false,
        last_activity_at: 0,
        is_bot: false,
        bot_description: '',
        terms_of_service_id: '',
        terms_of_service_create_at: 0,
        create_at: 0,
        update_at: 0,
        delete_at: 0,
        roles: 'system_user',
        auth_data: '',
        auth_service: '',
        last_password_update: 0,
        last_picture_update: 0,
        locale: 'en',
        timezone: { automaticTimezone: '', manualTimezone: '', useAutomaticTimezone: '' },
        notify_props: {
            desktop: 'default',
            desktop_sound: 'default',
            calls_desktop_sound: 'default',
            email: 'true',
            mark_unread: 'all',
            push: 'default',
            push_status: 'online',
            comments: 'any',
            first_name: 'true',
            channel: 'true',
            mention_keys: '',
            highlight_keys: '',
        },
        props: {},
    };
}